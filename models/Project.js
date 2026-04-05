const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a project title'],
    trim: true,
    maxlength: [100, 'Title cannot be more than 100 characters']
  },
  category: {
    type: String,
    required: [true, 'Please select a category'],
    enum: ['Web Development', 'Meta Ads Case Study', 'UI/UX Design', 'Digital Marketing']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [500, 'Description cannot be more than 500 characters']
  },
  longDescription: {
    type: String,
    default: '' // Used for the "Learn More" modal detail
  },
  
  // --- 🚀 NEW DETAILED FIELDS ---
  features: {
    type: [String], // Array for bullet points like ["Real-time Chat", "Secure Auth"]
    default: []
  },
  challenges: {
    type: String,
    default: ''
  },
  solutions: {
    type: String,
    default: ''
  },
  duration: {
    type: String, // e.g., "3 Months" or "Dec 2025 - Feb 2026"
    default: ''
  },
  // ------------------------------

  image: {
    type: String, // Store the Cloudinary URL here
    required: [true, 'Please upload an image mockup']
  },
  link: {
    type: String,
    match: [
      /^(https?|ftp):\/\/[^\s/$.?#].[^\s]*$/i,
      'Please use a valid URL with HTTP or HTTPS'
    ]
  },
  tags: {
    type: [String], // Array of strings like ["React", "Node.js", "Tailwind"]
    default: []
  },
  isFeatured: {
    type: Boolean,
    default: false // Use this to pin important projects to the top
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Project', ProjectSchema);