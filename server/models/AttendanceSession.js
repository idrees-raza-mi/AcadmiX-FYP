const mongoose = require('mongoose');
const { Schema } = mongoose;

const attendanceSessionSchema = new Schema({
  schedule:       { type: Schema.Types.ObjectId, ref: 'Schedule', required: true },
  course:         { type: Schema.Types.ObjectId, ref: 'Course',   required: true },
  batch:          { type: Schema.Types.ObjectId, ref: 'Batch',    required: true },
  date:           { type: Date, required: true },          // calendar date (midnight UTC)
  scheduledStart: { type: Date, required: true },
  scheduledEnd:   { type: Date, required: true },
  actualStart:    { type: Date },
  actualEnd:      { type: Date },
  status: {
    type: String,
    enum: ['upcoming', 'active', 'completed', 'cancelled'],
    default: 'upcoming',
  },
  method:         { type: String, enum: ['biometric', 'manual'], default: 'biometric' },
  startedBy:      { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  totalStudents:  { type: Number, default: 0 },
  presentCount:   { type: Number, default: 0 },
  absentCount:    { type: Number, default: 0 },
}, { timestamps: true });

// Only one session per schedule per calendar date
attendanceSessionSchema.index({ schedule: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AttendanceSession', attendanceSessionSchema);
