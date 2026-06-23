const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getAllCourses, getCourseById, createCourse, updateCourse, deleteCourse,
  enrollStudent, unenrollStudent
} = require('../controllers/courseController');

// Any authenticated user can view courses
router.get('/', protect, getAllCourses);
router.get('/:id', protect, getCourseById);

// Admin only
router.post('/', protect, adminOnly, createCourse);
router.put('/:id', protect, adminOnly, updateCourse);
router.delete('/:id', protect, adminOnly, deleteCourse);
router.post('/:id/enroll', protect, adminOnly, enrollStudent);
router.delete('/:id/enroll/:studentId', protect, adminOnly, unenrollStudent);

module.exports = router;
