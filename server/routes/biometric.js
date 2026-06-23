const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  registerFace,
  registerFingerprint,
  getDescriptors,
  getBiometricStatus,
  getChallenge,
  removeBiometric,
} = require('../controllers/biometricController');

// Specific paths first to avoid conflicts with /:studentId
router.post('/face/register',         protect, adminOnly, registerFace);
router.post('/fingerprint/register',  protect, adminOnly, registerFingerprint);
router.get('/descriptors/:courseId',  protect,            getDescriptors);
router.get('/status/:batchId',        protect, adminOnly, getBiometricStatus);
router.get('/challenge',              protect,            getChallenge);
router.delete('/:studentId',          protect, adminOnly, removeBiometric);

module.exports = router;
