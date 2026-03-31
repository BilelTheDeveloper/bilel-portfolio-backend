const jwt = require('jsonwebtoken');

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

module.exports = { protect };