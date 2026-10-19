const express = require('express');
const router = express.Router();
const { validId } = require('../middleware/validation');
router.param('id', (req, res, next, id) => { req.params.id = id; validId(req, res, next); });
const { protect } = require('../middleware/authMiddleware');
const upload = require('../middleware/multer'); // Cloudinary/Multer Middleware

const {
  createProject,
  getProjects,
  getProjectById, // NEW: Added for individual case study pages
  deleteProject
} = require('../controllers/projectController');

// --- 1. PUBLIC ROUTES ---
// Everyone sees your portfolio grid
router.get('/', getProjects);

// Everyone can view the details of a specific project
// This matches the frontend call to CONFIG.ENDPOINTS.PROJECTS + /id
router.get('/:id', getProjectById);


// --- 2. PRIVATE ROUTES (Admin Only) ---
/**
 * The order is CRITICAL:
 * 1. protect -> Verifies the active database-backed admin session and CSRF token.
 * 2. upload.single('image') -> Processes file to Cloudinary.
 * 3. createProject -> Saves final data to MongoDB.
 */
const coverUpload = (req, res, next) => upload.single('image')(req, res, error => {
  if (!error) return next();
  const tooLarge = error.code === 'LIMIT_FILE_SIZE';
  const formLimit = ['LIMIT_FIELD_COUNT', 'LIMIT_PART_COUNT', 'LIMIT_FIELD_VALUE', 'LIMIT_FIELD_KEY'].includes(error.code);
  const invalidImage = error.code === 'INVALID_IMAGE' || ['LIMIT_FILE_COUNT', 'LIMIT_UNEXPECTED_FILE'].includes(error.code);
  const message = tooLarge ? 'Choose an image smaller than 5 MB.'
    : formLimit ? 'The project form exceeds the allowed number or size of fields. Please refresh and try again.'
    : invalidImage ? 'Choose one JPG, PNG or WebP image up to 5 MB.'
    : 'Image upload failed. Please try again.';
  return res.status(tooLarge ? 413 : formLimit || invalidImage ? 400 : 502).json({ success: false, message, ...(!formLimit ? { errors: { image: message } } : {}) });
});
router.post('/', protect, coverUpload, createProject);
router.put('/:id', protect, coverUpload, createProject);

// Only Bilel can remove a project
router.delete('/:id', protect, deleteProject);

module.exports = router;
