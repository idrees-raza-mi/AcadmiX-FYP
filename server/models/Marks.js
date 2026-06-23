const mongoose = require('mongoose');
const { Schema } = mongoose;

// Fixed grading scale used in pre-save hook
const GRADE_SCALE = [
  { min: 90, grade: 'A+' },
  { min: 80, grade: 'A'  },
  { min: 70, grade: 'B+' },
  { min: 60, grade: 'B'  },
  { min: 50, grade: 'C'  },
  { min: 40, grade: 'D'  },
];

const marksSchema = new Schema({
  student:     { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  course:      { type: Schema.Types.ObjectId, ref: 'Course',  required: true },
  semester:    { type: String, required: true },
  midterm:     { type: Number, default: 0, min: 0, max: 30 },
  assignments: { type: Number, default: 0, min: 0, max: 20 },
  quizzes:     { type: Number, default: 0, min: 0, max: 10 },
  final:       { type: Number, default: 0, min: 0, max: 40 },
  total:       { type: Number },  // auto-calculated pre-save
  grade:       { type: String },  // auto-calculated from scale
  gradedBy:    { type: Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });

// Unique: one marks record per student per course per semester
marksSchema.index({ student: 1, course: 1, semester: 1 }, { unique: true });

// Pre-save: calculate total and grade
marksSchema.pre('save', function (next) {
  this.total = (this.midterm || 0) + (this.assignments || 0) + (this.quizzes || 0) + (this.final || 0);

  const match = GRADE_SCALE.find(g => this.total >= g.min);
  this.grade = match ? match.grade : 'F';

  next();
});

// Pre-findOneAndUpdate: recalculate total and grade when using upsert/update
marksSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  const set = update.$set || update;

  const midterm     = set.midterm     !== undefined ? set.midterm     : 0;
  const assignments = set.assignments !== undefined ? set.assignments : 0;
  const quizzes     = set.quizzes     !== undefined ? set.quizzes     : 0;
  const final       = set.final       !== undefined ? set.final       : 0;

  // Only recalculate if at least one marks field is being set
  if (
    set.midterm !== undefined ||
    set.assignments !== undefined ||
    set.quizzes !== undefined ||
    set.final !== undefined
  ) {
    const total = midterm + assignments + quizzes + final;
    const match = GRADE_SCALE.find(g => total >= g.min);
    const grade = match ? match.grade : 'F';

    if (update.$set) {
      update.$set.total = total;
      update.$set.grade = grade;
    } else {
      update.total = total;
      update.grade = grade;
    }
  }

  next();
});

module.exports = mongoose.model('Marks', marksSchema);
