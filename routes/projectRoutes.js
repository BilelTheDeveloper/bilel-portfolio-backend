const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer'); // You need this file!
const { 
  createProject, 
  getProjects, 
  deleteProject 
} = require('../controllers/projectController');

// --- Routes ---

// Public: Everyone sees your portfolio
router.get('/', getProjects);

/**
 * Private: Only YOU (with a token) can modify the data.
 * The order is CRITICAL:
 * 1. protect -> Checks if you are Bilel.
 * 2. upload.single('image') -> Takes the file, sends to Cloudinary, returns URL.
 * 3. createProject -> Saves that URL and text to MongoDB.
 */
router.post('/', protect, upload.single('image'), createProject);

router.delete('/:id', protect, deleteProject);

module.exports = router;