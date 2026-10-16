const mongoose = require('mongoose');
const { CATEGORIES } = require('../services/projectFields');
const limitedList = (count, max) => ({ validator: items => items.length <= count && items.every(item => item.trim().length > 0 && item.length <= max), message: 'Invalid list length or item length.' });
const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, enum: CATEGORIES },
  description: { type: String, required: true, trim: true, maxlength: 500 },
  cardLabel: { type: String, trim: true, maxlength: 40, default: '' },
  imageAlt: { type: String, trim: true, maxlength: 160, default: '' },
  imagePosition: { type: String, enum: ['top', 'center', 'bottom'], default: 'center' },
  longDescription: { type: String, maxlength: 10000, default: '' },
  features: { type: [String], default: [], validate: limitedList(30, 200) },
  challenges: { type: String, maxlength: 10000, default: '' },
  solutions: { type: String, maxlength: 10000, default: '' },
  duration: { type: String, maxlength: 100, default: '' },
  imagePublicId: { type: String, select: false },
  image: { type: String, required: true },
  link: { type: String, default: '', validate: { validator: value => { if (!value) return true; try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password; } catch { return false; } }, message: 'Use a complete HTTP or HTTPS URL.' } },
  tags: { type: [String], default: [], validate: limitedList(12, 30) },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: { createdAt: false, updatedAt: true } });
module.exports = mongoose.model('Project', ProjectSchema);
