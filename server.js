const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const connectDB = require('./config/db');

// --- 1. Load Environment Variables ---
dotenv.config();

// --- 2. Connect to MongoDB ---
connectDB();

const app = express();

// --- 3. Global Middleware ---
// Increased limit to 10mb to handle project image uploads if needed
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

/**
 * 🛠️ ULTRA SECURE CORS CONFIGURATION
 * Optimized for Vercel (Frontend) and Render (Backend) communication.
 */
const allowedOrigins = [
  "http://localhost:5173",           // Local Development
  "https://bilelthedev.vercel.app",  // Your Vercel Production URL
  "https://bilel.dev"                // Your Custom Domain
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman/Mobile) or if in allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`⚠️ Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // CRITICAL: Must be true for the admin_token cookie to work
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Professional Request Logger (Only in Dev Mode)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// --- 4. API Routes ---
// Existing Routes
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// NEW: Feedback System Routes
app.use('/api/feedback', require('./routes/feedbackRoutes'));

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
});

// Handle Unhandled Promise Rejections (e.g., DB connection loss)
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Critical Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});