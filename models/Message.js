const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  idempotencyKey: { type: String, unique: true, sparse: true },
  notificationStatus: { type: String, enum: ['pending', 'sending', 'sent', 'failed'], default: 'pending' },
  notificationAttempts: { type: Number, default: 0 },
  notificationNextAt: { type: Date, default: Date.now },
  notificationLeaseAt: Date,
  name: {
    type: String,
    required: [true, 'Please add a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please add an email'],
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Please add a valid email'
    ]
  },
  subject: {
    type: String,
    default: 'New Inquiry from Bilel.dev'
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
