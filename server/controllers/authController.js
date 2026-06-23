const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const SerialNumber = require('../models/SerialNumber');
const Batch = require('../models/Batch');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

// POST /api/auth/admin/setup  — create first superadmin (one-time, requires setup key)
exports.setupSuperAdmin = async (req, res) => {
  try {
    const existing = await Admin.findOne({ role: 'superadmin' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Superadmin already exists' });
    }
    const { name, email, password, setupKey } = req.body;
    if (setupKey !== process.env.SUPERADMIN_SETUP_KEY) {
      return res.status(403).json({ success: false, message: 'Invalid setup key' });
    }
    const admin = await Admin.create({ name, email, password, role: 'superadmin' });
    const token = generateToken(admin._id, admin.role);
    res.status(201).json({
      success: true,
      message: 'Superadmin created',
      token,
      user: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/admin/register  — self-registration for new admins
exports.adminRegister = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters' });
    }
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const admin = await Admin.create({ name, email, password, role: 'admin' });
    const token = generateToken(admin._id, admin.role);
    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        departmentId: null,
        department: null
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/admin/login
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const admin = await Admin.findOne({ email });
    if (!admin || !(await admin.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!admin.isActive) {
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }
    const token = generateToken(admin._id, admin.role);
    res.json({
      success: true,
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        department: admin.department,
        departmentId: admin.departmentId || null,
        profilePhoto: admin.profilePhoto
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STUDENT ──────────────────────────────────────────────────────────────────

// POST /api/auth/student/register
// Supports both batch secret code (new) and serial number (legacy)
exports.studentRegister = async (req, res) => {
  try {
    const { email, password, secretCode, serialCode } = req.body;
    const code = secretCode || serialCode;

    if (!email || !password || !code) {
      return res.status(400).json({ success: false, message: 'Email, password and secret/serial code are required' });
    }

    // Check email not taken
    const exists = await Student.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    // Try batch secret code first (new system)
    const batch = await Batch.findOne({ secretCode: code.toUpperCase(), isActive: true });
    if (batch) {
      // Check if batch has reached max capacity
      const enrolled = await Student.countDocuments({ batch: batch._id });
      if (enrolled >= batch.maxStudents) {
        return res.status(400).json({ success: false, message: 'This batch has reached maximum capacity' });
      }
      await Student.create({ email, password, batch: batch._id, department: batch.department });
      return res.status(201).json({
        success: true,
        message: 'Registration successful. Please wait for admin approval before logging in.',
        batchName: batch.name,
      });
    }

    // Fallback: legacy serial number
    const serial = await SerialNumber.findOne({ code: code.toUpperCase() });
    if (!serial) return res.status(400).json({ success: false, message: 'Invalid secret or serial code' });
    if (serial.isUsed) return res.status(400).json({ success: false, message: 'This code has already been used' });

    const student = await Student.create({ email, password, serialNumber: serial._id });
    serial.isUsed = true; serial.usedBy = student._id; serial.usedAt = new Date();
    await serial.save();

    res.status(201).json({ success: true, message: 'Registration successful. Please wait for admin approval before logging in.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/student/login
exports.studentLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const student = await Student.findOne({ email });
    if (!student || !(await student.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (student.status === 'pending') {
      return res.status(403).json({ success: false, message: 'Your account is pending admin approval' });
    }
    if (student.status === 'rejected') {
      return res.status(403).json({
        success: false,
        message: `Your account was rejected. Reason: ${student.rejectionReason || 'Contact admin'}`
      });
    }
    const token = generateToken(student._id, 'student');
    res.json({
      success: true,
      token,
      user: {
        id: student._id,
        email: student.email,
        status: student.status,
        batch: student.batch,
        profile: student.profile
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
