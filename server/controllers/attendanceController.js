const Attendance = require('../models/Attendance');
const Course = require('../models/Course');

// POST /api/attendance/mark  (admin only)
// Body: { courseId, date, records: [{studentId, status, note}] }
exports.markAttendance = async (req, res) => {
  try {
    const { courseId, date, records } = req.body;
    if (!courseId || !date || !records || !records.length) {
      return res.status(400).json({ success: false, message: 'courseId, date and records are required' });
    }

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const results = [];
    for (const rec of records) {
      const record = await Attendance.findOneAndUpdate(
        { course: courseId, student: rec.studentId, date: attendanceDate },
        { status: rec.status, note: rec.note || '', markedBy: req.user._id },
        { upsert: true, new: true }
      );
      results.push(record);
    }
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/course/:courseId  (admin only)
exports.getCourseAttendance = async (req, res) => {
  try {
    const { date, studentId } = req.query;
    const filter = { course: req.params.courseId };
    if (date) {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setHours(23, 59, 59, 999);
      filter.date = { $gte: d, $lte: dEnd };
    }
    if (studentId) filter.student = studentId;

    const records = await Attendance.find(filter)
      .populate('student', 'email profile.name profile.rollNumber')
      .populate('markedBy', 'name')
      .sort({ date: -1 });
    res.json({ success: true, count: records.length, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/student/:studentId  (admin or the student themselves)
exports.getStudentAttendance = async (req, res) => {
  try {
    // Students can only view their own attendance
    if (req.userType === 'student' && req.user._id.toString() !== req.params.studentId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    const records = await Attendance.find({ student: req.params.studentId })
      .populate('course', 'name code')
      .sort({ date: -1 });

    // Group by course with summary
    const summary = {};
    for (const r of records) {
      const cid = r.course._id.toString();
      if (!summary[cid]) {
        summary[cid] = { course: r.course, total: 0, present: 0, absent: 0, late: 0, excused: 0, records: [] };
      }
      summary[cid].total++;
      summary[cid][r.status]++;
      summary[cid].records.push({ date: r.date, status: r.status, note: r.note });
    }

    // Calculate percentage
    const summaryArr = Object.values(summary).map(s => ({
      ...s,
      percentage: s.total > 0 ? Math.round(((s.present + s.late + s.excused) / s.total) * 100) : 0
    }));

    res.json({ success: true, data: summaryArr });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/attendance/:id  (admin only — update single record)
exports.updateAttendance = async (req, res) => {
  try {
    const { status, note } = req.body;
    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { status, note, markedBy: req.user._id },
      { new: true }
    );
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, data: record });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/attendance/:id  (admin only)
exports.deleteAttendance = async (req, res) => {
  try {
    const record = await Attendance.findByIdAndDelete(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
    res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/attendance/stats/course/:courseId  (admin only — summary stats per student)
exports.getCourseAttendanceStats = async (req, res) => {
  try {
    const stats = await Attendance.aggregate([
      { $match: { course: require('mongoose').Types.ObjectId.createFromHexString(req.params.courseId) } },
      {
        $group: {
          _id: '$student',
          total: { $sum: 1 },
          present: { $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] } },
          excused: { $sum: { $cond: [{ $eq: ['$status', 'excused'] }, 1, 0] } }
        }
      },
      {
        $addFields: {
          percentage: {
            $multiply: [
              { $divide: [{ $add: ['$present', '$late', '$excused'] }, { $cond: [{ $eq: ['$total', 0] }, 1, '$total'] }] },
              100
            ]
          }
        }
      }
    ]);

    // Populate student info
    await require('mongoose').model('Student').populate(stats, { path: '_id', select: 'email profile.name profile.rollNumber' });
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
