const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide your name'],
    trim: true
  },
  role: {
    type: String,
    required: [true, 'Please provide your professional role'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide your email'],
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please provide a valid email address'
    ]
  },
  message: {
    type: String,
    required: [true, 'Please provide your feedback message'],
    maxLength: [1000, 'Message cannot exceed 1000 characters']
  },
  rating: {
    type: Number,
    default: 5,
    min: 1,
    max: 5
  },
  // We keep this hidden from the public, but visible in your Admin Dashboard
  isApproved: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Feedback', feedbackSchema);
