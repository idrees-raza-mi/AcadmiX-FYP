require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const connectDB = require('./config/db');

const app = express();

// Allowed CORS origins. Set CLIENT_ORIGINS to a comma-separated list of
// deployed front-end URLs to lock this down, e.g.
// "https://academicx-admin.vercel.app,https://academicx-bio.vercel.app".
// Defaults to "*" (open) when unset.
const ORIGINS = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : '*';

app.use(cors({ origin: ORIGINS }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check — must work even if the DB is down.
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AcademicX server is running', timestamp: new Date() });
});

// Ensure MongoDB is connected before handling data routes (serverless-safe).
app.use(async (req, res, next) => {
  try { await connectDB(); next(); }
  catch (err) {
    console.error('DB connect error:', err.message);
    res.status(503).json({ success: false, message: 'Database unavailable' });
  }
});

// Serve uploaded files as static.
// NOTE: on serverless (Vercel) the filesystem is read-only, so multipart
// uploads and this static dir do not persist — use a cloud store for prod.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/admin',       require('./routes/admin'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/courses',     require('./routes/courses'));
app.use('/api/attendance',  require('./routes/attendance'));
app.use('/api/student',     require('./routes/student'));
app.use('/api/settings',    require('./routes/settings'));
app.use('/api/leave',       require('./routes/leave'));
app.use('/api/marks',       require('./routes/marks'));
app.use('/api/biometric',   require('./routes/biometric'));
app.use('/api/schedule',    require('./routes/schedule'));
app.use('/api/sessions',    require('./routes/sessions'));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Global error handler
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(err.stack);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

module.exports = { app, ORIGINS };
