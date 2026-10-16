const express = require('express');
const router = express.Router();
const { validateSubmission, validId } = require('../middleware/validation');
const { submissionLimiter } = require('../middleware/rateLimits');
router.param('id', (req, res, next, id) => { req.params.id = id; validId(req, res, next); });

// --- Controller Imports ---
const {
  sendMessage,
  getMessages,
  updateMessage,
  deleteMessage
} = require('../controllers/messageController');

// --- Middleware Imports ---
// Ensure this points to your JWT protection middleware
const { protect } = require('../middleware/authMiddleware');

/**
 * @route   POST /api/messages
 * @desc    Public route to send a message from the contact form
 * @access  Public
 */
router.post('/', submissionLimiter, validateSubmission('message'), sendMessage);

/**
 * @route   GET /api/messages
 * @desc    Fetch all messages for the Admin Dashboard
 * @access  Private (Admin Only)
 */
router.get('/', protect, getMessages);

/**
 * @route   DELETE /api/messages/:id
 * @desc    Remove a message from the database
 * @access  Private (Admin Only)
 */
router.patch('/:id', protect, updateMessage);
router.delete('/:id', protect, deleteMessage);

module.exports = router;
