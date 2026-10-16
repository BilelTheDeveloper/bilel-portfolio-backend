const Message = require('../models/Message');
exports.sendMessage = async (req, res) => {
  const { name, email, subject, message } = req.body;
  const key = req.get('Idempotency-Key');
  if (key && !/^[a-zA-Z0-9-]{16,80}$/.test(key)) return res.status(400).json({ success: false, message: 'Invalid inquiry identifier.' });
  try {
    await Message.create({ name, email, subject: subject || 'Portfolio inquiry', message, ...(key ? { idempotencyKey: key } : {}) });
  } catch (error) {
    if (!key || error.code !== 11000) throw error;
    // A retried receipt must refer to exactly the same inquiry.
    const existing = await Message.findOne({ idempotencyKey: key });
    if (!existing || existing.name !== name || existing.email !== email || existing.message !== message || existing.subject !== (subject || 'Portfolio inquiry')) return res.status(409).json({ success: false, message: 'This inquiry identifier has already been used.' });
  }
  res.status(201).json({ success: true, message: 'Your inquiry has been received.' });
};
exports.getMessages = async (req, res) => {
  const messages = await Message.find().sort({ createdAt: -1 });
  res.set('Cache-Control', 'no-store').json({ success: true, count: messages.length, data: messages });
};
exports.deleteMessage = async (req, res) => {
  const message = await Message.findByIdAndDelete(req.params.id);
  if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });
  res.json({ success: true, message: 'Message deleted.' });
};
