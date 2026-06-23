const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  createSlot,
  getBatchSchedule,
  getTodaySchedule,
  updateSlot,
  deleteSlot,
} = require('../controllers/scheduleController');

// Specific paths before parameterised ones
router.get('/batch/:batchId',  protect,            getBatchSchedule);
router.get('/today/:batchId',  protect,            getTodaySchedule);
router.post('/',               protect, adminOnly, createSlot);
router.put('/:id',             protect, adminOnly, updateSlot);
router.delete('/:id',          protect, adminOnly, deleteSlot);

module.exports = router;
