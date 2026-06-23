const express = require('express');
const router  = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getSettings, updateSettings } = require('../controllers/settingsController');

// GET /api/settings — any authenticated user can read
router.get('/', protect, getSettings);

// PUT /api/settings — admin only
router.put('/', protect, adminOnly, updateSettings);

module.exports = router;
