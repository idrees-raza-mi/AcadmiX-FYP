const express = require('express');
const router = express.Router();
const { protect, studentOnly } = require('../middleware/auth');
const upload = require('../middleware/upload');
const { getProfile, updateProfile, uploadProfilePhoto, uploadIdCard, getMyCourses } = require('../controllers/studentController');

router.use(protect, studentOnly);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/profile/photo', upload.single('profilePhoto'), uploadProfilePhoto);
router.post('/profile/idcard', upload.fields([{ name: 'idCardFront', maxCount: 1 }, { name: 'idCardBack', maxCount: 1 }]), uploadIdCard);
router.get('/courses', getMyCourses);

module.exports = router;
