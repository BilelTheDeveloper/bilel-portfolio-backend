require('dotenv').config({ quiet: true });
const readline = require('node:readline');
const mongoose = require('mongoose');
const Access = require('../models/Access');

function secret(prompt) {
  return new Promise((resolve, reject) => {
    const input = process.stdin;
    let value = '';
    process.stdout.write(prompt);
    readline.emitKeypressEvents(input);
    input.setRawMode(true);
    input.resume();
    function finish(error) {
      input.removeListener('keypress', onKey);
      input.setRawMode(false);
      input.pause();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    }
    function onKey(text, key = {}) {
      if (key.ctrl && key.name === 'c') return finish(new Error('Cancelled.'));
      if (key.name === 'return' || key.name === 'enter') return finish();
      if (key.name === 'backspace') { value = Array.from(value).slice(0, -1).join(''); return; }
      if (!key.ctrl && !key.meta && text && !/[\x00-\x1f\x7f]/.test(text)) value += text;
    }
    input.on('keypress', onKey);
  });
}

async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Run this command in your own interactive terminal.');
  const email = (process.argv[2] || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Provide the owner email as the command argument.');
  const uri = new URL(process.env.MONGODB_URI);
  console.log(`Database: ${uri.hostname}${uri.pathname}\nOwner: ${email}`);
  try {
    await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    if (await Access.exists({ email })) throw new Error('This account already exists. Nothing was changed.');
    const password = await secret('New password (hidden, 16+ characters): ');
    if (password.length < 16 || Buffer.byteLength(password) > 72) throw new Error('Use at least 16 characters and at most 72 UTF-8 bytes.');
    if (password !== await secret('Repeat password (hidden): ')) throw new Error('Passwords did not match. Nothing was changed.');
    await Access.create({ email, password, role: 'owner', isActive: true });
    console.log('Owner created. Sign in at https://www.bilelthedev.website/admin and enroll Google Authenticator.');
  } finally { await mongoose.disconnect(); }
}
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
