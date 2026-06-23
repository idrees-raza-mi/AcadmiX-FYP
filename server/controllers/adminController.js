const Admin = require('../models/Admin');
const Student = require('../models/Student');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const SerialNumber = require('../models/SerialNumber');
const { v4: uuidv4 } = require('uuid');

// GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  try {
    const Department = require('../models/Department');
    const Batch      = require('../models/Batch');

    // Scope to admin's department if they have one
    const deptId = req.user.departmentId || null;
    const studentFilter   = deptId ? { department: deptId } : {};
    const courseFilter    = deptId ? { department: deptId, isActive: true } : { isActive: true };
    const attendanceFilter = {};

    const [totalStudents, pendingStudents, approvedStudents, totalCourses, totalAttendance] = await Promise.all([
      Student.countDocuments(studentFilter),
      Student.countDocuments({ ...studentFilter, status: 'pending' }),
      Student.countDocuments({ ...studentFilter, status: 'approved' }),
      Course.countDocuments(courseFilter),
      Attendance.countDocuments(attendanceFilter)
    ]);

    const recentStudents = await Student.find({ ...studentFilter, status: 'pending' })
      .select('email profile.name createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const unusedSerials = await SerialNumber.countDocuments({ isUsed: false });

    // Department-specific data
    let department = null;
    let batches = [];
    if (deptId) {
      department = await Department.findById(deptId);
      batches    = await Batch.find({ department: deptId, isActive: true });
    }

    res.json({
      success: true,
      data: {
        stats: { totalStudents, pendingStudents, approvedStudents, totalCourses, totalAttendance, unusedSerials, totalBatches: batches.length },
        recentPendingStudents: recentStudents,
        department,
        batches
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/link-department  — admin sets up their department
exports.linkDepartment = async (req, res) => {
  try {
    const { departmentId } = req.body;
    const Department = require('../models/Department');
    const dept = await Department.findById(departmentId);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    const admin = await Admin.findByIdAndUpdate(
      req.user._id,
      { departmentId, department: dept.name },
      { new: true }
    ).select('-password');
    res.json({ success: true, data: { departmentId: admin.departmentId, department: admin.department } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STUDENT MANAGEMENT ───────────────────────────────────────────────────────

// GET /api/admin/students
exports.getAllStudents = async (req, res) => {
  try {
    const { status, department, search, batch } = req.query;
    // Default scope to admin's department
    const deptId = req.user.departmentId || null;
    const filter = {};
    if (batch) filter.batch = batch;
    else if (deptId) filter.department = deptId;
    if (status) filter.status = status;
    if (department) filter['profile.department'] = department;
    if (search) {
      filter.$or = [
        { email: { $regex: search, $options: 'i' } },
        { 'profile.name': { $regex: search, $options: 'i' } },
        { 'profile.rollNumber': { $regex: search, $options: 'i' } }
      ];
    }
    const students = await Student.find(filter)
      .select('-password')
      .populate('serialNumber', 'code')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/admin/students  — admin manually creates a student (pre-approved)
exports.createStudent = async (req, res) => {
  try {
    const { email, password, batchId, name, rollNumber, phone, gender } = req.body;
    if (!email || !password || !batchId) {
      return res.status(400).json({ success: false, message: 'Email, password and batchId are required' });
    }
    const Batch = require('../models/Batch');
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    const exists = await Student.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already registered' });

    const student = await Student.create({
      email, password, batch: batch._id, department: batch.department,
      status: 'approved', approvedBy: req.user._id, approvedAt: new Date(),
      profile: { name: name || '', rollNumber: rollNumber || '', phone: phone || '', gender: gender || '' }
    });
    res.status(201).json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/students/:id  — update student profile info
exports.updateStudent = async (req, res) => {
  try {
    const { name, rollNumber, phone, gender, status } = req.body;
    const update = {};
    if (name !== undefined) update['profile.name'] = name;
    if (rollNumber !== undefined) update['profile.rollNumber'] = rollNumber;
    if (phone !== undefined) update['profile.phone'] = phone;
    if (gender !== undefined) update['profile.gender'] = gender;
    if (status !== undefined) update.status = status;
    const student = await Student.findByIdAndUpdate(
      req.params.id, { $set: update }, { new: true }
    ).select('-password');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/students/:id
exports.getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .select('-password')
      .populate('serialNumber', 'code')
      .populate('approvedBy', 'name email')
      .populate('courses', 'name code');
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    res.json({ success: true, data: student });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/students/:id/approve
exports.approveStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    student.status = 'approved';
    student.approvedBy = req.user._id;
    student.approvedAt = new Date();
    await student.save();
    res.json({ success: true, message: 'Student approved successfully', data: { id: student._id, status: student.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/students/:id/reject
exports.rejectStudent = async (req, res) => {
  try {
    const { reason } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    student.status = 'rejected';
    student.rejectionReason = reason || 'Not specified';
    await student.save();
    res.json({ success: true, message: 'Student rejected', data: { id: student._id, status: student.status } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/students/:id
exports.deleteStudent = async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    // Free up serial number
    await SerialNumber.findByIdAndUpdate(student.serialNumber, { isUsed: false, usedBy: null, usedAt: null });
    res.json({ success: true, message: 'Student deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SERIAL NUMBERS ───────────────────────────────────────────────────────────

// POST /api/admin/serials/generate
exports.generateSerials = async (req, res) => {
  try {
    const { count = 1, note = '' } = req.body;
    const limit = Math.min(count, 50); // max 50 at a time
    const serials = [];
    for (let i = 0; i < limit; i++) {
      const code = 'AX-' + uuidv4().split('-')[0].toUpperCase();
      serials.push({ code, note, createdBy: req.user._id });
    }
    const created = await SerialNumber.insertMany(serials);
    res.status(201).json({ success: true, count: created.length, data: created });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/serials
exports.getSerials = async (req, res) => {
  try {
    const { isUsed } = req.query;
    const filter = {};
    if (isUsed !== undefined) filter.isUsed = isUsed === 'true';
    const serials = await SerialNumber.find(filter)
      .populate('usedBy', 'email profile.name')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: serials.length, data: serials });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/serials/:id
exports.deleteSerial = async (req, res) => {
  try {
    const serial = await SerialNumber.findById(req.params.id);
    if (!serial) return res.status(404).json({ success: false, message: 'Serial not found' });
    if (serial.isUsed) return res.status(400).json({ success: false, message: 'Cannot delete a used serial number' });
    await serial.deleteOne();
    res.json({ success: true, message: 'Serial number deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── ADMIN MANAGEMENT (superadmin only) ──────────────────────────────────────

// POST /api/admin/admins  — create new admin/HOD
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password, role, department, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    const exists = await Admin.findOne({ email });
    if (exists) return res.status(400).json({ success: false, message: 'Email already in use' });

    const admin = await Admin.create({ name, email, password, role: role || 'admin', department, phone, createdBy: req.user._id });
    res.status(201).json({
      success: true,
      data: { id: admin._id, name: admin.name, email: admin.email, role: admin.role, department: admin.department }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/admins
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').populate('createdBy', 'name email');
    res.json({ success: true, count: admins.length, data: admins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/admins/:id
exports.updateAdmin = async (req, res) => {
  try {
    const { name, department, phone, isActive, role } = req.body;
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      { name, department, phone, isActive, role },
      { new: true, runValidators: true }
    ).select('-password');
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    res.json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/admin/admins/:id
exports.deleteAdmin = async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ success: false, message: 'Admin not found' });
    if (admin.role === 'superadmin') return res.status(400).json({ success: false, message: 'Cannot delete superadmin' });
    await admin.deleteOne();
    res.json({ success: true, message: 'Admin deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/me
exports.getAdminProfile = async (req, res) => {
  res.json({ success: true, data: req.user });
};

// PUT /api/admin/me
exports.updateAdminProfile = async (req, res) => {
  try {
    const { name, phone, department } = req.body;
    const update = { name, phone, department };
    if (req.file) update.profilePhoto = req.file.path;
    const admin = await Admin.findByIdAndUpdate(req.user._id, update, { new: true }).select('-password');
    res.json({ success: true, data: admin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
