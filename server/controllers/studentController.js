const Student = require('../models/Student');

// GET /api/student/profile
exports.getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id)
      .select('-password')
      .populate('courses', 'name code credits instructor schedule')
      .populate('serialNumber', 'code');
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/student/profile
exports.updateProfile = async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'dateOfBirth', 'gender', 'address', 'city',
      'department', 'semester', 'rollNumber', 'cnic', 'guardianName', 'guardianPhone'];

    const profileUpdate = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) profileUpdate[`profile.${key}`] = req.body[key];
    }

    const student = await Student.findByIdAndUpdate(
      req.user._id,
      { $set: profileUpdate },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/student/profile/photo  (multipart: profilePhoto)
exports.uploadProfilePhoto = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const student = await Student.findByIdAndUpdate(
      req.user._id,
      { 'profile.profilePhoto': req.file.path },
      { new: true }
    ).select('-password');
    res.json({ success: true, message: 'Profile photo updated', data: { profilePhoto: student.profile.profilePhoto } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/student/profile/idcard  (multipart: idCardFront, idCardBack)
exports.uploadIdCard = async (req, res) => {
  try {
    const update = {};
    if (req.files?.idCardFront?.[0]) update['profile.idCardFront'] = req.files.idCardFront[0].path;
    if (req.files?.idCardBack?.[0]) update['profile.idCardBack'] = req.files.idCardBack[0].path;
    if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'No files uploaded' });

    const student = await Student.findByIdAndUpdate(req.user._id, { $set: update }, { new: true }).select('-password');
    res.json({ success: true, message: 'ID card uploaded', data: { idCardFront: student.profile.idCardFront, idCardBack: student.profile.idCardBack } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/student/courses
exports.getMyCourses = async (req, res) => {
  try {
    const student = await Student.findById(req.user._id)
      .populate({ path: 'courses', populate: { path: 'instructor', select: 'name email' } });
    res.json({ success: true, data: student.courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
