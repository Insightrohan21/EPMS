const mongoose = require('mongoose');

const ReviewSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratings: {
    technical: { type: Number, required: true, min: 1, max: 5 },
    communication: { type: Number, required: true, min: 1, max: 5 },
    teamwork: { type: Number, required: true, min: 1, max: 5 },
    problemSolving: { type: Number, required: true, min: 1, max: 5 },
    leadership: { type: Number, required: true, min: 1, max: 5 }
  },
  overallScore: {
    type: Number,
    required: true
  },
  comments: {
    type: String,
    required: [true, 'Please add evaluation comments']
  },
  recommendations: {
    type: String,
    default: ''
  },
  reviewDate: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Calculate overall score pre-validation
ReviewSchema.pre('validate', function(next) {
  if (this.ratings) {
    const { technical, communication, teamwork, problemSolving, leadership } = this.ratings;
    const total = technical + communication + teamwork + problemSolving + leadership;
    this.overallScore = parseFloat((total / 5).toFixed(2));
  }
  next();
});

module.exports = mongoose.model('Review', ReviewSchema);
