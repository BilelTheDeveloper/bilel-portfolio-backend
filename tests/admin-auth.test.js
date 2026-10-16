const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
process.env.NODE_ENV = 'test';
process.env.MFA_ENCRYPTION_KEY = 'b'.repeat(64);
process.env.CLOUDINARY_CLOUD_NAME = 'local-test';
process.env.TRUST_PROXY = '1';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
const { app } = require('../server');
const Access = require('../models/Access');
const Session = require('../models/AdminSession');
const Challenge = require('../models/AuthChallenge');
const Event = require('../models/SecurityEvent');
const security = require('../config/security');
let database, server, base, user, serial = 1;
const email = 'owner@example.com';
const password = 'A long private test password 2026!';
before(async () => {
  database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri('isolated-admin-auth-tests'));
  await Promise.all([Access.init(), Session.init(), Challenge.init(), Event.init()]);
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(async () => {
  await Promise.all([Access.deleteMany({}), Session.deleteMany({}), Challenge.deleteMany({}), Event.deleteMany({})]);
  user = await Access.create({ email, password, role: 'owner', isActive: true });
});
after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await mongoose.disconnect();
  if (database) await database.stop();
});
function client() {
  const cookies = new Map();
  const ip = `198.51.100.${serial++}`;
  let csrf = '';
  return {
    async send(path, body, { method = body === undefined ? 'GET' : 'POST', headers = {} } = {}) {
      const response = await fetch(base + '/api/auth' + path, { method,
        headers: { Origin: 'http://localhost:5173', 'X-Forwarded-For': ip, 'Content-Type': 'application/json', 'X-Admin-Request': '1', 'X-Admin-CSRF': csrf, Cookie: [...cookies].map(([key, value]) => `${key}=${value}`).join('; '), ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      for (const value of response.headers.getSetCookie()) {
        const pair = value.split(';')[0]; const split = pair.indexOf('=');
        if (pair.slice(split + 1)) cookies.set(pair.slice(0, split), pair.slice(split + 1)); else cookies.delete(pair.slice(0, split));
      }
      const data = await response.json(); if (data.csrfToken) csrf = data.csrfToken;
      return { status: response.status, data, headers: response.headers };
    }, cookies
  };
}
async function enroll(browser = client()) {
  assert.equal((await browser.send('/login', { email, password })).data.next, 'enroll');
  const setup = await browser.send('/setup');
  const verified = await browser.send('/verify', { code: security.authenticator(setup.data.secret).generate() });
  assert.equal(verified.status, 200);
  return { browser, secret: setup.data.secret, backups: verified.data.recoveryCodes };
}
const otp = secret => security.authenticator(secret).generate();

test('password alone never grants a session; setup is private and confirmed by a code', async () => {
  const browser = client();
  const first = await browser.send('/login', { email: email.toUpperCase(), password });
  assert.equal(first.status, 200); assert.equal(first.data.next, 'enroll');
  assert.equal(browser.cookies.has('bilel_session'), false);
  assert.equal((await browser.send('/status')).status, 401);
  const setup = await browser.send('/setup');
  assert.match(setup.data.qrCode, /^data:image\/png;base64,/);
  const challenge = await Challenge.findOne({ userId: user._id }).select('+secret');
  assert.notEqual(challenge.secret, setup.data.secret);
  assert.equal((await Access.findById(user._id)).mfaEnabled, false);
  assert.equal((await client().send('/setup')).status, 401);
  const result = await browser.send('/verify', { code: otp(setup.data.secret) });
  assert.equal(result.status, 200); assert.equal(result.data.recoveryCodes.length, 10);
  assert.equal((await browser.send('/status')).status, 200);
  const stored = await Access.findById(user._id).select('+mfaSecret +recoveryHashes');
  assert.equal(stored.mfaEnabled, true); assert.notEqual(stored.mfaSecret, setup.data.secret);
  assert.equal(stored.recoveryHashes.includes(result.data.recoveryCodes[0]), false);
  assert.equal((await browser.send('/verify', { code: otp(setup.data.secret) })).status, 401);
});
test('unknown, inactive, unapproved and bad-password accounts receive the same denial', async () => {
  const browser = client();
  const absent = await browser.send('/login', { email: 'absent@example.com', password });
  const wrong = await browser.send('/login', { email, password: 'Incorrect password' });
  await Access.updateOne({ _id: user._id }, { $set: { isActive: false } });
  const disabled = await browser.send('/login', { email, password });
  assert.equal(absent.status, 401); assert.equal(wrong.status, 401); assert.equal(disabled.status, 401);
  assert.equal(absent.data.message, wrong.data.message); assert.equal(disabled.data.message, wrong.data.message);
  assert.equal(await Session.countDocuments(), 0);
  assert.equal((await browser.send('/register', { email, password })).status, 401);
});
test('authenticator codes cannot be replayed, including concurrent submissions', async () => {
  const { secret } = await enroll();
  const browser = client();
  await browser.send('/login', { email, password });
  assert.equal((await browser.send('/verify', { code: otp(secret) })).status, 401);
  await Access.updateOne({ _id: user._id }, { $set: { lastTotpCounter: -1 } });
  const results = await Promise.all([browser.send('/verify', { code: otp(secret) }), browser.send('/verify', { code: otp(secret) })]);
  assert.deepEqual(results.map(result => result.status).sort(), [200, 401]);
  assert.equal(await Session.countDocuments(), 2);
});
test('recovery codes are one-use and never skip the password step', async () => {
  const { backups } = await enroll();
  assert.equal((await client().send('/verify', { code: backups[0] })).status, 401);
  const browser = client(); await browser.send('/login', { email, password });
  const recovered = await browser.send('/verify', { code: backups[0] });
  assert.equal(recovered.status, 200); assert.equal(recovered.data.recoveryUsed, true);
  const again = client(); await again.send('/login', { email, password });
  assert.equal((await again.send('/verify', { code: backups[0] })).status, 401);
  const stored = await Access.findById(user._id).select('+recoveryHashes');
  assert.equal(stored.recoveryHashes.length, 9);
});
test('CSRF, old cookies and legacy gate routes cannot authorize admin actions', async () => {
  const { browser } = await enroll();
  assert.equal((await browser.send('/logout', {}, { headers: { 'X-Admin-CSRF': 'forged' } })).status, 403);
  assert.equal((await browser.send('/status')).status, 200);
  assert.equal((await client().send('/status', undefined, { headers: { Cookie: 'admin_token=old.jwt.token; gate_pass=authorized' } })).status, 401);
  assert.equal((await client().send('/verify-gate', { key: 'anything' })).status, 401);
  assert.equal((await browser.send('/logout', {}, { headers: { Origin: 'https://evil.example' } })).status, 403);
  assert.equal((await browser.send('/logout', {})).status, 200);
  assert.equal((await browser.send('/status')).status, 401);
});
test('account disabling, invalid roles and version revocation reject a copied live cookie', async () => {
  const { browser } = await enroll();
  const cookie = [...browser.cookies].map(([key, value]) => `${key}=${value}`).join('; ');
  await Access.updateOne({ _id: user._id }, { $set: { isActive: false } });
  assert.equal((await browser.send('/status')).status, 401);
  await Access.updateOne({ _id: user._id }, { $set: { isActive: true } });
  await Access.collection.updateOne({ _id: user._id }, { $set: { role: 'visitor' } });
  assert.equal((await client().send('/status', undefined, { headers: { Cookie: cookie } })).status, 401);
  await Access.updateOne({ _id: user._id }, { $set: { role: 'owner' }, $inc: { sessionVersion: 1 } });
  assert.equal((await client().send('/status', undefined, { headers: { Cookie: cookie } })).status, 401);
});
test('database-backed failed attempts lock the account across new challenges', async () => {
  const browser = client();
  for (let index = 0; index < 5; index++) assert.equal((await browser.send('/login', { email, password: 'wrong password' })).status, 401);
  assert.equal((await browser.send('/login', { email, password })).status, 401);
  const stored = await Access.findById(user._id).select('+lockedUntil +failedAttempts');
  assert.equal(stored.failedAttempts, 5); assert.ok(stored.lockedUntil > new Date());
});
test('expired challenges and idle sessions are rejected without relying on TTL cleanup', async () => {
  const browser = client(); await browser.send('/login', { email, password });
  await Challenge.updateMany({}, { $set: { expiresAt: new Date(0) } });
  assert.equal((await browser.send('/setup')).status, 401);
  const enrolled = await enroll();
  await Session.updateMany({}, { $set: { lastSeenAt: new Date(Date.now() - 31 * 60000) } });
  assert.equal((await enrolled.browser.send('/status')).status, 401);
});
test('background status polling does not renew idle time', async () => {
  const { browser } = await enroll();
  const time = new Date(Date.now() - 60000);
  await Session.updateMany({}, { $set: { lastSeenAt: time } });
  assert.equal((await browser.send('/status')).status, 200);
  const stored = await Session.findOne({ userId: user._id });
  assert.equal(stored.lastSeenAt.getTime(), time.getTime());
});
test('owner actions need a fresh factor; ordinary admins cannot manage allowlisted accounts', async () => {
  const { browser, secret } = await enroll();
  const body = { email: 'approved@example.com', password: 'Another private password 2026!', verificationCode: 'invalid' };
  assert.equal((await browser.send('/accounts', body)).status, 401);
  await Access.updateOne({ _id: user._id }, { $set: { lastTotpCounter: -1 } });
  const created = await browser.send('/accounts', { ...body, verificationCode: otp(secret) });
  assert.equal(created.status, 201);
  const approved = await Access.findOne({ email: body.email }).select('+password');
  assert.equal(approved.role, 'admin'); assert.equal(approved.isActive, true); assert.equal(approved.mfaEnabled, false);
  assert.notEqual(approved.password, body.password);
  await Access.updateOne({ _id: user._id }, { $set: { role: 'admin' } });
  assert.equal((await browser.send('/accounts')).status, 403);
});

test('password change requires both current password and fresh factor, then revokes all sessions', async () => {
  const { browser, secret } = await enroll();
  await Access.updateOne({ _id: user._id }, { $set: { lastTotpCounter: -1 } });
  const newPassword = 'A different long private password 2026!';
  const changed = await browser.send('/password', { currentPassword: password, newPassword, verificationCode: otp(secret) });
  assert.equal(changed.status, 200);
  assert.equal(await Session.countDocuments(), 0);
  assert.equal((await browser.send('/status')).status, 401);
  assert.equal((await browser.send('/login', { email, password })).status, 401);
  assert.equal((await browser.send('/login', { email, password: newPassword })).data.next, 'verify');
});
test('recovery regeneration invalidates all old codes and does not expose hashes', async () => {
  const { browser, secret, backups } = await enroll();
  await Access.updateOne({ _id: user._id }, { $set: { lastTotpCounter: -1 } });
  const replacement = await browser.send('/recovery-codes', { verificationCode: otp(secret) });
  assert.equal(replacement.status, 200); assert.equal(replacement.data.recoveryCodes.length, 10);
  const stored = await Access.findById(user._id).select('+recoveryHashes');
  assert.equal(stored.recoveryHashes.includes(security.recoveryHash(backups[0])), false);
  assert.equal(stored.recoveryHashes.includes(security.recoveryHash(replacement.data.recoveryCodes[0])), true);
  const accountList = await browser.send('/accounts');
  assert.equal(accountList.data.data[0].password, undefined);
  assert.equal(accountList.data.data[0].mfaSecret, undefined);
  assert.equal(accountList.data.data[0].recoveryHashes, undefined);
  const sessions = await browser.send('/sessions');
  assert.equal(sessions.data.data[0].tokenHash, undefined);
});
test('existing approved account without MFA fields can enroll without replacing its password', async () => {
  await Access.collection.updateOne({ _id: user._id }, { $unset: { mfaEnabled: '', lastTotpCounter: '', recoveryHashes: '' } });
  const { browser } = await enroll();
  assert.equal((await browser.send('/status')).status, 200);
});
test('MFA failures persist across replacement challenges and lock at five attempts', async () => {
  const { secret } = await enroll();
  assert.ok(secret);
  const browser = client();
  for (let index = 0; index < 5; index++) {
    assert.equal((await browser.send('/login', { email, password })).status, 200);
    assert.equal((await browser.send('/verify', { code: 'invalid-code' })).status, 401);
  }
  assert.equal((await browser.send('/login', { email, password })).status, 401);
  const stored = await Access.findById(user._id).select('+failedAttempts +lockedUntil');
  assert.equal(stored.failedAttempts, 5);
  assert.ok(stored.lockedUntil > new Date());
});
test('production cookies are host-only, secure, HttpOnly and SameSite Lax', () => {
  const previous = process.env.NODE_ENV; process.env.NODE_ENV = 'production';
  try {
    const options = security.cookieOptions();
    assert.equal(security.cookieName('session'), '__Host-bilel_session');
    assert.equal(options.secure, true); assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, 'lax'); assert.equal(options.path, '/'); assert.equal(options.domain, undefined);
  } finally { process.env.NODE_ENV = previous; }
});

test('owner can disable and reapprove an admin without restoring revoked sessions', async () => {
  const { browser, secret } = await enroll();
  const secondarySecret = security.newSecret();
  const other = await Access.create({ email: 'other@example.com', password, role: 'admin', isActive: true, mfaEnabled: true, mfaSecret: security.encryptSecret(secondarySecret) });
  const otherBrowser = client();
  await otherBrowser.send('/login', { email: other.email, password });
  assert.equal((await otherBrowser.send('/verify', { code: otp(secondarySecret) })).status, 200);
  const otherCookie = [...otherBrowser.cookies].map(([key, value]) => `${key}=${value}`).join('; ');
  await Access.updateOne({ _id: user._id }, { $set: { lastTotpCounter: -1 } });
  assert.equal((await browser.send(`/accounts/${other._id}/disable`, { verificationCode: otp(secret) }, { method: 'PATCH' })).status, 200);
  assert.equal((await client().send('/status', undefined, { headers: { Cookie: otherCookie } })).status, 401);
  assert.equal((await otherBrowser.send('/login', { email: other.email, password })).status, 401);
  await Access.updateOne({ _id: user._id }, { $set: { lastTotpCounter: -1 } });
  assert.equal((await browser.send(`/accounts/${other._id}/enable`, { verificationCode: otp(secret) }, { method: 'PATCH' })).status, 200);
  assert.equal((await client().send('/status', undefined, { headers: { Cookie: otherCookie } })).status, 401);
  assert.equal((await otherBrowser.send('/login', { email: other.email, password })).data.next, 'verify');
});

test('operator migration refuses a legacy password and approves only after a fresh password is provided', async () => {
  const { promisify } = require('node:util');
  const execFile = promisify(require('node:child_process').execFile);
  const path = require('node:path');
  await Access.collection.updateOne({ _id: user._id }, { $unset: { isActive: '', role: '', mfaEnabled: '' } });
  const env = { ...process.env, MONGODB_URI: database.getUri('isolated-admin-auth-tests'), ADMIN_EMAIL: email };
  env.ADMIN_PASSWORD = ''; // Prevent a developer .env from supplying a real bootstrap password.
  const args = [path.join(__dirname, '../scripts/admin-access.js'), 'grant-owner'];
  await assert.rejects(execFile(process.execPath, args, { env, timeout: 20000 }), error => error.stderr.includes('fresh ADMIN_PASSWORD'));
  assert.equal((await Access.findById(user._id)).isActive, false);
  const fresh = 'A new owner migration password 2026!';
  await execFile(process.execPath, args, { env: { ...env, ADMIN_PASSWORD: fresh }, timeout: 20000 });
  const updated = await Access.findById(user._id).select('+password');
  assert.equal(updated.isActive, true); assert.equal(updated.role, 'owner');
  assert.equal(await updated.comparePassword(password), false);
  assert.equal(await updated.comparePassword(fresh), true);
});


test('project editing requires a verified session and CSRF and preserves protected fields', async () => {
  const Project = require('../models/Project');
  const project = await Project.create({ title: 'Original case study', category: 'Web Development', description: 'Original', image: 'https://example.com/cover.png', imagePublicId: 'private-cover-id', link: 'https://example.com' });
  try {
    const url = base + '/api/projects/' + project._id;
    const fields = { title: 'Updated case study', category: 'UI/UX Design', description: 'New description', link: 'https://example.com/new', features: JSON.stringify(['Accessible navigation']), tags: 'React, Design', isFeatured: 'true', image: 'https://evil.example/cover.png', imagePublicId: 'attacker-id', createdAt: '2000-01-01' };
    const send = headers => fetch(url, { method: 'PUT', headers: { Origin: 'http://localhost:5173', 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(fields) });
    assert.equal((await send({})).status, 401);
    const { browser } = await enroll();
    const cookie = [...browser.cookies].map(([key, value]) => key + '=' + value).join('; ');
    assert.equal((await send({ Cookie: cookie })).status, 403);
    const status = await browser.send('/status');
    const headers = { Cookie: cookie, 'X-Admin-CSRF': status.data.csrfToken };
    const response = await send(headers);
    assert.equal(response.status, 200);
    const result = (await response.json()).data;
    assert.equal(result.title, fields.title);
    assert.equal(result.image, project.image);
    assert.equal(result.imagePublicId, undefined);
    assert.equal(result.isFeatured, true);
    assert.deepEqual(result.features, ['Accessible navigation']);
    assert.equal(new Date(result.createdAt).getTime(), project.createdAt.getTime());
    fields.title = '';
    assert.equal((await send(headers)).status, 400);
    assert.equal((await Project.findById(project._id)).title, 'Updated case study');
    await Access.updateOne({ _id: user._id }, { isActive: false });
    assert.equal((await send(headers)).status, 401);
  } finally { await Project.deleteMany({}); }
});
