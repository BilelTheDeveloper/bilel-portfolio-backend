const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Access', index: true },
  event: { type: String, required: true },
  target: String,
  createdAt: { type: Date, default: Date.now, expires: 90 * 24 * 60 * 60 }
});
module.exports = mongoose.model('SecurityEvent', schema);
