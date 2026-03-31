const express = require('express');
const router = express.Router();
const { 
  submitFeedback, 
  getApprovedFeedback, 
  getAllFeedbackAdmin, 
  updateFeedbackStatus, 
  deleteFeedback 
} = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');

// Public Routes (Anyone can see approved reviews and leave a new one)
router.route('/')
  .get(getApprovedFeedback)
  .post(submitFeedback);

// Admin Routes (Only Bilel can see all and manage them)
router.get('/admin', protect, getAllFeedbackAdmin);
router.route('/:id')
  .patch(protect, updateFeedbackStatus)
  .delete(protect, deleteFeedback);

module.exports = router;