const express = require('express');
const router  = express.Router();
const { protect, adminOnly, studentOnly } = require('../middleware/auth');
const {
  addMarks,
  updateMarks,
  getMyMarks,
  getCourseMarks,
  getStudentMarks,
} = require('../controllers/marksController');

// Order matters: specific paths before parameterised ones
router.get('/my',                    protect, studentOnly, getMyMarks);
router.get('/course/:courseId',      protect, adminOnly,   getCourseMarks);
router.get('/student/:studentId',    protect, adminOnly,   getStudentMarks);
router.post('/',                     protect, adminOnly,   addMarks);
router.put('/:id',                   protect, adminOnly,   updateMarks);

module.exports = router;
