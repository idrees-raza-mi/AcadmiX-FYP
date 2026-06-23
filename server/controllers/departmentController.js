const Department = require('../models/Department');
const Batch      = require('../models/Batch');
const Student    = require('../models/Student');
const Course     = require('../models/Course');

// Generate unique batch secret code: DEPT-SECTION-RANDOM
const genCode = (deptCode, batchName) => {
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  const base   = `${deptCode}-${batchName.replace(/\s+/g, '').substring(0, 4)}-${random}`.toUpperCase();
  return base;
};

// ─── DEPARTMENTS ──────────────────────────────────────────────────────────────

// GET /api/departments
exports.getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    // Attach batch/student counts
    const result = await Promise.all(departments.map(async d => {
      const [batches, students] = await Promise.all([
        Batch.countDocuments({ department: d._id, isActive: true }),
        Student.countDocuments({ department: d._id }),
      ]);
      return { ...d.toObject(), batchCount: batches, studentCount: students };
    }));

    res.json({ success: true, count: result.length, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/departments/:id
exports.getDepartment = async (req, res) => {
  try {
    const dept = await Department.findById(req.params.id).populate('createdBy', 'name email');
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    const batches = await Batch.find({ department: dept._id })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 });

    const batchesWithCounts = await Promise.all(batches.map(async b => {
      const [students, courses] = await Promise.all([
        Student.countDocuments({ batch: b._id }),
        Course.countDocuments({ batch: b._id }),
      ]);
      return { ...b.toObject(), studentCount: students, courseCount: courses };
    }));

    res.json({ success: true, data: { ...dept.toObject(), batches: batchesWithCounts } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/departments
exports.createDepartment = async (req, res) => {
  try {
    const { name, code, description, hod, established, totalSeats, vision } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required' });

    const dept = await Department.create({ name, code, description, hod, established, totalSeats, vision, createdBy: req.user._id });
    res.status(201).json({ success: true, data: dept });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Department name or code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/departments/:id
exports.updateDepartment = async (req, res) => {
  try {
    const { name, code, description, hod, established, totalSeats, vision, isActive } = req.body;
    const dept = await Department.findByIdAndUpdate(
      req.params.id,
      { name, code, description, hod, established, totalSeats, vision, isActive },
      { new: true, runValidators: true }
    );
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });
    res.json({ success: true, data: dept });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/departments/:id
exports.deleteDepartment = async (req, res) => {
  try {
    const hasBatches = await Batch.countDocuments({ department: req.params.id });
    if (hasBatches) return res.status(400).json({ success: false, message: 'Remove all batches before deleting department' });
    await Department.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Department deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// ─── BATCHES ─────────────────────────────────────────────────────────────────

// GET /api/departments/:id/batches
exports.getBatches = async (req, res) => {
  try {
    const batches = await Batch.find({ department: req.params.id })
      .populate('department', 'name code')
      .sort({ createdAt: -1 });

    const result = await Promise.all(batches.map(async b => {
      const [students, courses] = await Promise.all([
        Student.countDocuments({ batch: b._id }),
        Course.countDocuments({ batch: b._id }),
      ]);
      return { ...b.toObject(), studentCount: students, courseCount: courses };
    }));

    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/departments/:id/batches/:batchId
exports.getBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId).populate('department', 'name code hod');
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    const [students, courses] = await Promise.all([
      Student.find({ batch: batch._id }).select('-password').sort({ createdAt: -1 }),
      Course.find({ batch: batch._id }).populate('instructor', 'name').sort({ createdAt: -1 }),
    ]);

    res.json({ success: true, data: { ...batch.toObject(), students, courses } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/departments/:id/batches
exports.createBatch = async (req, res) => {
  try {
    const { name, year, section, currentSemester, classTeacher, classTeacherEmail, maxStudents } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Batch name is required' });

    const dept = await Department.findById(req.params.id);
    if (!dept) return res.status(404).json({ success: false, message: 'Department not found' });

    // Generate unique secret code
    let secretCode, exists;
    do {
      secretCode = genCode(dept.code, name);
      exists = await Batch.findOne({ secretCode });
    } while (exists);

    const batch = await Batch.create({
      department: dept._id, name, year, section, currentSemester,
      classTeacher, classTeacherEmail, maxStudents, secretCode,
      createdBy: req.user._id,
    });

    res.status(201).json({ success: true, data: batch });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// PUT /api/departments/:id/batches/:batchId
exports.updateBatch = async (req, res) => {
  try {
    const { name, year, section, currentSemester, classTeacher, classTeacherEmail, maxStudents, isActive } = req.body;
    const batch = await Batch.findByIdAndUpdate(
      req.params.batchId,
      { name, year, section, currentSemester, classTeacher, classTeacherEmail, maxStudents, isActive },
      { new: true }
    ).populate('department', 'name code');
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    res.json({ success: true, data: batch });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// POST /api/departments/:id/batches/:batchId/regenerate-code  — generate new secret code
exports.regenerateCode = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId).populate('department', 'code');
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });

    let secretCode, exists;
    do {
      secretCode = genCode(batch.department.code, batch.name);
      exists = await Batch.findOne({ secretCode, _id: { $ne: batch._id } });
    } while (exists);

    batch.secretCode = secretCode;
    await batch.save();
    res.json({ success: true, data: { secretCode } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// DELETE /api/departments/:id/batches/:batchId
exports.deleteBatch = async (req, res) => {
  try {
    const students = await Student.countDocuments({ batch: req.params.batchId });
    if (students) return res.status(400).json({ success: false, message: `Cannot delete — ${students} student(s) in this batch` });
    await Batch.findByIdAndDelete(req.params.batchId);
    res.json({ success: true, message: 'Batch deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/batches/:batchId  — shortcut (no dept ID needed)
exports.getBatchById = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.batchId).populate('department', 'name code hod');
    if (!batch) return res.status(404).json({ success: false, message: 'Batch not found' });
    const [students, courses] = await Promise.all([
      Student.find({ batch: batch._id }).select('-password'),
      Course.find({ batch: batch._id }).populate('instructor', 'name'),
    ]);
    res.json({ success: true, data: { ...batch.toObject(), students, courses } });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// GET /api/batches  — all batches (for dropdowns)
exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find({ isActive: true }).populate('department', 'name code').sort({ createdAt: -1 });
    res.json({ success: true, data: batches });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
