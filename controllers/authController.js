const jwt = require('jsonwebtoken');
const Access = require('../models/Access');

// @desc    Login Admin & Set Cookie
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Find the admin in the Access table
    const admin = await Access.findOne({ email });
    
    // 2. Check credentials
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ 
        success: false, 
        message: "Invalid Admin Credentials" 
      });
    }

    // 3. Create Token
    const token = jwt.sign(
      { id: admin._id, email: admin.email }, 
      process.env.JWT_SECRET, 
      { expiresIn: '24h' }
    );

    // 4. PRODUCTION-READY COOKIE OPTIONS
    // We force secure: true and sameSite: 'none' so Vercel can talk to Render
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: true,      // Must be true for HTTPS/Live sites
      sameSite: 'none',  // Must be 'none' for cross-domain cookies
      path: '/'          // Available across the whole site
    };

    // 5. Send Response
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

// @desc    Check Auth Status (Used by ProtectedRoute.jsx)
// @route   GET /api/auth/status
exports.getStatus = async (req, res) => {
  try {
    // req.user is attached by the 'protect' middleware
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
    console.error("Status Error:", error);
    res.status(500).json({ success: false, message: "Status Check Failed" });
  }
};

// @desc    Logout Admin & Clear Cookie
// @route   GET /api/auth/logout
exports.logout = async (req, res) => {
  // Clear the cookie by setting it to empty and expiring it immediately
  res.cookie('admin_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0),
    path: '/'
  });
  
  res.status(200).json({ success: true, message: "Logged out successfully" });
};