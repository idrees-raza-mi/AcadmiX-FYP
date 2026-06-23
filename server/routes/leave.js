const express = require('express');
const router  = express.Router();
const { protect, adminOnly, studentOnly } = require('../middleware/auth');
const {
  submitLeave,
  getMyLeaves,
  getAllLeaves,
  approveLeave,
  rejectLeave,
} = require('../controllers/leaveController');

router.post('/request',       protect, studentOnly, submitLeave);
router.get('/my',             protect, studentOnly, getMyLeaves);
router.get('/all',            protect, adminOnly,   getAllLeaves);
router.put('/:id/approve',    protect, adminOnly,   approveLeave);
router.put('/:id/reject',     protect, adminOnly,   rejectLeave);

module.exports = router;
