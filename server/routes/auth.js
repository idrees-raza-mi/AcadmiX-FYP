const express = require('express');
const router = express.Router();
const { setupSuperAdmin, adminRegister, adminLogin, studentRegister, studentLogin } = require('../controllers/authController');

// Admin
router.post('/admin/setup',    setupSuperAdmin);   // one-time superadmin creation
router.post('/admin/register', adminRegister);     // self-registration
router.post('/admin/login',    adminLogin);

// Student
router.post('/student/register', studentRegister);
router.post('/student/login', studentLogin);

module.exports = router;
