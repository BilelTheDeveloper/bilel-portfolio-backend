const jwt = require('jsonwebtoken');

// @desc    Login Admin & Set Cookie
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  const { password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Invalid Admin Credentials" });
  }

  const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, {
    expiresIn: '24h'
  });

  const cookieOptions = {
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' // Changed to 'lax' for better cross-origin development support
  };

  res.status(200).cookie('admin_token', token, cookieOptions).json({
    success: true,
    message: "Welcome back, Bilel."
  });
};

// @desc    Check Auth Status (Used by ProtectedRoute.jsx)
// @route   GET /api/auth/status
exports.getStatus = async (req, res) => {
  // If the 'protect' middleware passed, it means the token is valid
  res.status(200).json({ success: true, isAdmin: true });
};

// @desc    Logout Admin & Clear Cookie
// @route   GET /api/auth/logout
exports.logout = async (req, res) => {
  res.cookie('admin_token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};