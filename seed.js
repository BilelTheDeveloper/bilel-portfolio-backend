require('dotenv').config();
const mongoose = require('mongoose');
const Access = require('./models/Access');
async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !password || (password.length < 16 || Buffer.byteLength(password) > 72)) throw new Error('Set ADMIN_EMAIL and an ADMIN_PASSWORD of at least 16 characters.');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    if (await Access.exists({ email })) throw new Error('This administrator already exists. No account was changed.');
    await Access.create({ email, password, role: 'owner', isActive: true });
    console.log('Administrator created. Remove ADMIN_PASSWORD from the environment after setup.');
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) seedAdmin().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { seedAdmin };
