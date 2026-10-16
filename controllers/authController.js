const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');
const Access = require('../models/Access');
const Challenge = require('../models/AuthChallenge');
const Session = require('../models/AdminSession');
const Event = require('../models/SecurityEvent');
const security = require('../config/security');
const { activeFilter, eligible, locked, audit, fail, consumeFactor, issueSession } = require('../services/adminSecurity');
const DUMMY_HASH = bcrypt.hashSync('unavailable-account-timing-placeholder', 12);
const invalid = res => res.status(401).json({ success: false, message: 'Sign-in could not be completed. Check your details or try again later.' });
const publicUser = user => ({ email: user.email, role: user.role, mfaEnabled: user.mfaEnabled });
exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) return invalid(res);
  const user = await Access.findOne({ email: email.trim().toLowerCase() }).select('+password +failedAttempts +lockedUntil');
  const passwordOK = await bcrypt.compare(password, user?.password || DUMMY_HASH);
  if (!eligible(user) || locked(user) || !passwordOK) {
    if (eligible(user) && !locked(user)) { await fail(user._id); await audit(user._id, 'password_failed'); }
    return invalid(res);
  }
  // A password produces only a five-minute challenge, never an admin session.
  const token = security.randomToken();
  const kind = user.mfaEnabled ? 'verify' : 'enroll';
  await Challenge.deleteMany({ userId: user._id });
  await Challenge.create({ tokenHash: security.hashToken(token), userId: user._id, version: user.sessionVersion || 0, kind,
    ...(kind === 'enroll' ? { secret: security.encryptSecret(security.newSecret()) } : {}), expiresAt: new Date(Date.now() + 5 * 60000) });
  res.clearCookie('admin_token', security.cookieOptions()).clearCookie('gate_pass', security.cookieOptions());
  res.cookie(security.cookieName('challenge'), token, { ...security.cookieOptions(), maxAge: 5 * 60000 });
  await audit(user._id, 'password_verified');
  res.json({ success: true, next: kind, csrfToken: security.csrfToken(token), expiresIn: 300 });
};
async function challengeContext(req, res, attempt = false) {
  const token = req.cookies?.[security.cookieName('challenge')];
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token) || !security.safeEqual(req.get('X-Admin-CSRF'), security.csrfToken(token))) { invalid(res); return null; }
  const query = { tokenHash: security.hashToken(token), expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } };
  const challenge = attempt
    ? await Challenge.findOneAndUpdate(query, { $inc: { attempts: 1 } }, { returnDocument: 'after' }).select('+secret')
    : await Challenge.findOne(query).select('+secret');
  if (!challenge) { invalid(res); return null; }
  const user = await Access.findById(challenge.userId).select('+mfaSecret +recoveryHashes +lastTotpCounter +lockedUntil +failedAttempts');
  if (!eligible(user) || locked(user) || (user.sessionVersion || 0) !== challenge.version || (challenge.kind === 'enroll') === Boolean(user.mfaEnabled)) { invalid(res); return null; }
  return { challenge, user };
}
exports.getSetup = async (req, res) => {
  const context = await challengeContext(req, res);
  if (!context) return;
  if (context.challenge.kind !== 'enroll') return invalid(res);
  const secret = security.decryptSecret(context.challenge.secret);
  const uri = security.authenticator(secret, context.user.email).toString();
  // Generate locally; the secret never goes to a third-party QR service.
  const qrCode = await QRCode.toDataURL(uri, { errorCorrectionLevel: 'M', width: 256, margin: 2 });
  res.json({ success: true, secret, qrCode, email: context.user.email });
};
exports.verify = async (req, res) => {
  const context = await challengeContext(req, res, true);
  if (!context) return;
  const { challenge, user } = context;
  const raw = req.body?.code;
  const code = typeof raw === 'string' && raw.length <= 40 ? raw.trim() : '';
  let counter, backups;
  if (challenge.kind === 'enroll') {
    counter = security.validCounter(security.decryptSecret(challenge.secret), code);
    if (counter !== null) backups = security.recoveryCodes();
  }
  const valid = challenge.kind === 'enroll' ? counter !== null : await consumeFactor(user, code, { allowRecovery: true });
  if (!valid) { await fail(user._id); await audit(user._id, 'factor_failed'); return invalid(res); }
  // A challenge is atomically consumed. Concurrent submissions cannot mint multiple sessions.
  const consumed = await Challenge.findOneAndDelete({ _id: challenge._id, expiresAt: { $gt: new Date() } });
  if (!consumed) return invalid(res);
  const update = challenge.kind === 'enroll'
    ? { mfaEnabled: true, mfaSecret: challenge.secret, lastTotpCounter: counter, recoveryHashes: backups.hashes, failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }
    : { failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() };
  const enrollmentFilter = challenge.kind === 'enroll' ? { $or: [{ mfaEnabled: false }, { mfaEnabled: { $exists: false } }] } : { mfaEnabled: true };
  const updated = await Access.findOneAndUpdate({ ...activeFilter(user), ...enrollmentFilter }, { $set: update }, { returnDocument: 'after' });
  if (!updated) return invalid(res);
  const csrfToken = await issueSession(req, res, updated);
  const recoveryUsed = challenge.kind === 'verify' && !/^\d{6}$/.test(code);
  await audit(user._id, challenge.kind === 'enroll' ? 'authenticator_enrolled' : recoveryUsed ? 'recovery_code_used' : 'signed_in');
  res.json({ success: true, user: publicUser(updated), csrfToken, ...(backups ? { recoveryCodes: backups.codes } : {}), recoveryUsed });
};
exports.getStatus = (req, res) => res.json({ success: true, isAdmin: true, user: publicUser(req.admin), csrfToken: req.adminCsrf, expiresAt: req.adminSession.expiresAt });
exports.logout = async (req, res) => {
  await Session.deleteOne({ _id: req.adminSession._id });
  await audit(req.admin._id, 'signed_out');
  res.clearCookie(security.cookieName('session'), security.cookieOptions()).json({ success: true });
};
exports.logoutAll = async (req, res) => {
  await Access.updateOne({ _id: req.admin._id }, { $inc: { sessionVersion: 1 } });
  await Session.deleteMany({ userId: req.admin._id });
  await audit(req.admin._id, 'all_sessions_revoked');
  res.clearCookie(security.cookieName('session'), security.cookieOptions()).json({ success: true });
};
exports.sessions = async (req, res) => {
  const sessions = await Session.find({ userId: req.admin._id, expiresAt: { $gt: new Date() }, lastSeenAt: { $gt: new Date(Date.now() - 30 * 60000) } }).select('_id userAgent lastSeenAt createdAt expiresAt').sort('-createdAt').limit(30);
  res.json({ success: true, data: sessions.map(session => ({ ...session.toObject(), current: String(session._id) === String(req.adminSession._id) })) });
};
exports.revokeSession = async (req, res) => {
  const removed = await Session.findOneAndDelete({ _id: req.params.id, userId: req.admin._id });
  if (!removed) return res.status(404).json({ success: false, message: 'Session not found.' });
  await audit(req.admin._id, 'session_revoked');
  const current = String(removed._id) === String(req.adminSession._id);
  if (current) res.clearCookie(security.cookieName('session'), security.cookieOptions());
  res.json({ success: true, current });
};
exports.regenerateRecovery = async (req, res) => {
  const backups = security.recoveryCodes();
  await Access.updateOne(activeFilter(req.admin), { $set: { recoveryHashes: backups.hashes } });
  await audit(req.admin._id, 'recovery_codes_rotated');
  res.json({ success: true, recoveryCodes: backups.codes });
};
exports.events = async (req, res) => {
  const data = await Event.find({ userId: req.admin._id }).select('event createdAt target').sort('-createdAt').limit(30);
  res.json({ success: true, data });
};
exports.accounts = async (req, res) => {
  const data = await Access.find().select('email role isActive mfaEnabled lastLoginAt createdAt').sort('email').limit(100);
  res.json({ success: true, data });
};
exports.createAccount = async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 16 || Buffer.byteLength(password) > 72) return res.status(400).json({ success: false, message: 'Use a valid email and a password of at least 16 characters (maximum 72 bytes).' });
  try {
    const account = await Access.create({ email: email.trim().toLowerCase(), password, role: 'admin', isActive: true });
    await audit(req.admin._id, 'account_approved', account.email);
    res.status(201).json({ success: true, message: 'Account approved. Authenticator enrollment is required at first sign-in.' });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ success: false, message: 'This account already exists.' });
    throw error;
  }
};
exports.disableAccount = async (req, res) => {
  if (String(req.admin._id) === req.params.id) return res.status(400).json({ success: false, message: 'You cannot disable your own account.' });
  // Owners can disable admin accounts; owner promotion/recovery is an offline operator action.
  const user = await Access.findOneAndUpdate({ _id: req.params.id, role: 'admin' }, { $set: { isActive: false }, $inc: { sessionVersion: 1 } }, { returnDocument: 'after' });
  if (!user) return res.status(404).json({ success: false, message: 'Administrator not found.' });
  await Session.deleteMany({ userId: user._id });
  await Challenge.deleteMany({ userId: user._id });
  await audit(req.admin._id, 'account_disabled', user.email);
  res.json({ success: true });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (typeof currentPassword !== 'string' || Buffer.byteLength(currentPassword) > 72 || typeof newPassword !== 'string' || newPassword.length < 16 || Buffer.byteLength(newPassword) > 72) return res.status(400).json({ success: false, message: 'Use a new password of at least 16 characters, at most 72 bytes.' });
  const user = await Access.findById(req.admin._id).select('+password');
  if (!user || !(await bcrypt.compare(currentPassword, user.password))) return invalid(res);
  if (await bcrypt.compare(newPassword, user.password)) return res.status(400).json({ success: false, message: 'Choose a different password.' });
  const hash = await bcrypt.hash(newPassword, 12);
  const result = await Access.updateOne(activeFilter(req.admin), { $set: { password: hash }, $inc: { sessionVersion: 1 } });
  if (result.modifiedCount !== 1) return invalid(res);
  await Session.deleteMany({ userId: user._id });
  await Challenge.deleteMany({ userId: user._id });
  await audit(user._id, 'password_changed');
  res.clearCookie(security.cookieName('session'), security.cookieOptions()).json({ success: true });
};

exports.enableAccount = async (req, res) => {
  const user = await Access.findOneAndUpdate({ _id: req.params.id, role: 'admin', isActive: false }, { $set: { isActive: true, failedAttempts: 0, lockedUntil: null }, $inc: { sessionVersion: 1 } }, { returnDocument: 'after' });
  if (!user) return res.status(404).json({ success: false, message: 'Disabled administrator not found.' });
  await Session.deleteMany({ userId: user._id });
  await Challenge.deleteMany({ userId: user._id });
  await audit(req.admin._id, 'account_enabled', user.email);
  res.json({ success: true });
};
