import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import config, { validateConfig } from './config/env.js';
import logger from './utils/logger.js';
import analyzeRoutes from './routes/analyze.js';
import healthRoutes from './routes/health.js';

const log = logger.child('Server');

// Validate configuration
try {
  validateConfig();
  log.info('Configuration validated');
} catch (error) {
  log.error(`Configuration error: ${error.message}`);
  process.exit(1);
}

// Create Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS configuration
// Extract origin from frontend URL (remove path, keep only domain)
const corsOrigin = (() => {
  try {
    const url = new URL(config.frontendUrl);
    return url.origin; // Returns https://domain.com without path
  } catch {
    return config.frontendUrl;
  }
})();

app.use(
  cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindow,
  max: config.rateLimitMax,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/analyze', limiter);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// Request logging
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info(`${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });

  next();
});

// ============================================
// ROUTES
// ============================================

// Health check
app.use('/api', healthRoutes);

// Analysis endpoint
app.use('/api', analyzeRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'PriceMatch AI',
    version: '2.0.0',
    description: 'Find exactly the same product at the best price across marketplaces',
    author: 'José Lugo',
    endpoints: {
      health: 'GET /api/health',
      analyze: 'POST /api/analyze',
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
    },
  });
});

// Error handler
app.use((error, req, res, next) => {
  log.error(`Unhandled error: ${error.message}`);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});

// ============================================
// SERVER START
// ============================================

const port = config.port;

const server = app.listen(port, () => {
  log.info(`🚀 PriceMatch AI Server started`);
  log.info(`📍 Listening on port ${port}`);
  log.info(`🌐 Frontend: ${config.frontendUrl}`);
  log.info(`🔧 Environment: ${config.nodeEnv}`);
  log.info(`🎯 Demo Mode: ${config.useDemo}`);
  log.info(`⏱️  Cache TTL: ${config.cacheTtl}s`);

  if (config.useDemo) {
    log.info('⚠️  DEMO MODE ENABLED - Using mock data');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  log.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    log.info('Server closed');
    process.exit(0);
  });
});

// Unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  log.error(`Unhandled Rejection at ${promise}: ${reason}`);
});

process.on('uncaughtException', (error) => {
  log.error(`Uncaught Exception: ${error.message}`);
  process.exit(1);
});

export default app;
