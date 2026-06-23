const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  markAttendance, getCourseAttendance, getStudentAttendance,
  updateAttendance, deleteAttendance, getCourseAttendanceStats
} = require('../controllers/attendanceController');

// Admin only
router.post('/mark', protect, adminOnly, markAttendance);
router.get('/course/:courseId', protect, adminOnly, getCourseAttendance);
router.get('/stats/course/:courseId', protect, adminOnly, getCourseAttendanceStats);
router.put('/:id', protect, adminOnly, updateAttendance);
router.delete('/:id', protect, adminOnly, deleteAttendance);

// Admin or student (student can only see own)
router.get('/student/:studentId', protect, getStudentAttendance);

module.exports = router;
