const jwt = require('jsonwebtoken');
const Access = require('../models/Access'); // Path to your Access model

// @desc    Login Admin & Set Cookie
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the admin in the Access table
    const admin = await Access.findOne({ email });
    
    // 2. Check if admin exists AND password matches (using the helper in your model)
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid Admin Credentials" 
      });
    }

    // 3. Create Token (using the admin ID and email)
    const token = jwt.sign(
      { id: admin._id, email: admin.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    };

    // 4. Send Cookie
    res.status(200).cookie('admin_token', token, cookieOptions).json({
      success: true,
      message: "Welcome back, Bilel.",
      user: {
        email: admin.email
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Check Auth Status (Used by AdminGuard.jsx)
// @route   GET /api/auth/status
exports.getStatus = async (req, res) => {
  try {
    // req.user is attached by your 'protect' middleware
    // We fetch fresh data from DB to ensure the email still exists
    const admin = await Access.findById(req.user.id).select('-password');

    if (!admin) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ 
      success: true, 
      isAdmin: true,
      user: {
        email: admin.email
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Status Check Failed" });
  }
};

// @desc    Logout Admin & Clear Cookie
// @route   GET /api/auth/logout
exports.logout = async (req, res) => {
  res.cookie('admin_token', 'none', {
    expires: new Date(Date.now() + 5 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ success: true, message: "Logged out successfully" });
};