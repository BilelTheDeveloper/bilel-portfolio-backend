require('dotenv').config();
const mongoose = require('mongoose');
const Access = require('../models/Access');
const bcrypt = require('bcryptjs');
const Session = require('../models/AdminSession');
const Challenge = require('../models/AuthChallenge');
async function manage() {
  const command = process.argv[2];
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!['grant-owner', 'grant-admin', 'disable', 'reset-mfa', 'reset-password'].includes(command) || !email) throw new Error('Set ADMIN_EMAIL, then run npm run admin:access -- grant-owner|grant-admin|disable|reset-mfa|reset-password');
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    const user = await Access.findOne({ email }).select('+password');
    if (!user) throw new Error('Account not found. Run the one-time admin setup to create it.');
    if (command === 'reset-mfa' && process.env.CONFIRM_MFA_RESET !== email) throw new Error('Operator recovery requires CONFIRM_MFA_RESET set to the exact account email.');
    const password = process.env.ADMIN_PASSWORD;
    const granting = ['grant-owner', 'grant-admin'].includes(command);
    if ((granting && !user.mfaEnabled) || command === 'reset-password' || (granting && password)) {
      if (typeof password !== 'string' || password.length < 16 || Buffer.byteLength(password) > 72) throw new Error('Set a fresh ADMIN_PASSWORD (16+ characters, at most 72 bytes) before approving an unenrolled account.');
      if (await bcrypt.compare(password, user.password)) throw new Error('Use a new password rather than the existing one.');
    }
    if (command === 'reset-password' && process.env.CONFIRM_ADMIN_RESET !== email) throw new Error('Password recovery requires CONFIRM_ADMIN_RESET set to the exact account email.');
    const values = command === 'disable'  ? { isActive: false } : command === 'reset-mfa'
      ? { mfaEnabled: false, mfaSecret: null, recoveryHashes: [], lastTotpCounter: -1, failedAttempts: 0, lockedUntil: null }
      : command === 'reset-password' ? { failedAttempts: 0, lockedUntil: null } : { isActive: true, role: command === 'grant-owner' ? 'owner' : 'admin' };
    if ((granting && password) || command === 'reset-password') values.password = await bcrypt.hash(password, 12);
    await Access.updateOne({ _id: user._id }, { $set: values, $inc: { sessionVersion: 1 } });
    await Session.deleteMany({ userId: user._id });
    await Challenge.deleteMany({ userId: user._id });
    console.log('Account access updated; existing sessions and sign-in requests were revoked.');
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) manage().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { manage };
