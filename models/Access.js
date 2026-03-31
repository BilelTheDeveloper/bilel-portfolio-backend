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
  password: {
    type: String,
    required: true,
  }
}, { timestamps: true });

// Hash password before saving to database
AccessSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Helper to check password during login
AccessSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('Access', AccessSchema);