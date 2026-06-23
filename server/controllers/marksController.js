const Marks = require('../models/Marks');

// POST /api/marks — adminOnly
// Body: { studentId, courseId, semester, midterm, assignments, quizzes, final }
exports.addMarks = async (req, res) => {
  try {
    const { studentId, courseId, semester, midterm, assignments, quizzes, final } = req.body;

    if (!studentId || !courseId || !semester) {
      return res.status(400).json({ success: false, message: 'studentId, courseId and semester are required' });
    }

    const marks = await Marks.findOneAndUpdate(
      { student: studentId, course: courseId, semester },
      {
        $set: {
          midterm:     midterm     !== undefined ? midterm     : 0,
          assignments: assignments !== undefined ? assignments : 0,
          quizzes:     quizzes     !== undefined ? quizzes     : 0,
          final:       final       !== undefined ? final       : 0,
          gradedBy:    req.user._id,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json({ success: true, data: marks });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'Marks record already exists; use PUT to update' });
    }
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/marks/:id — adminOnly
exports.updateMarks = async (req, res) => {
  try {
    const allowed = ['midterm', 'assignments', 'quizzes', 'final'];
    const updates = { gradedBy: req.user._id };
    allowed.forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const marks = await Marks.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!marks) return res.status(404).json({ success: false, message: 'Marks record not found' });
    res.json({ success: true, data: marks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/marks/my — studentOnly
exports.getMyMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ student: req.user._id })
      .populate('course', 'name code credits')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: marks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/marks/course/:courseId — adminOnly
exports.getCourseMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ course: req.params.courseId })
      .populate('student', 'profile.name profile.rollNumber email')
      .sort({ 'student.profile.rollNumber': 1 });

    res.json({ success: true, count: marks.length, data: marks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/marks/student/:studentId — adminOnly
exports.getStudentMarks = async (req, res) => {
  try {
    const marks = await Marks.find({ student: req.params.studentId })
      .populate('course', 'name code credits')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: marks.length, data: marks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
