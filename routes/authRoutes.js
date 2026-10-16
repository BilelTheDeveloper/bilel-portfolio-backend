const router = require('express').Router();
const auth = require('../controllers/authController');
const { protect, ownerOnly, stepUp } = require('../middleware/authMiddleware');
const { validId } = require('../middleware/validation');
router.use((req, res, next) => {
  res.set({ 'Cache-Control': 'no-store, private', Pragma: 'no-cache', 'Referrer-Policy': 'no-referrer' });
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && (!req.get('origin') || req.get('X-Admin-Request') !== '1')) return res.status(403).json({ success: false, message: 'A browser security header is missing. Refresh and try again.' });
  next();
});
router.param('id', (req, res, next, id) => { req.params.id = id; validId(req, res, next); });
router.post('/login', auth.login);
router.get('/setup', auth.getSetup);
router.post('/verify', auth.verify);
router.use(protect);
router.get('/status', auth.getStatus);
router.post('/logout', auth.logout);
router.post('/logout-all', auth.logoutAll);
router.get('/sessions', auth.sessions);
router.delete('/sessions/:id', auth.revokeSession);
router.get('/events', auth.events);
router.post('/password', stepUp, auth.changePassword);
router.post('/recovery-codes', stepUp, auth.regenerateRecovery);
router.get('/accounts', ownerOnly, auth.accounts);
router.post('/accounts', ownerOnly, stepUp, auth.createAccount);
router.patch('/accounts/:id/enable', ownerOnly, stepUp, auth.enableAccount);
router.patch('/accounts/:id/disable', ownerOnly, stepUp, auth.disableAccount);
router.get('/overview', async (req, res) => {
  const [projects, reviews, pendingReviews, inquiries] = await Promise.all([
    require('../models/Project').countDocuments(), require('../models/Feedback').countDocuments(),
    require('../models/Feedback').countDocuments({ isApproved: false }), require('../models/Message').countDocuments()
  ]);
  res.json({ success: true, data: { projects, reviews, pendingReviews, inquiries } });
});
module.exports = router;
