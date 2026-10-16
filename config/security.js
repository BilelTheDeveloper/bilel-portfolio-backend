const crypto = require('node:crypto');
const OTPAuth = require('otpauth');
const isProduction = () => process.env.NODE_ENV === 'production';
const cookieName = kind => `${isProduction() ? '__Host-' : ''}bilel_${kind}`;
const cookieOptions = () => ({ httpOnly: true, secure: isProduction(), sameSite: 'lax', path: '/' });
const randomToken = () => crypto.randomBytes(32).toString('base64url');
const hashToken = value => crypto.createHash('sha256').update(value).digest('hex');
const key = () => {
  if (!/^[a-f0-9]{64}$/i.test(process.env.MFA_ENCRYPTION_KEY || '')) throw new Error('MFA_ENCRYPTION_KEY must contain exactly 64 hexadecimal characters.');
  return Buffer.from(process.env.MFA_ENCRYPTION_KEY, 'hex');
};
const keyedHash = (purpose, value) => crypto.createHmac('sha256', key()).update(`${purpose}:${value}`).digest('hex');
const csrfToken = token => keyedHash('csrf', token);
const safeEqual = (a, b) => typeof a === 'string' && typeof b === 'string' && crypto.timingSafeEqual(Buffer.from(hashToken(a)), Buffer.from(hashToken(b)));
function encryptSecret(secret) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from('bilel-mfa-v1'));
  const data = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map(value => value.toString('base64url')).join('.');
}
function decryptSecret(value) {
  const [iv, tag, data] = value.split('.').map(part => Buffer.from(part, 'base64url'));
  const cipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  cipher.setAAD(Buffer.from('bilel-mfa-v1'));
  cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(data), cipher.final()]).toString('utf8');
}
const newSecret = () => new OTPAuth.Secret({ size: 20 }).base32;
const authenticator = (secret, email) => new OTPAuth.TOTP({ issuer: 'Bilel Admin', label: email, algorithm: 'SHA1', digits: 6, period: 30, secret });
function validCounter(secret, code, timestamp = Date.now()) {
  if (typeof code !== 'string' || !/^\d{6}$/.test(code)) return null;
  const delta = authenticator(secret).validate({ token: code, window: 1, timestamp });
  return delta === null ? null : Math.floor(timestamp / 30000) + delta;
}
const normalizeRecovery = value => typeof value === 'string' ? value.replace(/[-\s]/g, '').toUpperCase() : '';
const recoveryHash = value => keyedHash('recovery', normalizeRecovery(value));
function recoveryCodes() {
  const codes = Array.from({ length: 10 }, () => crypto.randomBytes(10).toString('hex').toUpperCase().match(/.{1,5}/g).join('-'));
  return { codes, hashes: codes.map(recoveryHash) };
}
module.exports = { cookieName, cookieOptions, randomToken, hashToken, csrfToken, safeEqual, encryptSecret, decryptSecret, newSecret, authenticator, validCounter, recoveryHash, normalizeRecovery, recoveryCodes, key };
