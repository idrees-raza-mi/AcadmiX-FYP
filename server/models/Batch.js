const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
  department:       { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
  name:             { type: String, required: true, trim: true },   // e.g. BSCS-2021, Section-A
  year:             { type: String, trim: true, default: '' },      // e.g. 2021-2025
  section:          { type: String, trim: true, default: '' },      // e.g. A, B, Morning
  currentSemester:  { type: String, trim: true, default: '1st' },
  classTeacher:     { type: String, trim: true, default: '' },
  classTeacherEmail:{ type: String, trim: true, default: '' },
  maxStudents:      { type: Number, default: 50 },
  secretCode:       { type: String, required: true, unique: true, uppercase: true, trim: true },
  isActive:         { type: Boolean, default: true },
  createdBy:        { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Batch', batchSchema);
