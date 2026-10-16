const express = require('express');
const router = express.Router();
const { validateSubmission, validId } = require('../middleware/validation');
const { submissionLimiter } = require('../middleware/rateLimits');
router.param('id', (req, res, next, id) => { req.params.id = id; validId(req, res, next); });
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
  .post(submissionLimiter, validateSubmission('feedback'), submitFeedback);

// Admin Routes (Only Bilel can see all and manage them)
router.get('/admin', protect, getAllFeedbackAdmin);
router.route('/:id')
  .patch(protect, updateFeedbackStatus)
  .delete(protect, deleteFeedback);

module.exports = router;
