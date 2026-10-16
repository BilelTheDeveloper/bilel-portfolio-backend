const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const AccessSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['owner', 'admin'], default: 'admin' },
  isActive: { type: Boolean, default: false },
  sessionVersion: { type: Number, default: 0 },
  mfaEnabled: { type: Boolean, default: false },
  mfaSecret: { type: String, select: false },
  recoveryHashes: { type: [String], default: [], select: false },
  lastTotpCounter: { type: Number, default: -1, select: false },
  failedAttempts: { type: Number, default: 0, select: false },
  lockedUntil: { type: Date, select: false },
  lastLoginAt: Date
}, { timestamps: true });
AccessSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});
AccessSchema.methods.comparePassword = function (value) { return bcrypt.compare(value, this.password); };
module.exports = mongoose.model('Access', AccessSchema);
