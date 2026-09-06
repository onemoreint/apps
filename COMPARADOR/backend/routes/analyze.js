import express from 'express';
import productExtractor from '../services/productExtractor.js';
import productNormalizer from '../services/productNormalizer.js';
import fingerprintGenerator from '../services/fingerprint.js';
import matchingEngine from '../services/matchingEngine.js';
import priceCalculator from '../services/priceCalculator.js';
import marketplaceManager from '../services/marketplaceManager.js';
import cache from '../utils/cache.js';
import logger from '../utils/logger.js';
import { validateUrl, analyzeRequestSchema } from '../utils/validation.js';
import config from '../config/env.js';

const router = express.Router();
const log = logger.child('Routes:Analyze');

/**
 * POST /api/analyze
 * Main analysis endpoint
 * Analyzes a product URL and searches for it on marketplaces
 */
router.post('/analyze', async (req, res) => {
  try {
    const { url } = req.body;

    // Validate input
    if (!url) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'URL is required',
        },
      });
    }

    // Validate URL format
    try {
      validateUrl(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_URL',
          message: error.message,
        },
      });
    }

    log.info(`Analysis request for: ${url}`);

    // Check cache first
    const cacheKey = `analyze:${url}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      log.info('Returning cached result');
      return res.json({
        success: true,
        ...cached,
        cached: true,
      });
    }

    // If demo mode is enabled, return demo data
    if (config.useDemo) {
      return handleDemoAnalysis(res);
    }

    // Extract product information from URL
    log.info('Extracting product from URL');
    let originalProduct;
    try {
      originalProduct = await productExtractor.extractFromUrl(url);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'EXTRACTION_FAILED',
          message: 'Could not extract product information from URL',
          details: error.message,
        },
      });
    }

    // Normalize extracted product
    log.info('Normalizing product data');
    const normalizedOriginal = productNormalizer.normalize(originalProduct);

    // Generate fingerprint for identification
    log.info('Generating product fingerprint');
    const originalFingerprint = fingerprintGenerator.generateFingerprint(normalizedOriginal);

    // Search on all marketplaces
    log.info('Searching marketplaces');
    const searchResults = await marketplaceManager.searchAllMarketplaces(normalizedOriginal);

    // Normalize all candidate products
    const normalizedCandidates = marketplaceManager.normalizeAllCandidates(searchResults);

    // Compare and match products
    const matches = {};
    const rejectedCandidates = {};

    for (const [marketplace, candidates] of Object.entries(normalizedCandidates)) {
      matches[marketplace] = [];
      rejectedCandidates[marketplace] = [];

      for (const candidate of candidates) {
        // Generate fingerprint for candidate
        const candidateFingerprint = fingerprintGenerator.generateFingerprint(candidate);

        // Calculate match score
        const matchResult = matchingEngine.calculateExactMatch(
          normalizedOriginal,
          candidate,
          {
            original: originalFingerprint,
            candidate: candidateFingerprint,
          }
        );

        if (matchResult.status === 'rejected') {
          rejectedCandidates[marketplace].push({
            product: candidate,
            matchResult,
          });
        } else {
          matches[marketplace].push({
            product: candidate,
            matchResult,
          });
        }
      }

      // Sort by match score descending
      matches[marketplace].sort((a, b) => b.matchResult.score - a.matchResult.score);
    }

    // Select best matches
    const bestMatches = {};
    let overallWinner = null;
    let lowestPrice = Infinity;

    for (const [marketplace, matchList] of Object.entries(matches)) {
      if (matchList.length > 0) {
        const best = matchList[0];
        bestMatches[marketplace] = best;

        // Calculate price and find winner
        const priceData = priceCalculator.getPriceInDefaultCurrency(best.product, config.defaultCurrency);
        const totalPrice = priceData.amount;

        if (best.matchResult.status === 'exact' && totalPrice < lowestPrice) {
          lowestPrice = totalPrice;
          overallWinner = {
            marketplace,
            product: best.product,
            matchResult: best.matchResult,
            price: totalPrice,
          };
        }
      }
    }

    // Build response
    const response = {
      success: true,
      originalProduct: normalizedOriginal,
      originalFingerprint: {
        critical: originalFingerprint.critical,
        high: originalFingerprint.high,
        level_summary: Object.keys(originalFingerprint.critical).length + Object.keys(originalFingerprint.high).length,
      },
      matches: bestMatches,
      matchedCount: Object.values(bestMatches).length,
      bestMatch: overallWinner,
      rejectedCandidatesCount: Object.values(rejectedCandidates).reduce((sum, arr) => sum + arr.length, 0),
      timestamp: new Date().toISOString(),
      mode: 'real',
    };

    // Cache the result
    cache.set(cacheKey, response, config.cacheTtl);

    res.json(response);
  } catch (error) {
    log.error(`Unexpected error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    });
  }
});

/**
 * Handle demo analysis
 */
async function handleDemoAnalysis(res) {
  // Demo product
  const demoProduct = {
    title: 'Organizador de cocina metálico de 3 niveles',
    brand: 'KitchenPro',
    model: 'KP-3000',
    sku: 'KP-3000-BLK-STD',
    gtin: '8437012345678',
    color: 'Negro',
    dimensions: { width: 40, height: 60, depth: 20, weight: 8.5 },
    specifications: { material: 'Acero + Vidrio', finish: 'Negro mate' },
    variant: { color: 'Negro', levels: 3 },
    price: 89.99,
    currency: 'USD',
    sourceUrl: 'https://example.com/producto',
    platformName: 'Demo',
  };

  const response = {
    success: true,
    originalProduct: demoProduct,
    matches: {
      SHEIN: {
        product: { ...demoProduct, price: 45.99, seller: 'SHEIN', shipping: 3.5 },
        matchResult: { score: 99, status: 'exact' },
      },
      AliExpress: {
        product: { ...demoProduct, price: 52.75, seller: 'AliExpress', shipping: 8.0 },
        matchResult: { score: 98, status: 'exact' },
      },
      Temu: {
        product: { ...demoProduct, price: 38.99, seller: 'Temu', shipping: 2.99 },
        matchResult: { score: 94, status: 'probable' },
      },
    },
    matchedCount: 3,
    bestMatch: {
      marketplace: 'Temu',
      product: { ...demoProduct, price: 38.99, seller: 'Temu', shipping: 2.99 },
      matchResult: { score: 94, status: 'probable' },
      price: 41.98,
    },
    timestamp: new Date().toISOString(),
    mode: 'demo',
  };

  res.json(response);
}

export default router;
