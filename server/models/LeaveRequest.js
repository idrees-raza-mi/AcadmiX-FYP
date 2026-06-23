const mongoose = require('mongoose');
const { Schema } = mongoose;

const leaveRequestSchema = new Schema({
  student:     { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  course:      { type: Schema.Types.ObjectId, ref: 'Course', default: null }, // null = all courses
  dateFrom:    { type: Date, required: true },
  dateTo:      { type: Date, required: true },
  reason:      { type: String, required: true, maxlength: 1000 },
  status:      { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  adminReason: { type: String, default: '' }, // admin writes on reject
  reviewedBy:  { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  reviewedAt:  { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
