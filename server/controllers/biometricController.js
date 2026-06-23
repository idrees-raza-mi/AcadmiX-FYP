const crypto        = require('crypto');
const BiometricData = require('../models/BiometricData');
const Settings      = require('../models/Settings');
const Course        = require('../models/Course');
const Student       = require('../models/Student');

// In-memory nonce store: { nonce: expiresAt }
const nonceStore = new Map();

// Purge expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [nonce, exp] of nonceStore) {
    if (exp < now) nonceStore.delete(nonce);
  }
}, 30_000);

// POST /api/biometric/face/register — adminOnly
// Body: { studentId, descriptor: [128 floats] }
exports.registerFace = async (req, res) => {
  try {
    const { studentId, descriptor } = req.body;
    if (!studentId || !Array.isArray(descriptor) || descriptor.length !== 128) {
      return res.status(400).json({
        success: false,
        message: 'studentId and a 128-element float descriptor array are required',
      });
    }

    // Load settings to enforce max samples
    let settings = await Settings.findOne();
    if (!settings) settings = await Settings.create({});
    const maxSamples = settings.faceCaptureSamples || 5;

    let bio = await BiometricData.findOne({ student: studentId });
    if (!bio) {
      bio = new BiometricData({ student: studentId });
    }

    if (bio.faceDescriptors.length >= maxSamples) {
      return res.status(400).json({
        success: false,
        message: `Maximum face samples (${maxSamples}) already registered. Remove existing data first.`,
      });
    }

    bio.faceDescriptors.push(descriptor);
    bio.registeredBy  = req.user._id;
    bio.registeredAt  = new Date();
    await bio.save();

    res.json({
      success: true,
      data: {
        studentId,
        samplesCount: bio.faceDescriptors.length,
        maxSamples,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/biometric/fingerprint/register — adminOnly
// Body: { studentId, fingerprintId }
exports.registerFingerprint = async (req, res) => {
  try {
    const { studentId, fingerprintId } = req.body;
    if (!studentId || !fingerprintId) {
      return res.status(400).json({ success: false, message: 'studentId and fingerprintId are required' });
    }

    const bio = await BiometricData.findOneAndUpdate(
      { student: studentId },
      {
        $set: {
          fingerprintId,
          registeredBy: req.user._id,
          registeredAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: bio });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/biometric/descriptors/:courseId — protect (any authenticated user)
exports.getDescriptors = async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId).select('students name');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

    const studentIds = course.students;

    const [bioRecords, students] = await Promise.all([
      BiometricData.find({ student: { $in: studentIds } }),
      Student.find({ _id: { $in: studentIds } }, 'profile.name profile.rollNumber'),
    ]);

    // Build a quick lookup by student id
    const bioMap = new Map(bioRecords.map(b => [b.student.toString(), b]));
    const studentMap = new Map(students.map(s => [s._id.toString(), s]));

    const data = studentIds.map(id => {
      const sid = id.toString();
      const bio = bioMap.get(sid);
      const stu = studentMap.get(sid);
      return {
        studentId:       sid,
        studentName:     stu ? stu.profile.name     : '',
        rollNumber:      stu ? stu.profile.rollNumber : '',
        faceDescriptors: bio ? bio.faceDescriptors   : [],
        hasFace:         bio ? bio.faceDescriptors.length > 0 : false,
        hasFingerprint:  bio ? !!bio.fingerprintId   : false,
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/biometric/status/:batchId — adminOnly
exports.getBiometricStatus = async (req, res) => {
  try {
    const students = await Student.find({ batch: req.params.batchId }, 'profile.name profile.rollNumber');
    if (!students.length) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const studentIds = students.map(s => s._id);
    const bioRecords = await BiometricData.find({ student: { $in: studentIds } });
    const bioMap = new Map(bioRecords.map(b => [b.student.toString(), b]));

    const data = students.map(s => {
      const bio = bioMap.get(s._id.toString());
      return {
        studentId:      s._id,
        studentName:    s.profile.name,
        rollNumber:     s.profile.rollNumber,
        hasFace:        bio ? bio.faceDescriptors.length > 0 : false,
        faceSamples:    bio ? bio.faceDescriptors.length      : 0,
        hasFingerprint: bio ? !!bio.fingerprintId             : false,
        registeredAt:   bio ? bio.registeredAt                : null,
      };
    });

    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/biometric/:studentId — adminOnly
exports.removeBiometric = async (req, res) => {
  try {
    const result = await BiometricData.findOneAndDelete({ student: req.params.studentId });
    if (!result) return res.status(404).json({ success: false, message: 'Biometric data not found for this student' });
    res.json({ success: true, message: 'Biometric data removed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/biometric/challenge — protect
// Returns a random base64 nonce for WebAuthn with a 60 s TTL
exports.getChallenge = async (req, res) => {
  try {
    const nonce = crypto.randomBytes(32).toString('base64url');
    nonceStore.set(nonce, Date.now() + 60_000); // 60-second TTL
    res.json({ success: true, data: { challenge: nonce } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Export the nonce store so other modules (e.g. WebAuthn verification) can validate challenges
exports.nonceStore = nonceStore;
