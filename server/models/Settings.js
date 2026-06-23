const mongoose = require('mongoose');
const { Schema } = mongoose;

const SettingsSchema = new Schema({
  // Attendance settings
  attendanceThreshold:  { type: Number, default: 75 },      // min % to pass
  lateGracePeriod:      { type: Number, default: 10 },      // minutes after start = late
  excusedCountsAs:      { type: String, enum: ['present', 'absent', 'excused'], default: 'excused' },

  // Leave settings
  monthlyLeaveQuota:    { type: Number, default: 2 },       // leaves per month per student

  // Lecture settings
  defaultLectureDuration: { type: Number, default: 40 },    // minutes per lecture
  defaultClassStartTime:  { type: String, default: '09:00' }, // 24h format
  defaultClassEndTime:    { type: String, default: '17:00' },
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },

  // Biometric settings
  faceMatchThreshold:     { type: Number, default: 0.5 },   // lower = stricter
  faceCaptureSamples:     { type: Number, default: 5 },     // photos per student during registration
  sessionAutoStart:       { type: Boolean, default: true }, // auto-open sessions at scheduled time
  sessionAutoComplete:    { type: Boolean, default: true }, // auto-close sessions at end time
  attendanceWindowBefore: { type: Number, default: 5 },     // minutes before start to allow scanning
  attendanceWindowAfter:  { type: Number, default: 10 },    // minutes after end to still allow scanning

  // Academic settings
  academicYear:    { type: String, default: '' },
  currentSemester: { type: String, default: '' },

  // Grading settings
  gradingScale: {
    type: Map,
    of: Number,
    default: { 'A+': 90, 'A': 80, 'B+': 70, 'B': 60, 'C': 50, 'D': 40 },
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', SettingsSchema);
