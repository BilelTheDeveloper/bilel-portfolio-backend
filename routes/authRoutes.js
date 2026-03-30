const express = require('express');
const router = express.Router();
const { login, getStatus, logout } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', login);
router.get('/status', protect, getStatus); // This is what ProtectedRoute calls
router.get('/logout', logout);

module.exports = router;