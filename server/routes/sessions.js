const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  startSession,
  completeSession,
  cancelSession,
  getTodaySessions,
  getCourseSessionHistory,
  getSessionDetail,
  markSessionAttendance,
} = require('../controllers/sessionController');

// Specific paths must come before /:id
router.get('/today/:batchId',         protect,            getTodaySessions);
router.get('/course/:courseId',        protect,            getCourseSessionHistory);
router.post('/start/:scheduleId',      protect,            startSession);
router.post('/:id/mark',               protect,            markSessionAttendance);
router.put('/:id/complete',            protect,            completeSession);
router.put('/:id/cancel',              protect, adminOnly, cancelSession);
router.get('/:id',                     protect,            getSessionDetail);

module.exports = router;
