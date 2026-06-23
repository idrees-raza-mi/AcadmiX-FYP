const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  credits:     { type: Number, default: 3 },
  department:  { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
  batch:       { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  semester:    { type: String, default: '' },
  teacher:     { type: String, default: '' },
  teacherEmail:{ type: String, default: '' },
  instructor:  { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  capacity:    { type: Number, default: 0 },  // 0 = unlimited
  students:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }],
  schedule:    { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Course', courseSchema);
