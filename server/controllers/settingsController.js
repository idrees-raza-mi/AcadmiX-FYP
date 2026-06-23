const Settings = require('../models/Settings');

// GET /api/settings — any authenticated user
exports.getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Singleton: create with all defaults on first access
      settings = await Settings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/settings — admin only (merge patch)
exports.updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    // Merge the incoming fields onto the document
    const allowed = [
      'attendanceThreshold', 'lateGracePeriod', 'excusedCountsAs',
      'monthlyLeaveQuota',
      'defaultLectureDuration', 'defaultClassStartTime', 'defaultClassEndTime', 'workingDays',
      'faceMatchThreshold', 'faceCaptureSamples', 'sessionAutoStart', 'sessionAutoComplete',
      'attendanceWindowBefore', 'attendanceWindowAfter',
      'academicYear', 'currentSemester',
      'gradingScale',
    ];

    allowed.forEach((key) => {
      if (req.body[key] !== undefined) {
        settings[key] = req.body[key];
      }
    });

    await settings.save();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
