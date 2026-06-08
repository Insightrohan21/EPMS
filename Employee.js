const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  employeeId: {
    type: String,
    required: [true, 'Please add an Employee ID'],
    unique: true,
    trim: true
  },
  profilePicture: {
    type: String,
    default: ''
  },
  department: {
    type: String,
    required: [true, 'Please add a department'],
    trim: true
  },
  designation: {
    type: String,
    required: [true, 'Please add a designation'],
    trim: true
  },
  joiningDate: {
    type: Date,
    default: Date.now
  },
  contactNumber: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Employee', EmployeeSchema);
