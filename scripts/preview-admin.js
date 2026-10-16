// Disposable development preview. Never connects to MONGODB_URI or production data.
if (process.env.NODE_ENV !== 'test') throw new Error('Run this preview with NODE_ENV=test only.');
process.env.MFA_ENCRYPTION_KEY = 'd'.repeat(64);
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:5180,http://localhost:5180';
process.env.CLOUDINARY_CLOUD_NAME = 'local-preview';
process.env.SMTP_HOST = '';
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const Access = require('../models/Access');
const { app } = require('../server');
(async () => {
  const database = await MongoMemoryServer.create();
  await mongoose.connect(database.getUri('disposable-admin-preview'));
  await Access.create({ email: 'preview@example.com', password: 'Preview-only-password-2026!', role: 'owner', isActive: true });
  const server = app.listen(5000, '127.0.0.1', () => console.log('Disposable API preview on port 5000. Demo account: preview@example.com / Preview-only-password-2026!'));
  const stop = () => server.close(async () => { await mongoose.disconnect(); await database.stop(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
})();
