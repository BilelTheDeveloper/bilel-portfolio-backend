const Access = require('../models/Access');
const Session = require('../models/AdminSession');
const Event = require('../models/SecurityEvent');
const { cookieName, cookieOptions, randomToken, hashToken, csrfToken, validCounter, decryptSecret, recoveryHash, normalizeRecovery } = require('../config/security');
const activeFilter = user => ({ _id: user._id, isActive: true, role: { $in: ['owner', 'admin'] }, sessionVersion: user.sessionVersion || 0 });
const eligible = user => user?.isActive === true && ['owner', 'admin'].includes(user.role);
const locked = user => user.lockedUntil && new Date(user.lockedUntil) > new Date();
async function audit(userId, event, target) {
  try { await Event.create({ userId, event, ...(target ? { target } : {}) }); }
  catch { console.error('Security audit storage unavailable.'); }
}
async function fail(userId) {
  await Access.updateOne({ _id: userId }, [
    { $set: { failedAttempts: { $add: [{ $ifNull: ['$failedAttempts', 0] }, 1] } } },
    { $set: { lockedUntil: { $cond: [{ $gte: ['$failedAttempts', 5] }, new Date(Date.now() + 15 * 60000), '$lockedUntil'] } } }
  ], { updatePipeline: true });
}
async function consumeFactor(user, code, { allowRecovery = false } = {}) {
  const filter = { ...activeFilter(user), mfaEnabled: true, $or: [{ lockedUntil: null }, { lockedUntil: { $lte: new Date() } }] };
  if (typeof code === 'string' && /^\d{6}$/.test(code)) {
    const counter = validCounter(decryptSecret(user.mfaSecret), code);
    if (counter === null) return false;
    const result = await Access.updateOne({ ...filter, $and: [{ $or: [{ lastTotpCounter: { $lt: counter } }, { lastTotpCounter: { $exists: false } }] }] }, { $set: { lastTotpCounter: counter } });
    return result.modifiedCount === 1;
  }
  const normalized = normalizeRecovery(code);
  if (!allowRecovery || !/^[A-F0-9]{20}$/.test(normalized)) return false;
  const hash = recoveryHash(normalized);
  const result = await Access.updateOne({ ...filter, recoveryHashes: hash }, { $pull: { recoveryHashes: hash } });
  return result.modifiedCount === 1;
}
async function issueSession(req, res, user) {
  const token = randomToken();
  await Session.create({ tokenHash: hashToken(token), userId: user._id, version: user.sessionVersion || 0,
    userAgent: (req.get('user-agent') || 'Unknown browser').slice(0, 240), lastSeenAt: new Date(), expiresAt: new Date(Date.now() + 6 * 3600000) });
  res.clearCookie('admin_token', cookieOptions()).clearCookie('gate_pass', cookieOptions()).clearCookie(cookieName('challenge'), cookieOptions());
  res.cookie(cookieName('session'), token, { ...cookieOptions(), maxAge: 6 * 3600000 });
  return csrfToken(token);
}
module.exports = { activeFilter, eligible, locked, audit, fail, consumeFactor, issueSession };
