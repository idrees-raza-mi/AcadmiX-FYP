const mongoose = require('mongoose');
const Course = require('../models/Course');
const Student = require('../models/Student');
const Batch = require('../models/Batch');

// Resolve a Department ObjectId from the selected batch (preferred) or an
// explicit valid ObjectId. Returns null if neither is usable — this prevents
// "Cast to ObjectId failed" when the client sends a department NAME or ''.
async function resolveDepartment(batch, department) {
  if (batch && mongoose.isValidObjectId(batch)) {
    const b = await Batch.findById(batch).select('department');
    if (b?.department) return b.department;
  }
  if (department && mongoose.isValidObjectId(department)) return department;
  return null;
}
const validId = (v) => (v && mongoose.isValidObjectId(v) ? v : null);

// GET /api/courses
exports.getAllCourses = async (req, res) => {
  try {
    const { department, semester, search } = req.query;
    const filter = { isActive: true };
    if (department) filter.department = department;
    if (semester) filter.semester = semester;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }
    const courses = await Course.find(filter)
      .populate('instructor', 'name email department')
      .populate('batch', 'name section')
      .populate('students', 'email profile.name profile.rollNumber')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: courses.length, data: courses });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/courses/:id
exports.getCourseById = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name email department')
      .populate('batch', 'name section')
      .populate('students', 'email profile.name profile.rollNumber profile.profilePhoto');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/courses  (admin only)
exports.createCourse = async (req, res) => {
  try {
    const { name, code, description, credits, department, batch, semester, schedule, teacher, teacherEmail, capacity, autoEnroll } = req.body;
    if (!name || !code) return res.status(400).json({ success: false, message: 'Name and code are required' });

    const batchId = validId(batch);
    const departmentId = await resolveDepartment(batch, department);

    const course = await Course.create({
      name, code, description, credits, semester, schedule, teacher, teacherEmail,
      department: departmentId, batch: batchId,
      capacity: capacity || 0,
      instructor: req.user._id
    });

    // Optional: auto-enroll all approved students of the assigned batch
    let enrolledCount = 0;
    if (autoEnroll && batchId) {
      let students = await Student.find({ batch: batchId, status: 'approved' }).select('_id');
      if (course.capacity > 0) students = students.slice(0, course.capacity);
      if (students.length) {
        const ids = students.map(s => s._id);
        course.students = ids;
        await course.save();
        await Student.updateMany({ _id: { $in: ids } }, { $addToSet: { courses: course._id } });
        enrolledCount = ids.length;
      }
    }

    res.status(201).json({ success: true, data: course, enrolledCount });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ success: false, message: 'Course code already exists' });
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/courses/:id  (admin only)
exports.updateCourse = async (req, res) => {
  try {
    const { name, description, credits, department, batch, semester, schedule, teacher, teacherEmail, capacity, isActive } = req.body;
    const update = { name, description, credits, semester, schedule, teacher, teacherEmail, capacity, isActive };
    const batchId = validId(batch);
    if (batchId) {
      update.batch = batchId;
      update.department = await resolveDepartment(batch, department);
    } else if (department && mongoose.isValidObjectId(department)) {
      update.department = department;
    }
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true, runValidators: true }
    ).populate('instructor', 'name email');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    res.json({ success: true, data: course });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/courses/:id  (admin only)
exports.deleteCourse = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    // Remove course from all enrolled students
    await Student.updateMany({ courses: course._id }, { $pull: { courses: course._id } });
    res.json({ success: true, message: 'Course deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/courses/:id/enroll  (admin only — enroll a student)
exports.enrollStudent = async (req, res) => {
  try {
    const { studentId } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    if (student.status !== 'approved') return res.status(400).json({ success: false, message: 'Student not approved yet' });

    if (course.students.includes(studentId)) {
      return res.status(400).json({ success: false, message: 'Student already enrolled' });
    }
    if (course.capacity > 0 && course.students.length >= course.capacity) {
      return res.status(400).json({ success: false, message: `Course is full (capacity ${course.capacity})` });
    }
    course.students.push(studentId);
    await course.save();
    student.courses.push(course._id);
    await student.save();
    res.json({ success: true, message: 'Student enrolled in course' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/courses/:id/enroll/:studentId  (admin only — unenroll)
exports.unenrollStudent = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found' });
    course.students.pull(req.params.studentId);
    await course.save();
    await Student.findByIdAndUpdate(req.params.studentId, { $pull: { courses: course._id } });
    res.json({ success: true, message: 'Student removed from course' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
