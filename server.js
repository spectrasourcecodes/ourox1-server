const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');

// Load environment variabless
dotenv.config();

// Import custom modules
const connectDB = require('./src/config/db');
const errorHandler = require('./src/middlewares/errorHandler');
const logger = require('./src/utils/logger');
const { initializeSocket } = require('./src/sockets');

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const depositRoutes = require('./src/routes/depositRoutes');
const withdrawalRoutes = require('./src/routes/withdrawalRoutes');
const investmentRoutes = require('./src/routes/investmentRoutes');
const kycRoutes = require('./src/routes/kycRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const marketRoutes = require('./src/routes/marketRoutes');
const referralRoutes = require('./src/routes/referralRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const proofRoutes = require('./src/routes/proofRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes')

// Import cron jobs
const startROICalculation = require('./src/jobs/roiCalculator');
const startMarketUpdater = require('./src/jobs/marketUpdater');
const startDailyBonus = require('./src/jobs/dailyBonus');


const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'https://procoin-six.vercel.app/',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Connect to database
connectDB();

// Initialize socket with all event handlers
initializeSocket(io);

// Make io globally available
global.io = io;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(compression());
app.use(morgan('combined', { 
  stream: { write: message => logger.info(message.trim()) } 
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later.',
});
app.use('/api/auth', authLimiter);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/deposits', depositRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/investments', investmentRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/proofs', proofRoutes);


// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    success: true, 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: 'Route not found' 
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Client URL: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  
  // Start cron jobs
  // Start cron jobs

  try {
    startDailyBonus(); // ✅ NEW
    logger.info('✅ Daily bonus scheduled');
  } catch (error) {
    logger.error(`Failed to start daily bonus: ${error.message}`);
  }
  
  try {
    startROICalculation();
    logger.info('✅ ROI calculator scheduled');
  } catch (error) {
    logger.error(`Failed to start ROI calculator: ${error.message}`);
  }

  try {
    startMarketUpdater();
    logger.info('✅ Market updater scheduled');
  } catch (error) {
    logger.error(`Failed to start market updater: ${error.message}`);
  }

});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  httpServer.close(() => {
    logger.info('HTTP server closed');
    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
});

module.exports = { app, io };