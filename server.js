const express = require('express');
require('dotenv').config();
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const { authLimiter } = require('./middleware/rateLimits');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 0));
app.use(helmet());
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,https://bilelthedev.website,https://www.bilelthedev.website,https://bilel-portfolio-frontend.vercel.app').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)), credentials: true, methods: ['GET', 'POST', 'DELETE', 'PATCH', 'OPTIONS'] }));
// Cross-site cookies require explicit origin checks for every browser mutation.
app.use((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    if ((origin && !allowedOrigins.includes(origin)) || (req.get('sec-fetch-site') && !origin)) {
      return res.status(403).json({ success: false, message: 'Request origin is not allowed.' });
    }
  }
  next();
});
app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());
app.use('/api/auth', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/auth', (req, res, next) => ['POST'].includes(req.method) && req.path !== '/logout' ? authLimiter(req, res, next) : next(), require('./routes/authRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.get('/health', (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ status: connected ? 'healthy' : 'unavailable', database: connected ? 'connected' : 'disconnected' });
});
app.use((req, res) => res.status(404).json({ success: false, message: 'API endpoint not found.' }));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.code === 'LIMIT_FILE_SIZE' ? 413 : err.status || (['ValidationError', 'CastError', 'MulterError'].includes(err.name) ? 400 : 500);
  console.error('Request failed:', err.name || 'Error');
  res.status(status).json({ success: false, message: status === 413 ? 'The image must be smaller than 5 MB.' : status < 500 ? 'Please check your request.' : 'Something went wrong. Please try again later.' });
});
async function start() {
  require('./config/security').key();
  await connectDB();
  await Promise.all([require('./models/Access').init(), require('./models/AdminSession').init(), require('./models/AuthChallenge').init(), require('./models/SecurityEvent').init()]);
  const stopNotifications = require('./services/notifications').startNotifications();
  const server = app.listen(process.env.PORT || 5000, () => console.log('Portfolio API ready.'));
  const shutdown = () => { stopNotifications(); server.close(async () => { await mongoose.disconnect(); process.exit(0); }); };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
  return server;
}
if (require.main === module) start().catch(err => { console.error(err.message); process.exit(1); });
module.exports = { app, start };
