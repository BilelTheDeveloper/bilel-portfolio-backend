const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  _id: { type: String, default: 'social' },
  github: { type: String, default: 'https://github.com/BilelTheDeveloper', maxlength: 500 },
  linkedin: { type: String, default: '', maxlength: 500 },
  instagram: { type: String, default: '', maxlength: 500 },
  email: { type: String, default: 'bilel.thedeveloper@gmail.com', maxlength: 254 },
}, { timestamps: true });
module.exports = mongoose.model('SocialSettings', schema);
