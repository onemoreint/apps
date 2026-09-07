import express from 'express';
import marketplaceManager from '../services/marketplaceManager.js';
import config from '../config/env.js';
import cache from '../utils/cache.js';

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  const marketplaceStatus = marketplaceManager.getStatus();

  res.json({
    status: 'ok',
    environment: config.nodeEnv,
    demo: config.useDemo,
    port: config.port,
    cache: cache.stats(),
    marketplaces: marketplaceStatus.marketplaces,
    timestamp: new Date().toISOString(),
  });
});

export default router;
