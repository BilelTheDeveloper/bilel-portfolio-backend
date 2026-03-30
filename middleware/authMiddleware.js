const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;

  // Check for token in cookies (Highly Secure)
  token = req.cookies.admin_token;

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Access Denied: Admin authentication required." 
    });
  }

  try {
    // Verify token using your Secret Key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach admin info to the request object
    req.admin = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: "Token expired or invalid." });
  }
};

module.exports = { protect };