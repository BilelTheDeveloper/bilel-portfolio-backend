const mongoose = require('mongoose');
const text = (value, min, max) => typeof value === 'string' && value.trim().length >= min && value.trim().length <= max;
const email = (value) => text(value, 3, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const validateSubmission = (kind) => (req, res, next) => {
  const b = req.body || {};
  const details = kind === 'message' ? require('../services/inquiryFields').inquiryDetails(b) : null;
  if (details && Object.keys(details.errors).length) return res.status(400).json({ success: false, message: 'Please check the project details.', errors: details.errors });
  if (!text(b.name, 1, 100) || !email(b.email) || !text(b.message, 1, kind === 'feedback' ? 1000 : 5000) ||
      (kind === 'feedback' && (!text(b.role, 1, 100) || !Number.isInteger(b.rating) || b.rating < 1 || b.rating > 5)) ||
      (kind === 'message' && b.subject !== undefined && !text(b.subject, 1, 150))) {
    return res.status(400).json({ success: false, message: 'Please check the form fields and their lengths.' });
  }
  req.body = { name: b.name.trim(), email: b.email.trim().toLowerCase(), message: b.message.trim(), ...(kind === 'feedback' ? { role: b.role.trim(), rating: b.rating } : { subject: b.subject?.trim(), ...details.values }) };
  next();
};
const validId = (req, res, next) => mongoose.isObjectIdOrHexString(req.params.id) ? next() : res.status(400).json({ success: false, message: 'Invalid record ID.' });
module.exports = { validateSubmission, validId };
