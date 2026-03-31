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

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

/**
 * 🛠️ ULTRA SECURE CORS CONFIGURATION
 * This setup detects if the request comes from your local computer 
 * or your Vercel production site and allows it.
 */
const allowedOrigins = [
  "http://localhost:5173",          // Local Development
  "https://bilelthedev.vercel.app", // Your Vercel URL
  "https://bilel.dev"               // Your Custom Domain (if any)
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps) 
    // or if the origin is in our allowed list
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`⚠️ Blocked by CORS: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // MUST be true for the admin_token cookie to work
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
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));

// --- 5. Health Check & Error Handling ---
app.use('/health', (req, res) => {
  res.status(200).json({ 
    status: 'Active', 
    timestamp: new Date(),
    service: 'Bilel.dev Portfolio API',
    database: 'Connected'
  });
});

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

process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Critical Error: ${err.message}`);
  server.close(() => process.exit(1));
});