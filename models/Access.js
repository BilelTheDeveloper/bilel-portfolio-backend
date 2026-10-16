const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AccessSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    default: "bilel.thedeveloper@gmail.com"
  },
  sessionVersion: { type: Number, default: 0 },
  password: {
    type: String,
    required: true,
  }
}, { timestamps: true });

// --- FIX: Modern Async Pre-save ---
AccessSchema.pre('save', async function () {
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper to check password during login
AccessSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Access', AccessSchema);
