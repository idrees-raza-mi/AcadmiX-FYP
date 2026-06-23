const mongoose = require('mongoose');

const serialNumberSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  isUsed: { type: Boolean, default: false },
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', default: null },
  usedAt: { type: Date, default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
  note: { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('SerialNumber', serialNumberSchema);
