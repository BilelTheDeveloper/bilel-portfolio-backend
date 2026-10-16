const { rateLimit } = require('express-rate-limit');
const options = { standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many attempts. Please try again later.' } };
exports.authLimiter = rateLimit({ ...options, windowMs: 15 * 60 * 1000, limit: 20 });
exports.submissionLimiter = rateLimit({ ...options, windowMs: 15 * 60 * 1000, limit: 8 });
