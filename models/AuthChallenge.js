const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'Access', required: true, index: true },
  version: { type: Number, required: true },
  kind: { type: String, enum: ['enroll', 'verify'], required: true },
  secret: { type: String, select: false },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 }
}, { timestamps: true });
module.exports = mongoose.model('AuthChallenge', schema);
