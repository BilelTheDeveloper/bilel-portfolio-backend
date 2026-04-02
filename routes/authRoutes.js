const express = require('express');
const router = express.Router();

// 1. Import all controller functions including new Gate logic
const { 
  login, 
  getStatus, 
  logout, 
  checkAccess, 
  verifyGate, 
  getGateStatus 
} = require('../controllers/authController');

// 2. Import both protectors from middleware
const { protect, gateProtect } = require('../middleware/authMiddleware');

// --- 🛡️ GATE HANDSHAKE ROUTES ---

/**
 * @desc Verify the "Monster Key" and drop the secure HttpOnly gate_pass cookie
 */
router.post('/verify-gate', verifyGate);

/**
 * @desc Let the frontend check if the gate is currently open (for UI logic)
 */
router.get('/gate-status', getGateStatus);


// --- 🔐 PROTECTED LOGIN PROCESS ---

/**
 * 🛡️ gateProtect is applied here. 
 * Even if they know the email, they can't check access without the Gate Cookie.
 */
router.post('/check-access', gateProtect, checkAccess);

/**
 * 🛡️ gateProtect is applied here. 
 * Even if they know the password, they can't login without the Gate Cookie.
 */
router.post('/login', gateProtect, login);


// --- 🏛️ DASHBOARD & SESSION ROUTES ---

/**
 * @desc Check if the admin is fully logged in (Used by ProtectedRoute.jsx)
 */
router.get('/status', protect, getStatus);

/**
 * @desc Clear all cookies and end the session
 */
router.get('/logout', logout);

module.exports = router;