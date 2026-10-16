// Disposable development preview. Never connects to MONGODB_URI or production data.
if (process.env.NODE_ENV !== 'test') throw new Error('Run this preview with NODE_ENV=test only.');
process.env.MFA_ENCRYPTION_KEY = 'd'.repeat(64);
process.env.ALLOWED_ORIGINS = 'http://127.0.0.1:5180,http://localhost:5180,http://127.0.0.1:5190';
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
  // Populated fixtures exercise long content without reading the production database.
  await require('../models/Project').create({ _id: '111111111111111111111111', title: 'Accessible Commerce Platform for Independent Businesses', category: 'Web Development', description: 'A responsive storefront and operations workspace with accessible navigation, order tracking, and clear product discovery.', image: '/BilelTheDev.webp', link: 'https://example.com', tags: ['React', 'Node.js', 'MongoDB', 'LongTechnologyNameForTesting'], features: ['Accessible checkout across phones and tablets', 'Real-time order tracking and inventory management', 'LongFeatureNameWithoutSpacesToVerifyWrappingOnNarrowDevices'], challenges: 'Keep complex product information readable across small phones, landscape screens, tablets, and large desktops. '.repeat(5), solutions: 'Use flexible grids, readable typography, wrapping content, and touch-friendly controls. '.repeat(5), longDescription: 'A complete case study of designing a storefront that adapts to its content and the available screen space.', duration: 'Twelve weeks of design and development', isFeatured: true });
  await require('../models/Feedback').create({ name: 'Alexandra Longname Example', role: 'Founder / Independent Business', email: 'preview-client@example.com', message: 'The website works beautifully on our phones and tablets. '.repeat(6), rating: 5, isApproved: true });
  await require('../models/Message').create({ name: 'A prospective client with a long name', email: 'a-long-business-contact-address@example.com', subject: 'Website redesign for an independent business with multiple locations', message: 'Please review this reference: https://example.com/' + 'long-reference-path'.repeat(15), notificationStatus: 'failed' });
  const port = Number(process.env.PREVIEW_PORT || 5000);
  const server = app.listen(port, '127.0.0.1', () => console.log(`Disposable API preview on port ${port}. Demo account: preview@example.com / Preview-only-password-2026!`));
  const stop = () => server.close(async () => { await mongoose.disconnect(); await database.stop(); process.exit(0); });
  process.on('SIGTERM', stop); process.on('SIGINT', stop);
})();
