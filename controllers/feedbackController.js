const Feedback = require('../models/Feedback');

// @desc    Submit new feedback (Public)
// @route   POST /api/feedback
exports.submitFeedback = async (req, res) => {
  try {
    const { name, role, email, message, rating } = req.body;

    const feedback = await Feedback.create({
      name,
      role,
      email,
      message,
      rating
    });

    res.status(201).json({
      success: true,
      message: "Feedback submitted successfully. It will appear after review!",
      data: feedback
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Get all APPROVED feedback (Public)
// @route   GET /api/feedback
exports.getApprovedFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ isApproved: true }).sort('-createdAt');
    res.status(200).json({ success: true, count: feedbacks.length, data: feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get ALL feedback for Admin (Private)
// @route   GET /api/feedback/admin
exports.getAllFeedbackAdmin = async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort('-createdAt');
    res.status(200).json({ success: true, data: feedbacks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Approve/Reject Feedback (Private)
// @route   PATCH /api/feedback/:id
exports.updateFeedbackStatus = async (req, res) => {
  try {
    const feedback = await Feedback.findByIdAndUpdate(
      req.params.id, 
      { isApproved: req.body.isApproved }, 
      { new: true }
    );
    res.status(200).json({ success: true, data: feedback });
  } catch (error) {
    res.status(400).json({ success: false, message: "Update failed" });
  }
};

// @desc    Delete Feedback (Private)
// @route   DELETE /api/feedback/:id
exports.deleteFeedback = async (req, res) => {
  try {
    await Feedback.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Feedback deleted" });
  } catch (error) {
    res.status(400).json({ success: false, message: "Delete failed" });
  }
};