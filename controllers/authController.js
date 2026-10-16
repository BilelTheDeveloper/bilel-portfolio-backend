const Access = require('../models/Access');
const { cookieOptions, signToken, verifyToken, safeEqual } = require('../config/security');
const emailValue = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
exports.checkAccess = async (req, res) => {
  if (!emailValue(req.body.email)) return res.status(400).json({ success: false, message: 'Enter your email address.' });
  // Do not disclose whether an account exists.
  res.json({ success: true, message: 'Continue with your password.' });
};
exports.login = async (req, res) => {
  const email = emailValue(req.body.email);
  const password = req.body.password;
  if (!email || typeof password !== 'string' || password.length > 256) return res.status(400).json({ success: false, message: 'Enter valid credentials.' });
  const admin = await Access.findOne({ email });
  if (!admin || !(await admin.comparePassword(password))) return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  const token = signToken({ id: String(admin._id), purpose: 'admin', version: admin.sessionVersion || 0 }, '8h');
  res.cookie('admin_token', token, { ...cookieOptions(), maxAge: 8 * 60 * 60 * 1000 })
    .clearCookie('gate_pass', cookieOptions()).json({ success: true, user: { email: admin.email } });
};
exports.getStatus = async (req, res) => {
  const admin = await Access.findById(req.user.id).select('email');
  res.set('Cache-Control', 'no-store').json({ success: true, isAdmin: true, user: { email: admin.email } });
};
exports.logout = async (req, res) => {
  // Invalidate every existing token for this administrator, including copied tokens.
  await Access.findByIdAndUpdate(req.user.id, { $inc: { sessionVersion: 1 } });
  res.clearCookie('admin_token', cookieOptions()).clearCookie('gate_pass', cookieOptions()).json({ success: true });
};
exports.verifyGate = async (req, res) => {
  if (!process.env.GATE_MASTER_KEY || !safeEqual(req.body.key, process.env.GATE_MASTER_KEY)) return res.status(401).json({ success: false, message: 'Invalid gate key.' });
  res.cookie('gate_pass', signToken({ purpose: 'gate' }, '15m'), { ...cookieOptions(), maxAge: 15 * 60 * 1000 }).json({ success: true });
};
exports.getGateStatus = (req, res) => {
  try {
    if (verifyToken(req.cookies?.gate_pass).purpose !== 'gate') throw new Error('Invalid purpose');
    res.set('Cache-Control', 'no-store').json({ success: true });
  } catch { res.status(401).json({ success: false, message: 'Gate locked.' }); }
};
