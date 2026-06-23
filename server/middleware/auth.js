const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Student = require('../models/Student');

// Verify JWT and attach user to request
const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }
  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role === 'student') {
      const student = await Student.findById(decoded.id).select('-password');
      if (!student) return res.status(401).json({ success: false, message: 'Student not found' });
      if (student.status !== 'approved') {
        return res.status(403).json({ success: false, message: 'Account not approved yet' });
      }
      req.user = student;
      req.userType = 'student';
    } else {
      const admin = await Admin.findById(decoded.id).select('-password');
      if (!admin) return res.status(401).json({ success: false, message: 'Admin not found' });
      if (!admin.isActive) return res.status(403).json({ success: false, message: 'Admin account deactivated' });
      req.user = admin;
      req.userType = 'admin';
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (req.userType !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

// Superadmin only middleware
const superAdminOnly = (req, res, next) => {
  if (req.userType !== 'admin' || req.user.role !== 'superadmin') {
    return res.status(403).json({ success: false, message: 'Superadmin access required' });
  }
  next();
};

// Student only middleware
const studentOnly = (req, res, next) => {
  if (req.userType !== 'student') {
    return res.status(403).json({ success: false, message: 'Student access required' });
  }
  next();
};

module.exports = { protect, adminOnly, superAdminOnly, studentOnly };
