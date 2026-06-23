const LeaveRequest = require('../models/LeaveRequest');
const Attendance   = require('../models/Attendance');
const Settings     = require('../models/Settings');
const Course       = require('../models/Course');

// Helper: get start/end of the current calendar month
function currentMonthRange() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Helper: iterate every calendar date from dateFrom to dateTo (inclusive)
function* eachDay(from, to) {
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    yield new Date(cur);
    cur.setDate(cur.getDate() + 1);
  }
}

// POST /api/leave/request — studentOnly
exports.submitLeave = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { courseId, dateFrom, dateTo, reason } = req.body;

    if (!dateFrom || !dateTo || !reason) {
      return res.status(400).json({ success: false, message: 'dateFrom, dateTo and reason are required' });
    }

    const from = new Date(dateFrom);
    const to   = new Date(dateTo);
    if (isNaN(from) || isNaN(to) || from > to) {
      return res.status(400).json({ success: false, message: 'Invalid date range' });
    }

    // Load settings to get quota
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    const quota = settings.monthlyLeaveQuota;

    // Count approved leaves created this month for this student
    const { start, end } = currentMonthRange();
    const usedThisMonth = await LeaveRequest.countDocuments({
      student: studentId,
      status: 'approved',
      createdAt: { $gte: start, $lte: end },
    });

    if (usedThisMonth >= quota) {
      return res.status(400).json({
        success: false,
        message: `Monthly leave quota (${quota}) exhausted`,
      });
    }

    const leave = await LeaveRequest.create({
      student:  studentId,
      course:   courseId || null,
      dateFrom: from,
      dateTo:   to,
      reason,
    });

    res.status(201).json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/my — studentOnly
exports.getMyLeaves = async (req, res) => {
  try {
    const studentId = req.user._id;

    const leaves = await LeaveRequest.find({ student: studentId })
      .populate('course', 'name code')
      .sort({ createdAt: -1 });

    // Monthly usage count for the current month
    const { start, end } = currentMonthRange();
    const monthlyUsed = await LeaveRequest.countDocuments({
      student:   studentId,
      status:    'approved',
      createdAt: { $gte: start, $lte: end },
    });

    res.json({ success: true, monthlyUsed, data: leaves });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/leave/all — adminOnly
exports.getAllLeaves = async (req, res) => {
  try {
    const { status = 'pending', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const filter = {};
    if (status && status !== 'all') filter.status = status;

    const [leaves, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('student', 'profile.name profile.rollNumber email')
        .populate('course',  'name code')
        .sort({ status: 1, createdAt: -1 }) // pending (alphabetically first) floats to top
        .skip(skip)
        .limit(Number(limit)),
      LeaveRequest.countDocuments(filter),
    ]);

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
      data: leaves,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/leave/:id/approve — adminOnly
exports.approveLeave = async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Leave is already ${leave.status}` });
    }

    // Update the leave record
    leave.status     = 'approved';
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    await leave.save();

    // Determine which courses to mark excused for
    let courseIds = [];
    if (leave.course) {
      courseIds = [leave.course];
    } else {
      // All courses the student is enrolled in
      const courses = await Course.find({ students: leave.student }, '_id');
      courseIds = courses.map(c => c._id);
    }

    // Create excused Attendance records for each date in the range
    const attendanceDocs = [];
    for (const day of eachDay(leave.dateFrom, leave.dateTo)) {
      for (const courseId of courseIds) {
        attendanceDocs.push({
          course:   courseId,
          student:  leave.student,
          date:     day,
          status:   'excused',
          method:   'manual',
          markedBy: req.user._id,
          note:     `Leave approved by admin (Leave ID: ${leave._id})`,
        });
      }
    }

    // Upsert each record — do not overwrite an existing 'present' record
    const ops = attendanceDocs.map(doc => ({
      updateOne: {
        filter: { course: doc.course, student: doc.student, date: doc.date },
        update: { $setOnInsert: doc },
        upsert: true,
      },
    }));

    if (ops.length) await Attendance.bulkWrite(ops);

    res.json({ success: true, data: leave, attendanceCreated: attendanceDocs.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/leave/:id/reject — adminOnly
exports.rejectLeave = async (req, res) => {
  try {
    const { adminReason } = req.body;
    if (!adminReason || !adminReason.trim()) {
      return res.status(400).json({ success: false, message: 'adminReason is required when rejecting a leave' });
    }

    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ success: false, message: 'Leave request not found' });
    if (leave.status !== 'pending') {
      return res.status(400).json({ success: false, message: `Leave is already ${leave.status}` });
    }

    leave.status      = 'rejected';
    leave.adminReason = adminReason.trim();
    leave.reviewedBy  = req.user._id;
    leave.reviewedAt  = new Date();
    await leave.save();

    res.json({ success: true, data: leave });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
