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
 * 1. protect -> Verifies JWT Admin Token.
 * 2. upload.single('image') -> Processes file to Cloudinary.
 * 3. createProject -> Saves final data to MongoDB.
 */
router.post('/', protect, upload.single('image'), createProject);

// Only Bilel can remove a project
router.delete('/:id', protect, deleteProject);

module.exports = router;
