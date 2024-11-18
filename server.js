import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import rateLimit from 'express-rate-limit';
import healthRoutes from './routes/health.js';
import contentRoutes from './routes/content.js';
import { sheetsService } from './services/sheets.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// CORS configuration
const corsOptions = {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://hamza.whatsgrow.io',
      'https://contentflow-frontend.easypanel.host'
    ];

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  maxAge: 86400 // 24 hours
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(limiter);

// Force JSON content type for all responses
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Log all requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    origin: req.headers.origin,
    ip: req.ip
  });
  next();
});

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/content', contentRoutes);

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message 
  });
});

// Initialize sheets service and start server
const startServer = async () => {
  try {
    // Initialize Google Sheets service
    await sheetsService.initialize();
    logger.info('Google Sheets service initialized successfully');

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info('CORS configuration:', {
        allowedOrigins: corsOptions.origin,
        methods: corsOptions.methods,
        credentials: corsOptions.credentials
      });
    });

    // Graceful shutdown
    const gracefulShutdown = () => {
      logger.info('Received shutdown signal. Closing HTTP server...');
      server.close(() => {
        sheetsService.cleanup();
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
