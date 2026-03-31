const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token;

  // 1. Extract the secure cookie
  token = req.cookies.admin_token;

  // 2. If no token exists, deny access immediately
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Access Denied: Admin authentication required." 
    });
  }

  try {
    // 3. Verify the token using your JWT_SECRET
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    /**
     * 4. Attach decoded info to req.user
     * This matches the 'id' we signed in the login controller:
     * jwt.sign({ id: admin._id, email: admin.email }, ...)
     */
    req.user = decoded;
    
    next();
  } catch (error) {
    // 4. Handle expired or tampered tokens
    res.status(401).json({ 
      success: false, 
      message: "Token expired or invalid." 
    });
  }
};

module.exports = { protect };