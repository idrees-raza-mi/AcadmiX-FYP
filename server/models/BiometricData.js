const mongoose = require('mongoose');
const { Schema } = mongoose;

const biometricDataSchema = new Schema({
  student:         { type: Schema.Types.ObjectId, ref: 'Student', required: true, unique: true },
  faceDescriptors: { type: [[Number]], default: [] }, // array of 128-float arrays (multiple captures)
  fingerprintId:   { type: String, default: null },   // WebAuthn credential ID base64
  registeredAt:    { type: Date, default: Date.now },
  registeredBy:    { type: Schema.Types.ObjectId, ref: 'Admin' },
  lastVerifiedAt:  { type: Date },
});

module.exports = mongoose.model('BiometricData', biometricDataSchema);
