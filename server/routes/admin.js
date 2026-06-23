const express = require('express');
const router = express.Router();
const { protect, adminOnly, superAdminOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getDashboard, linkDepartment,
  getAllStudents, createStudent, updateStudent, getStudentById, approveStudent, rejectStudent, deleteStudent,
  generateSerials, getSerials, deleteSerial,
  createAdmin, getAllAdmins, updateAdmin, deleteAdmin,
  getAdminProfile, updateAdminProfile
} = require('../controllers/adminController');

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// Dashboard
router.get('/dashboard', getDashboard);
router.post('/link-department', linkDepartment);

// Admin profile
router.get('/me', getAdminProfile);
router.put('/me', upload.single('profilePhoto'), updateAdminProfile);

// Student management
router.get('/students',              getAllStudents);
router.post('/students',             createStudent);
router.get('/students/:id',          getStudentById);
router.put('/students/:id',          updateStudent);
router.put('/students/:id/approve',  approveStudent);
router.put('/students/:id/reject',   rejectStudent);
router.delete('/students/:id',       deleteStudent);

// Serial numbers
router.post('/serials/generate', generateSerials);
router.get('/serials', getSerials);
router.delete('/serials/:id', deleteSerial);

// Admin/HOD management — superadmin only
router.post('/admins', superAdminOnly, createAdmin);
router.get('/admins', superAdminOnly, getAllAdmins);
router.put('/admins/:id', superAdminOnly, updateAdmin);
router.delete('/admins/:id', superAdminOnly, deleteAdmin);

module.exports = router;
