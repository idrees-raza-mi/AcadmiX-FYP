const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const studentSchema = new mongoose.Schema({
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },

  // Registered via batch secret code
  batch:      { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
  department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },

  // Keep serial for backward compat (optional)
  serialNumber: { type: mongoose.Schema.Types.ObjectId, ref: 'SerialNumber', default: null },

  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  approvedBy:      { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', default: null },
  approvedAt:      { type: Date, default: null },
  rejectionReason: { type: String, default: '' },

  profile: {
    name:          { type: String, default: '' },
    phone:         { type: String, default: '' },
    dateOfBirth:   { type: Date, default: null },
    gender:        { type: String, enum: ['male', 'female', 'other', ''], default: '' },
    address:       { type: String, default: '' },
    city:          { type: String, default: '' },
    department:    { type: String, default: '' },
    semester:      { type: String, default: '' },
    rollNumber:    { type: String, default: '' },
    cnic:          { type: String, default: '' },
    profilePhoto:  { type: String, default: null },
    idCardFront:   { type: String, default: null },
    idCardBack:    { type: String, default: null },
    guardianName:  { type: String, default: '' },
    guardianPhone: { type: String, default: '' },
  },

  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
}, { timestamps: true });

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

studentSchema.methods.matchPassword = async function (entered) {
  return await bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
