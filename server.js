const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const https = require('https');
const http = require('http');
const connectDB = require('./config/db');

// --- 1. Load Environment Variables ---
dotenv.config();

// --- 2. Connect to MongoDB ---
connectDB();

const app = express();

// --- 3. Global Middleware ---
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

/**
 * CORS CONFIGURATION
 */
const allowedOrigins = [
  "http://localhost:5173",
  "https://bilelthedev.vercel.app",
  "https://bilel.dev"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`⚠️ Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request Logger (Dev only)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// --- 4. API Routes ---
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/feedback', require('./routes/feedbackRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));

// --- 5. Health Check & Error Handling ---
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'Active',
    timestamp: new Date(),
    service: 'Bilel.dev Portfolio API',
    database: 'Connected',
    environment: process.env.NODE_ENV || 'development'
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: "API endpoint not found" });
});

// --- 6. Start Server ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
  🚀 SERVER STATUS: ACTIVE
  🌍 ENVIRONMENT: ${process.env.NODE_ENV || 'development'}
  📡 PORT: ${PORT}
  🔗 API BASE: http://localhost:${PORT}/api
  🔓 ACTIVE ORIGINS: ${allowedOrigins.join(', ')}
  `);

  // Start keep-alive pinger after server is ready
  startKeepAlive();
});

// --- 7. KEEP-ALIVE PINGER ---
// Render free plan shuts down after ~15 minutes of inactivity.
// This pings our own /health endpoint every 10 minutes to keep it awake.
function startKeepAlive() {
  // Only run in production (no need to ping in local dev)
  if (process.env.NODE_ENV !== 'production') {
    console.log('  ⏸️  Keep-alive disabled in development mode.');
    return;
  }

  // Get the server URL from env, fallback to a constructed one
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  const PING_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

  const ping = () => {
    const url = `${SELF_URL}/health`;
    const lib = url.startsWith('https') ? https : http;

    const req = lib.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log(`  💓 Keep-alive ping OK — [${new Date().toLocaleTimeString()}]`);
      } else {
        console.warn(`  ⚠️  Keep-alive ping got status ${res.statusCode}`);
      }
      // Drain the response to free memory
      res.resume();
    });

    req.on('error', (err) => {
      console.warn(`  ⚠️  Keep-alive ping failed: ${err.message}`);
    });

    // Safety timeout so the request never hangs
    req.setTimeout(10000, () => {
      req.destroy();
      console.warn('  ⚠️  Keep-alive ping timed out.');
    });
  };

  // First ping after 1 minute (let server fully stabilise first)
  setTimeout(() => {
    ping();
    // Then ping every 10 minutes
    setInterval(ping, PING_INTERVAL_MS);
  }, 60 * 1000);

  console.log(`  💓 Keep-alive active — pinging ${SELF_URL}/health every 10 min`);
}

// --- 8. Handle Unhandled Promise Rejections ---
process.on('unhandledRejection', (err) => {
  console.log(`❌ Critical Error: ${err.message}`);
  server.close(() => process.exit(1));
});