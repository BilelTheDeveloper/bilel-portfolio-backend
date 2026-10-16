const router = require('express').Router();
const Settings = require('../models/SocialSettings');
const { protect } = require('../middleware/authMiddleware');
const defaults = { github: 'https://github.com/BilelTheDeveloper', linkedin: '', instagram: '', email: 'bilel.thedeveloper@gmail.com' };
const fields = Object.keys(defaults);
router.get('/', async (req, res) => {
  const saved = await Settings.findById('social').lean();
  res.set('Cache-Control', 'no-store').json({ success: true, data: Object.fromEntries(fields.map(field => [field, saved?.[field] ?? defaults[field]])) });
});
router.patch('/', protect, async (req, res) => {
  const errors = {}, values = {};
  for (const field of fields) {
    const raw = req.body?.[field];
    if (typeof raw !== 'string' || raw.trim().length > (field === 'email' ? 254 : 500)) { errors[field] = 'Please check this value.'; continue; }
    const value = raw.trim();
    values[field] = value;
    if (!value) continue;
    if (field === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.email = 'Enter a valid email address.';
    } else {
      try {
        const url = new URL(value);
        const host = field === 'github' ? 'github.com' : field === 'linkedin' ? 'linkedin.com' : 'instagram.com';
        if (url.protocol !== 'https:' || ![host, 'www.'+host].includes(url.hostname) || url.username || url.password || url.port || url.pathname === '/') throw new Error();
        values[field] = url.href;
      } catch { errors[field] = `Use a full HTTPS ${field} profile URL.`; }
    }
  }
  if (Object.keys(errors).length) return res.status(400).json({ success: false, message: 'Please correct the highlighted links.', errors });
  await Settings.findOneAndUpdate({ _id: 'social' }, { $set: values }, { upsert: true, runValidators: true });
  res.json({ success: true, data: values, message: 'Social links updated.' });
});
module.exports = router;
