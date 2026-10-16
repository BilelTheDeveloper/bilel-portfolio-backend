const Message = require('../models/Message');
const { DETAIL_FIELDS } = require('../services/inquiryFields');
exports.sendMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;
  const details = Object.fromEntries(DETAIL_FIELDS.map(field => [field, req.body[field] || '']));
  const key = req.get('Idempotency-Key');
  if (key && !/^[a-zA-Z0-9-]{16,80}$/.test(key)) return res.status(400).json({ success: false, message: 'Invalid inquiry identifier.' });
  let saved;
  try {
    saved = await Message.create({ name, email, subject: subject || 'Portfolio inquiry', message, ...details, ...(key ? { idempotencyKey: key } : {}) });
  } catch (error) {
    if (!key || error.code !== 11000) throw error;
    const existing = await Message.findOne({ idempotencyKey: key });
    if (!existing || existing.name !== name || existing.email !== email || existing.message !== message || existing.subject !== (subject || 'Portfolio inquiry') || DETAIL_FIELDS.some(field => (existing[field] || '') !== details[field])) return res.status(409).json({ success: false, message: 'This inquiry identifier has already been used.' });
    saved = existing;
  }
  res.status(201).json({ success: true, message: 'Your inquiry has been received.', reference: saved._id ? String(saved._id).slice(-8).toUpperCase() : undefined });
};
exports.getMessages = async (req, res) => {
  const messages = await Message.find().select('-idempotencyKey -notificationLeaseAt').sort({ createdAt: -1 });
  res.set('Cache-Control', 'no-store').json({ success: true, count: messages.length, data: messages });
};
exports.updateMessage = async (req, res) => {
  if (!['new', 'reviewing', 'contacted', 'archived'].includes(req.body?.status)) return res.status(400).json({ success: false, message: 'Choose a valid inquiry status.' });
  const message = await Message.findByIdAndUpdate(req.params.id, { $set: { status: req.body.status } }, { returnDocument: 'after', runValidators: true }).select('-idempotencyKey -notificationLeaseAt');
  if (!message) return res.status(404).json({ success: false, message: 'Inquiry not found.' });
  res.json({ success: true, data: message });
};
exports.deleteMessage = async (req, res) => {
  const message = await Message.findByIdAndDelete(req.params.id);
  if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });
  res.json({ success: true, message: 'Message deleted.' });
};
