const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceSchema = new mongoose.Schema({
  course:   { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  student:  { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  date:     { type: Date, required: true },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'excused'],
    required: true
  },
  markedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  note:     { type: String, default: '' },
  session:  { type: Schema.Types.ObjectId, ref: 'AttendanceSession', default: null },
  method:   { type: String, enum: ['manual', 'biometric'], default: 'manual' },
}, { timestamps: true });

// One record per student per course per date
attendanceSchema.index({ course: 1, student: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
