const Schedule          = require('../models/Schedule');
const AttendanceSession = require('../models/AttendanceSession');
const Settings          = require('../models/Settings');

// Helper: convert 'HH:MM' to total minutes
function toMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// Check whether two time ranges [s1,e1) and [s2,e2) overlap (strings '09:00')
function timesOverlap(s1, e1, s2, e2) {
  return toMinutes(s1) < toMinutes(e2) && toMinutes(s2) < toMinutes(e1);
}

// Map JS getDay() → day name
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// POST /api/schedule — adminOnly
exports.createSlot = async (req, res) => {
  try {
    const { courseId, batchId, day, startTime, endTime, room } = req.body;
    if (!courseId || !batchId || !day || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'courseId, batchId, day, startTime and endTime are required',
      });
    }

    if (toMinutes(startTime) >= toMinutes(endTime)) {
      return res.status(400).json({ success: false, message: 'startTime must be before endTime' });
    }

    // Check for time overlaps with existing slots in the same batch on the same day
    const existing = await Schedule.find({ batch: batchId, day, isActive: true });
    const conflict = existing.find(s => timesOverlap(startTime, endTime, s.startTime, s.endTime));
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Time conflict with existing slot ${conflict.startTime}–${conflict.endTime}`,
      });
    }

    const slot = await Schedule.create({
      course: courseId,
      batch:  batchId,
      day,
      startTime,
      endTime,
      room: room || '',
    });

    await slot.populate('course', 'name code');
    res.status(201).json({ success: true, data: slot });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A slot already exists for this batch/day/startTime' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/schedule/batch/:batchId — protect
exports.getBatchSchedule = async (req, res) => {
  try {
    const slots = await Schedule.find({ batch: req.params.batchId, isActive: true })
      .populate('course', 'name code')
      .sort({ day: 1, startTime: 1 });

    // Group by day
    const grouped = {};
    for (const slot of slots) {
      if (!grouped[slot.day]) grouped[slot.day] = [];
      grouped[slot.day].push(slot);
    }

    res.json({ success: true, count: slots.length, data: grouped });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/schedule/today/:batchId — protect
exports.getTodaySchedule = async (req, res) => {
  try {
    const today    = new Date();
    const dayName  = DAY_NAMES[today.getDay()];

    // Midnight start of today (local)
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const dayEnd   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const slots = await Schedule.find({ batch: req.params.batchId, day: dayName, isActive: true })
      .populate('course', 'name code')
      .sort({ startTime: 1 });

    // For each slot, check whether an AttendanceSession exists for today
    const sessionMap = new Map();
    if (slots.length) {
      const scheduleIds = slots.map(s => s._id);
      const sessions = await AttendanceSession.find({
        schedule: { $in: scheduleIds },
        date:     { $gte: dayStart, $lte: dayEnd },
      });
      for (const sess of sessions) {
        sessionMap.set(sess.schedule.toString(), sess);
      }
    }

    const slotsWithSession = slots.map(slot => {
      const session = sessionMap.get(slot._id.toString()) || null;
      return {
        ...slot.toObject(),
        durationMinutes: slot.durationMinutes(),
        session: session
          ? { _id: session._id, status: session.status, presentCount: session.presentCount, absentCount: session.absentCount }
          : null,
      };
    });

    // Settings-driven defaults
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});

    res.json({
      success: true,
      day: dayName,
      date: today.toISOString().split('T')[0],
      defaults: {
        defaultLectureDuration: settings.defaultLectureDuration,
        defaultClassStartTime:  settings.defaultClassStartTime,
        defaultClassEndTime:    settings.defaultClassEndTime,
        workingDays:            settings.workingDays,
      },
      data: slotsWithSession,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/schedule/:id — adminOnly
exports.updateSlot = async (req, res) => {
  try {
    const { startTime, endTime, room, isActive, day } = req.body;

    const slot = await Schedule.findById(req.params.id);
    if (!slot) return res.status(404).json({ success: false, message: 'Schedule slot not found' });

    const newStart = startTime || slot.startTime;
    const newEnd   = endTime   || slot.endTime;
    const newDay   = day       || slot.day;

    if (toMinutes(newStart) >= toMinutes(newEnd)) {
      return res.status(400).json({ success: false, message: 'startTime must be before endTime' });
    }

    // Overlap check (exclude current slot)
    const existing = await Schedule.find({
      batch:    slot.batch,
      day:      newDay,
      isActive: true,
      _id:      { $ne: slot._id },
    });
    const conflict = existing.find(s => timesOverlap(newStart, newEnd, s.startTime, s.endTime));
    if (conflict) {
      return res.status(409).json({
        success: false,
        message: `Time conflict with existing slot ${conflict.startTime}–${conflict.endTime}`,
      });
    }

    if (startTime !== undefined) slot.startTime = startTime;
    if (endTime   !== undefined) slot.endTime   = endTime;
    if (room      !== undefined) slot.room      = room;
    if (isActive  !== undefined) slot.isActive  = isActive;
    if (day       !== undefined) slot.day       = day;

    await slot.save();
    res.json({ success: true, data: slot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/schedule/:id — adminOnly (soft delete)
exports.deleteSlot = async (req, res) => {
  try {
    const slot = await Schedule.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!slot) return res.status(404).json({ success: false, message: 'Schedule slot not found' });
    res.json({ success: true, message: 'Schedule slot deactivated', data: slot });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
