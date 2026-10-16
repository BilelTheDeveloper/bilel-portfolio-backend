const Access = require('../models/Access');
const { verifyToken } = require('../config/security');
const protect = async (req, res, next) => {
  try {
    const decoded = verifyToken(req.cookies?.admin_token);
    if (decoded.purpose !== 'admin') throw new Error('Invalid purpose');
    const admin = await Access.findById(decoded.id).select('_id sessionVersion');
    if (!admin || (admin.sessionVersion || 0) !== decoded.version) throw new Error('Session revoked');
    req.user = decoded;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Please sign in to continue.' }); }
};
const gateProtect = (req, res, next) => {
  try {
    if (verifyToken(req.cookies?.gate_pass).purpose !== 'gate') throw new Error('Invalid purpose');
    next();
  } catch { return res.status(401).json({ success: false, message: 'Please open the admin gate first.' }); }
};
module.exports = { protect, gateProtect };
