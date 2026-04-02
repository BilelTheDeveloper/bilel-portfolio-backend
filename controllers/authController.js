const jwt = require('jsonwebtoken');
const Access = require('../models/Access');

// @desc    Check if email has permission to access login
// @route   POST /api/auth/check-access
exports.checkAccess = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Find the admin in the Access table
    const admin = await Access.findOne({ email: email.toLowerCase() });

    if (!admin) {
      return res.status(403).json({ 
        success: false, 
        message: "Unauthorized: You do not have permission to access this area." 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Access granted. Please proceed to login." 
    });
  } catch (error) {
    console.error("Access Check Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

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
    const cookieOptions = {
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      httpOnly: true,
      secure: true,      // Must be true for HTTPS/Live sites
      sameSite: 'none',  // Must be 'none' for cross-domain cookies
      path: '/'          
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
  res.cookie('admin_token', '', {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    expires: new Date(0),
    path: '/'
  });
  
  res.status(200).json({ success: true, message: "Logged out successfully" });
};

// --- 🛡️ NEW GATE KEEPER ADDITION ---

// @desc    Verify the Secret Gate Key & Set a temporary "Gate Cookie"
// @route   POST /api/auth/verify-gate
exports.verifyGate = async (req, res) => {
  try {
    const { key } = req.body;
    
    // We use the Master Key from your .env file
    const MASTER_KEY = process.env.GATE_MASTER_KEY; 

    if (!key || key !== MASTER_KEY) {
      // We don't give the hacker any clues, just a generic 401
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // This cookie is the "Pass" that allows the Login form to show up
    const gateCookieOptions = {
      expires: new Date(Date.now() + 30 * 60 * 1000), // Valid for 30 minutes
      httpOnly: true, // 🔒 Cannot be seen by JavaScript/Console
      secure: true,   
      sameSite: 'none',
      path: '/'
    };

    res.status(200).cookie('gate_pass', 'authorized', gateCookieOptions).json({
      success: true,
      message: "Gate Opened."
    });

  } catch (error) {
    console.error("Gate Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};