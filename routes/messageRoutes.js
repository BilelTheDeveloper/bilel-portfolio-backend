const express = require('express');
const router = express.Router();

// --- Controller Imports ---
const { 
  sendMessage, 
  getMessages, 
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
router.post('/', sendMessage);

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
router.delete('/:id', protect, deleteMessage);

module.exports = router;