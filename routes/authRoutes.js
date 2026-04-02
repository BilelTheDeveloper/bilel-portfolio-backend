const express = require('express');
const router = express.Router();
const { login, getStatus, logout, checkAccess } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// 1. Pre-login access check (The "Gatekeeper")
router.post('/check-access', checkAccess);

// 2. Standard Auth Routes
router.post('/login', login);
router.get('/status', protect, getStatus); // This is what ProtectedRoute calls
router.get('/logout', logout);

module.exports = router;