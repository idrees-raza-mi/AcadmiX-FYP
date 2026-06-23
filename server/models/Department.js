const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  description: { type: String, default: '' },
  hod: {
    name:  { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
  },
  established: { type: String, default: '' },
  totalSeats:  { type: Number, default: 0 },
  vision:      { type: String, default: '' },
  isActive:    { type: Boolean, default: true },
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

module.exports = mongoose.model('Department', departmentSchema);
