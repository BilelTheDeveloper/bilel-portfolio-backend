const mongoose = require('mongoose');
const { SERVICES, BUDGETS, TIMELINES } = require('../services/inquiryFields');

const messageSchema = new mongoose.Schema({
  company: { type: String, trim: true, maxlength: 120, default: '' },
  service: { type: String, enum: ['', ...SERVICES], default: '' },
  budget: { type: String, enum: ['', ...BUDGETS], default: '' },
  timeline: { type: String, enum: ['', ...TIMELINES], default: '' },
  status: { type: String, enum: ['new', 'reviewing', 'contacted', 'archived'], default: 'new' },
  idempotencyKey: { type: String, unique: true, sparse: true },
  notificationStatus: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
  notificationAttempts: { type: Number, default: 0 },
  notificationNextAt: { type: Date, default: Date.now },
  notificationLeaseAt: Date,
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true, maxlength: 100
  },
  email: {
    type: String,
    required: [true, 'Please add an email'], maxlength: 254,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please add a valid email'
    ]
  },
  subject: {
    type: String,
    default: 'New Inquiry from Bilel.dev', maxlength: 150
  },
  message: {
    type: String,
    required: [true, 'Please add a message'], maxlength: 5000
  },
  createdAt: {
    type: Date,
    default: Date.now // Automatically stamps the time the message arrived
  }
});

module.exports = mongoose.model('Message', messageSchema);
