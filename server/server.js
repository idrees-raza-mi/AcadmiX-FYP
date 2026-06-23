require('dotenv').config();
const http      = require('http');
const { Server } = require('socket.io');
const { app, ORIGINS } = require('./app');
const connectDB = require('./config/db');

const httpServer = http.createServer(app);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: ORIGINS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

// Connect to MongoDB (lazy/cached; logs but never exits the process)
connectDB()
  .then(conn => console.log(`✅ MongoDB Connected: ${conn.connection.host}`))
  .catch(err => console.error(`❌ MongoDB connection error: ${err.message}`));

// ── Socket.io ────────────────────────────────────────────────────────────────
const Attendance        = require('./models/Attendance');
const AttendanceSession = require('./models/AttendanceSession');

io.on('connection', (socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  // Student / device joins its batch room to receive live updates
  socket.on('join_batch', ({ batchId }) => {
    if (!batchId) return;
    socket.join(`batch_${batchId}`);
    console.log(`[Socket.io] ${socket.id} joined batch_${batchId}`);
  });

  // Admin joins a monitoring room (same batch room so they see the same events)
  socket.on('admin_monitor', ({ batchId }) => {
    if (!batchId) return;
    socket.join(`batch_${batchId}`);
    console.log(`[Socket.io] Admin ${socket.id} monitoring batch_${batchId}`);
  });

  // Biometric device reports a successful match
  // Payload: { sessionId, studentId, method: 'biometric'|'manual' }
  socket.on('biometric_match', async ({ sessionId, studentId, method = 'biometric' }) => {
    try {
      if (!sessionId || !studentId) return;

      // 1. Load the active session
      const session = await AttendanceSession.findById(sessionId);
      if (!session || session.status !== 'active') return;

      // 2. Check for duplicate attendance
      const existing = await Attendance.findOne({ session: sessionId, student: studentId });
      if (existing) {
        socket.emit('attendance_duplicate', { studentId, message: 'Already marked' });
        return;
      }

      // 3. Create the attendance record
      const record = await Attendance.create({
        course:   session.course,
        student:  studentId,
        date:     session.date,
        status:   'present',
        session:  sessionId,
        method,
        markedBy: null,
      });

      // 4. Increment session presentCount
      session.presentCount += 1;
      await session.save();

      // 5. Broadcast to the batch room
      io.to(`batch_${session.batch}`).emit('attendance_marked', {
        sessionId,
        studentId,
        method,
        time:         record.createdAt,
        presentCount: session.presentCount,
      });
    } catch (err) {
      console.error('[Socket.io] biometric_match error:', err.message);
      socket.emit('socket_error', { message: err.message });
    }
  });

  // Admin/device requests session completion via Socket
  // Payload: { sessionId }
  socket.on('complete_session', async ({ sessionId }) => {
    try {
      if (!sessionId) return;

      const session = await AttendanceSession.findById(sessionId);
      if (!session || session.status !== 'active') return;

      const Course = require('./models/Course');
      const course = await Course.findById(session.course);
      if (!course) return;

      const enrolledStudents = course.students.map(s => s.toString());

      // Who has already been marked?
      const markedRecords = await Attendance.find({
        session: session._id,
        status:  { $in: ['present', 'late'] },
      }).select('student');
      const markedSet = new Set(markedRecords.map(r => r.student.toString()));

      // Bulk-create absent records for unmarked students
      const absentStudents = enrolledStudents.filter(sid => !markedSet.has(sid));
      if (absentStudents.length) {
        const ops = absentStudents.map(sid => ({
          updateOne: {
            filter: { course: session.course, student: sid, date: session.date },
            update: {
              $setOnInsert: {
                course:   session.course,
                student:  sid,
                date:     session.date,
                status:   'absent',
                method:   session.method,
                session:  session._id,
                markedBy: null,
                note:     '',
              },
            },
            upsert: true,
          },
        }));
        await Attendance.bulkWrite(ops);
      }

      session.status       = 'completed';
      session.actualEnd    = new Date();
      session.presentCount = markedSet.size;
      session.absentCount  = absentStudents.length;
      await session.save();

      // Broadcast completion to the batch room
      io.to(`batch_${session.batch}`).emit('session_completed', {
        sessionId,
        presentCount: session.presentCount,
        absentCount:  session.absentCount,
        totalStudents: enrolledStudents.length,
      });
    } catch (err) {
      console.error('[Socket.io] complete_session error:', err.message);
      socket.emit('socket_error', { message: err.message });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Client disconnected: ${socket.id}`);
  });
});

// ── Start server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`AcademicX server running on http://0.0.0.0:${PORT}`);
  console.log(`Local:   http://localhost:${PORT}`);
});
