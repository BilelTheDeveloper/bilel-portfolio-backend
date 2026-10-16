const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
process.env.NODE_ENV = 'test';
process.env.MFA_ENCRYPTION_KEY = 'a'.repeat(64);
process.env.CLOUDINARY_CLOUD_NAME = 'local-test';
process.env.SMTP_HOST = '';
const { app } = require('../server');
const { safeEqual, encryptSecret, decryptSecret, newSecret } = require('../config/security');
const Message = require('../models/Message');
const Feedback = require('../models/Feedback');
let server, base;
before(async () => {
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));
const request = (path, body, options = {}) => fetch(base + path, {
  method: body === undefined ? 'GET' : 'POST',
  ...(body === undefined ? {} : { body: JSON.stringify(body) }), ...options,
  headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173', ...options.headers }
});
test('old gate endpoints and cookies do not grant access', async () => {
  assert.equal((await request('/api/auth/verify-gate', { key: 'old-key' })).status, 403);
  assert.equal((await request('/api/auth/status', undefined, { headers: { Cookie: 'admin_token=legacy; gate_pass=authorized' } })).status, 401);
});
test('authenticator secrets are encrypted with authenticated encryption', () => {
  const secret = newSecret();
  const encrypted = encryptSecret(secret);
  assert.equal(encrypted.includes(secret), false);
  assert.equal(decryptSecret(encrypted), secret);
  const parts = encrypted.split('.');
  parts[1] = Buffer.alloc(16).toString('base64url');
  assert.throws(() => decryptSecret(parts.join('.')));
  assert.equal(safeEqual({}, 'key'), false);
  assert.equal(safeEqual('key', 'key'), true);
});
test('untrusted browser origins cannot mutate data', async () => {
  const response = await request('/api/messages', {}, { headers: { Origin: 'https://untrusted.example' } });
  assert.equal(response.status, 403);
});
test('invalid input and operator objects never reach the database', async () => {
  const response = await request('/api/messages', { name: { $ne: null }, email: 'bad', message: 'hello' });
  assert.equal(response.status, 400);
  assert.equal((await request('/api/projects/invalid-id')).status, 400);
});
test('inquiries are durably accepted when email is unconfigured', async () => {
  const original = Message.create;
  let saved;
  Message.create = async data => { saved = data; return data; };
  try {
    const response = await request('/api/messages', { name: ' Visitor ', email: 'visitor@example.technology', message: 'Hello' });
    assert.equal(response.status, 201);
    assert.equal((await response.json()).success, true);
    assert.equal(saved.name, 'Visitor');
  } finally { Message.create = original; }
});
test('public testimonials explicitly select public fields', async () => {
  const original = Feedback.find;
  let selected;
  Feedback.find = () => ({ select: fields => { selected = fields; return { sort: async () => [] }; } });
  try {
    assert.equal((await request('/api/feedback')).status, 200);
    assert.equal(selected.includes('email'), false);
    assert.match(selected, /name/);
  } finally { Feedback.find = original; }
});
test('health does not claim an unconnected database is connected', async () => {
  const response = await request('/health');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).database, 'disconnected');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});


test('duplicate inquiry receipts do not create a second message', async () => {
  const create = Message.create, findOne = Message.findOne;
  const body = { name: 'Visitor', email: 'visitor@example.com', subject: 'Project', message: 'Hello' };
  Message.create = async () => { const error = new Error('duplicate'); error.code = 11000; throw error; };
  Message.findOne = async () => body;
  try {
    const response = await request('/api/messages', body, { headers: { 'Idempotency-Key': 'local-test-inquiry-123456' } });
    assert.equal(response.status, 201);
    const conflict = await request('/api/messages', { ...body, message: 'Different message' }, { headers: { 'Idempotency-Key': 'local-test-inquiry-123456' } });
    assert.equal(conflict.status, 409);
  } finally { Message.create = create; Message.findOne = findOne; }
});

test('public submissions are rate limited', async () => {
  let response;
  for (let i = 0; i < 10; i++) response = await request('/api/feedback', {});
  assert.equal(response.status, 429);
  assert.ok(response.headers.has('ratelimit'));
});

test('notification queue records success, retry, and exhausted delivery states', async () => {
  const nodemailer = require('nodemailer');
  const { startNotifications } = require('../services/notifications');
  const originals = { transport: nodemailer.createTransport, find: Message.findOneAndUpdate, update: Message.updateOne };
  const keys = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'RECEIVER_EMAIL'];
  const environment = Object.fromEntries(keys.map(key => [key, process.env[key]]));
  keys.forEach(key => { process.env[key] = 'local-test-value'; });
  try {
    for (const scenario of [{ fail: false, attempts: 1, expected: 'sent' }, { fail: true, attempts: 2, expected: 'pending' }, { fail: true, attempts: 5, expected: 'failed' }]) {
      let resolve;
      const finished = new Promise(done => { resolve = done; });
      nodemailer.createTransport = () => ({ sendMail: async () => { if (scenario.fail) throw new Error('simulated SMTP outage'); }, close() {} });
      Message.findOneAndUpdate = async () => ({ _id: 'local', name: 'Visitor', email: 'visitor@example.com', message: 'Test', notificationAttempts: scenario.attempts });
      Message.updateOne = async (filter, change) => { resolve(change.$set); };
      const stop = startNotifications();
      try {
        const change = await finished;
        assert.equal(change.notificationStatus, scenario.expected);
        if (scenario.expected === 'pending') assert.ok(change.notificationNextAt > new Date());
      } finally { stop(); }
    }
  } finally {
    nodemailer.createTransport = originals.transport; Message.findOneAndUpdate = originals.find; Message.updateOne = originals.update;
    keys.forEach(key => { if (environment[key] === undefined) delete process.env[key]; else process.env[key] = environment[key]; });
  }
});
