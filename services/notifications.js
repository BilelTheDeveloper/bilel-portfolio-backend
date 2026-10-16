const nodemailer = require('nodemailer');
const Message = require('../models/Message');
const configured = () => ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'RECEIVER_EMAIL'].every(key => process.env[key]);
function startNotifications() {
  if (!configured()) return () => {};
  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', requireTLS: process.env.SMTP_PORT !== '465', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, disableFileAccess: true, disableUrlAccess: true });
  let busy = false;
  async function run() {
    if (busy) return;
    busy = true;
    try {
      // A lease allows another process to retry work interrupted by a restart.
      const now = new Date();
      const message = await Message.findOneAndUpdate({ notificationAttempts: { $lt: 5 }, $or: [
        { notificationStatus: 'pending', notificationNextAt: { $lte: now } },
        { notificationStatus: 'sending', notificationLeaseAt: { $lt: new Date(Date.now() - 5 * 60000) } }
      ] }, { $set: { notificationStatus: 'sending', notificationLeaseAt: now }, $inc: { notificationAttempts: 1 } }, { returnDocument: 'after', sort: { createdAt: 1 } });
      if (!message) return;
      try {
        await transport.sendMail({ from: process.env.SMTP_FROM, to: process.env.RECEIVER_EMAIL, replyTo: message.email,
          messageId: `<${message._id}@bilel.dev>`, subject: `Portfolio inquiry: ${message.subject || 'New message'}`,
          text: `From: ${message.name} <${message.email}>\n\n${message.message}` });
        await Message.updateOne({ _id: message._id }, { $set: { notificationStatus: 'sent' } });
      } catch {
        await Message.updateOne({ _id: message._id }, { $set: { notificationStatus: message.notificationAttempts >= 5 ? 'failed' : 'pending', notificationNextAt: new Date(Date.now() + Math.min(3600000, 30000 * 2 ** message.notificationAttempts)) } });
        console.error('Email notification deferred; inquiry remains available in the dashboard.');
      }
    } catch { console.error('Notification worker unavailable; will retry.'); }
    finally { busy = false; }
  }
  const interval = setInterval(run, 30000);
  interval.unref();
  void run();
  return () => { clearInterval(interval); transport.close(); };
}
module.exports = { startNotifications };
