const Access = require('../models/Access');
const Session = require('../models/AdminSession');
const { cookieName, cookieOptions, hashToken, csrfToken, safeEqual } = require('../config/security');
const { eligible, locked, consumeFactor, fail, audit } = require('../services/adminSecurity');
const unauthorized = res => res.clearCookie(cookieName('session'), cookieOptions()).status(401).json({ success: false, message: 'Your session ended. Please sign in again.' });
async function protect(req, res, next) {
  const token = req.cookies?.[cookieName('session')];
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return unauthorized(res);
  const query = { tokenHash: hashToken(token), expiresAt: { $gt: new Date() }, lastSeenAt: { $gt: new Date(Date.now() - 30 * 60000) } };
  // Background status polling must not extend an idle session.
  const session = req.originalUrl.split('?')[0] === '/api/auth/status'
    ? await Session.findOne(query)
    : await Session.findOneAndUpdate(query, { $set: { lastSeenAt: new Date() } }, { returnDocument: 'after' });
  if (!session) return unauthorized(res);
  const user = await Access.findById(session.userId);
  if (!eligible(user) || user.mfaEnabled !== true || (user.sessionVersion || 0) !== session.version) return unauthorized(res);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && !safeEqual(req.get('X-Admin-CSRF'), csrfToken(token))) return res.status(403).json({ success: false, message: 'Security check failed. Refresh and try again.' });
  req.admin = user;
  req.adminSession = session;
  req.adminCsrf = csrfToken(token);
  req.user = { id: user._id };
  next();
}
function ownerOnly(req, res, next) {
  if (req.admin.role !== 'owner') return res.status(403).json({ success: false, message: 'Owner access is required.' });
  next();
}
async function stepUp(req, res, next) {
  const user = await Access.findById(req.admin._id).select('+mfaSecret +lastTotpCounter +failedAttempts +lockedUntil');
  if (!user || locked(user) || !(await consumeFactor(user, req.body?.verificationCode))) {
    if (user && !locked(user)) await fail(user._id);
    await audit(req.admin._id, 'step_up_failed');
    return res.status(401).json({ success: false, message: 'Use a fresh authenticator code. Reused codes are not accepted.' });
  }
  next();
}
module.exports = { protect, ownerOnly, stepUp };
