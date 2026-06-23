const AttendanceSession = require('../models/AttendanceSession');
const Attendance        = require('../models/Attendance');
const Schedule          = require('../models/Schedule');
const Course            = require('../models/Course');

// POST /api/sessions/start/:scheduleId — protect
exports.startSession = async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.scheduleId);
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    if (!schedule.isActive) return res.status(400).json({ success: false, message: 'Schedule is inactive' });

    const course = await Course.findById(schedule.course);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    // Build today's calendar date at midnight UTC
    const now      = new Date();
    const dateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

    // Build scheduled start/end Date objects from today + time string
    const toDate = (base, timeStr) => {
      const [h, m] = timeStr.split(':').map(Number);
      return new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m, 0, 0);
    };

    const scheduledStart = toDate(now, schedule.startTime);
    const scheduledEnd   = toDate(now, schedule.endTime);

    // Check if a session already exists for this schedule today
    const existing = await AttendanceSession.findOne({ schedule: schedule._id, date: dateOnly });
    if (existing) {
      if (existing.status === 'active') {
        return res.json({ success: true, message: 'Session already active', data: existing });
      }
      if (existing.status === 'completed') {
        return res.status(400).json({ success: false, message: 'Session already completed for today' });
      }
      // Re-start a cancelled/upcoming session
      existing.status      = 'active';
      existing.actualStart = now;
      existing.startedBy   = req.user ? req.user._id : null;
      await existing.save();
      return res.json({ success: true, data: existing });
    }

    const session = await AttendanceSession.create({
      schedule:       schedule._id,
      course:         schedule.course,
      batch:          schedule.batch,
      date:           dateOnly,
      scheduledStart,
      scheduledEnd,
      actualStart:    now,
      status:         'active',
      method:         req.body.method || 'biometric',
      startedBy:      req.user ? req.user._id : null,
      totalStudents:  course.students.length,
    });

    res.status(201).json({ success: true, data: session });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Session already exists for this schedule today' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/sessions/:id/complete — protect
exports.completeSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Session is already completed' });
    }
    if (session.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot complete a cancelled session' });
    }

    const course = await Course.findById(session.course);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const enrolledStudents = course.students.map(s => s.toString());

    // Find students already marked present/late for this session
    const markedRecords = await Attendance.find({
      session: session._id,
      status:  { $in: ['present', 'late'] },
    }).select('student');

    const markedSet = new Set(markedRecords.map(r => r.student.toString()));

    // Mark absent for everyone not already marked
    const absentStudents = enrolledStudents.filter(sid => !markedSet.has(sid));

    if (absentStudents.length) {
      const absentOps = absentStudents.map(sid => ({
        updateOne: {
          filter: { course: session.course, student: sid, date: session.date },
          update: {
            $setOnInsert: {
              course:   session.course,
              student:  sid,
              date:     session.date,
              status:   'absent',
              method:   session.method,
              session:  session._id,
              markedBy: null,
              note:     '',
            },
          },
          upsert: true,
        },
      }));
      await Attendance.bulkWrite(absentOps);
    }

    const presentCount = markedSet.size;
    const absentCount  = absentStudents.length;

    session.status       = 'completed';
    session.actualEnd    = new Date();
    session.presentCount = presentCount;
    session.absentCount  = absentCount;
    await session.save();

    res.json({
      success: true,
      data: {
        session,
        summary: {
          totalStudents: enrolledStudents.length,
          presentCount,
          absentCount,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/sessions/:id/mark — protect
// REST equivalent of the Socket.io "biometric_match" event, so attendance can be
// recorded on serverless hosts where Socket.io isn't available.
// Body: { studentId, method = 'biometric' }
exports.markSessionAttendance = async (req, res) => {
  try {
    const { studentId, method = 'biometric' } = req.body;
    if (!studentId) return res.status(400).json({ success: false, message: 'studentId is required' });

    const session = await AttendanceSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status !== 'active') return res.status(400).json({ success: false, message: 'Session is not active' });

    // One record per (course, student, date)
    const existing = await Attendance.findOne({
      course: session.course, student: studentId, date: session.date,
    });

    if (existing) {
      if (existing.status === 'present' || existing.status === 'late') {
        return res.json({ success: true, duplicate: true, message: 'Already marked', data: existing });
      }
      // Upgrade an absent/excused record to present
      existing.status  = 'present';
      existing.session = session._id;
      existing.method  = method;
      await existing.save();
      session.presentCount = (session.presentCount || 0) + 1;
      await session.save();
      return res.json({ success: true, data: existing, presentCount: session.presentCount });
    }

    const record = await Attendance.create({
      course:   session.course,
      student:  studentId,
      date:     session.date,
      status:   'present',
      session:  session._id,
      method,
      markedBy: req.user ? req.user._id : null,
    });

    session.presentCount = (session.presentCount || 0) + 1;
    await session.save();

    res.status(201).json({ success: true, data: record, presentCount: session.presentCount });
  } catch (err) {
    if (err.code === 11000) {
      return res.json({ success: true, duplicate: true, message: 'Already has attendance for today' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/sessions/:id/cancel — adminOnly
exports.cancelSession = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Cannot cancel a completed session' });
    }

    session.status  = 'cancelled';
    session.actualEnd = new Date();
    await session.save();

    res.json({ success: true, data: session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sessions/today/:batchId — protect
exports.getTodaySessions = async (req, res) => {
  try {
    const now      = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const dayEnd   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const sessions = await AttendanceSession.find({
      batch: req.params.batchId,
      date:  { $gte: dayStart, $lte: dayEnd },
    })
      .populate('course', 'name code')
      .populate('schedule', 'startTime endTime room day')
      .sort({ scheduledStart: 1 });

    res.json({ success: true, count: sessions.length, data: sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sessions/:id — protect
exports.getSessionDetail = async (req, res) => {
  try {
    const session = await AttendanceSession.findById(req.params.id)
      .populate('course',   'name code')
      .populate('batch',    'name')
      .populate('schedule', 'startTime endTime room day')
      .populate('startedBy', 'name email');

    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });

    const attendance = await Attendance.find({ session: session._id })
      .populate('student', 'profile.name profile.rollNumber email')
      .sort({ createdAt: 1 });

    res.json({ success: true, data: { session, attendance } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/sessions/course/:courseId — protect
exports.getCourseSessionHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [sessions, total] = await Promise.all([
      AttendanceSession.find({ course: req.params.courseId, status: { $in: ['completed', 'cancelled'] } })
        .populate('schedule', 'startTime endTime room day')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      AttendanceSession.countDocuments({ course: req.params.courseId, status: { $in: ['completed', 'cancelled'] } }),
    ]);

    res.json({
      success: true,
      total,
      page:  Number(page),
      pages: Math.ceil(total / Number(limit)),
      data:  sessions,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
