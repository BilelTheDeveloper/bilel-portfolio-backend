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

// Standard JSON Parser (Increases limit for potentially large project descriptions)
app.use(express.json({ limit: '10mb' }));

// Secure Cookie Parser (Crucial for reading 'admin_token' in protected routes)
app.use(cookieParser());

/**
 * CORS Configuration
 * Fixed: Updated to match your .env variable (FRONTEND_URL) 
 * and set fallback to Vite's default port (5173).
 */
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173", 
  credentials: true, // Required to allow the browser to accept secure cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Professional Request Logger (Dev Mode)
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
  });
}

// --- 4. API Routes ---

// Project Management (Handles Cloudinary via Multer middleware in routes)
app.use('/api/projects', require('./routes/projectRoutes'));

// Admin Auth (Handles Login, Status Check, and Logout)
app.use('/api/auth', require('./routes/authRoutes'));

// --- 5. Health Check & Error Handling ---

// Base Health Check (Good for monitoring)
app.use('/health', (req, res) => {
  res.status(200).json({ 
    status: 'Active', 
    timestamp: new Date(),
    service: 'Bilel.dev Portfolio API',
    database: 'Connected'
  });
});

// 404 Catch-all for API (If no route matches)
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
  🔓 CORS ORIGIN: ${process.env.FRONTEND_URL || "http://localhost:5173"}
  `);
});

// Handle Unhandled Promise Rejections (Security & Crash Prevention)
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Critical Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});