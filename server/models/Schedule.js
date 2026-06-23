const mongoose = require('mongoose');
const { Schema } = mongoose;

const scheduleSchema = new Schema({
  course:    { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  batch:     { type: Schema.Types.ObjectId, ref: 'Batch',  required: true },
  day:       {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  },
  startTime: { type: String, required: true }, // '09:00' 24h
  endTime:   { type: String, required: true }, // '09:40' 24h
  room:      { type: String, default: '' },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

// One batch cannot have two classes at the same time on the same day
scheduleSchema.index({ batch: 1, day: 1, startTime: 1 }, { unique: true });

/**
 * durationMinutes — returns the difference between endTime and startTime in minutes.
 * Both times are expected to be in 'HH:MM' 24-hour format.
 */
scheduleSchema.methods.durationMinutes = function () {
  const toMinutes = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMinutes(this.endTime) - toMinutes(this.startTime);
};

module.exports = mongoose.model('Schedule', scheduleSchema);
