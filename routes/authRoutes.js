const express = require('express');
const router = express.Router();
// ADD verifyGate to the destructuring below:
const { login, getStatus, logout, checkAccess, verifyGate } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// --- 🛡️ NEW: Server-Side Gate Handshake ---
// This verifies the "Monster Key" and drops the secure HttpOnly cookie
router.post('/verify-gate', verifyGate);

// 1. Pre-login access check (The "Gatekeeper")
router.post('/check-access', checkAccess);

// 2. Standard Auth Routes
router.post('/login', login);
router.get('/status', protect, getStatus); // This is what ProtectedRoute calls
router.get('/logout', logout);

module.exports = router;