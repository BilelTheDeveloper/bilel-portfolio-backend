const jwt = require('jsonwebtoken');

/**
 * 🛡️ PROTECT: Dashboard Guard
 * Ensures the user is fully logged in with a valid admin_token
 */
const protect = async (req, res, next) => {
  // 1. Check if cookies even exist (prevents crashes)
  if (!req.cookies) {
    console.error("❌ ERROR: Cookie-parser is not initialized in server.js");
    return res.status(500).json({ success: false, message: "Server Configuration Error" });
  }

  const token = req.cookies.admin_token;

  if (!token) {
    // This log helps you see if the browser actually sent the cookie
    console.warn(`[${new Date().toLocaleTimeString()}] 🔐 Unauthorized attempt from: ${req.headers.origin}`);
    return res.status(401).json({ 
      success: false, 
      message: "Access Denied: Admin authentication required." 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error("❌ Token Verification Failed:", error.message);
    res.status(401).json({ 
      success: false, 
      message: "Token expired or invalid." 
    });
  }
};

/**
 * 🛡️ GATE PROTECT: Login Guard
 * Ensures the user has the 'gate_pass' cookie before they can even TRY to login.
 * This stops hackers from bypassing the secret gate URL.
 */
const gateProtect = (req, res, next) => {
  // 1. Safety check for cookies
  if (!req.cookies) {
    return res.status(500).json({ success: false, message: "Server Configuration Error" });
  }

  const gatePass = req.cookies.gate_pass;

  if (gatePass !== 'authorized') {
    console.warn(`[${new Date().toLocaleTimeString()}] 🚫 Gate Bypass Attempt Blocked.`);
    return res.status(401).json({ 
      success: false, 
      message: "Gate is locked. Please enter through the official entry point." 
    });
  }

  // If cookie exists and is correct, let them through to the next function
  next();
};

module.exports = { protect, gateProtect };