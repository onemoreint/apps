import logger from '../utils/logger.js';

/**
 * Base Marketplace Adapter
 * All marketplace implementations extend this class
 */
export class MarketplaceAdapter {
  constructor(name, config = {}) {
    this.name = name;
    this.enabled = config.enabled || false;
    this.config = config;
    this.log = logger.child(`Marketplace:${name}`);
    this.timeout = 15000;
    this.maxRetries = 2;
  }

  /**
   * Search for products
   * Must be implemented by subclasses
   */
  async searchProducts(query, options = {}) {
    throw new Error(`searchProducts not implemented for ${this.name}`);
  }

  /**
   * Get product details from URL
   * Must be implemented by subclasses
   */
  async getProduct(url) {
    throw new Error(`getProduct not implemented for ${this.name}`);
  }

  /**
   * Normalize product from this marketplace
   * Must be implemented by subclasses
   */
  normalizeProduct(product) {
    throw new Error(`normalizeProduct not implemented for ${this.name}`);
  }

  /**
   * Generate search queries from product
   * Subclasses can override for custom query generation
   */
  generateSearchQueries(product) {
    const queries = [];

    // Query 1: Brand + Model
    if (product.brand && product.model) {
      queries.push(`${product.brand} ${product.model}`);
    }

    // Query 2: SKU or MPN
    if (product.sku) {
      queries.push(product.sku);
    }
    if (product.mpn) {
      queries.push(product.mpn);
    }

    // Query 3: Title (first 50 chars)
    if (product.title) {
      const titleQuery = product.title.substring(0, 50);
      queries.push(titleQuery);
    }

    // Query 4: GTIN
    if (product.gtin) {
      queries.push(product.gtin);
    }

    // Query 5: Brand only
    if (product.brand) {
      queries.push(product.brand);
    }

    return [...new Set(queries.filter((q) => q && q.length > 2))]; // Remove duplicates
  }

  /**
   * Check if marketplace is properly configured
   */
  isConfigured() {
    return this.enabled;
  }

  /**
   * Validate product before returning
   */
  validateProduct(product) {
    const required = ['title', 'price'];
    for (const field of required) {
      if (!product[field]) {
        return false;
      }
    }
    return true;
  }

  /**
   * Common error handler
   */
  handleError(error, context) {
    this.log.error(`Error in ${context}: ${error.message}`);

    if (error.response?.status === 404) {
      return {
        status: 'not_found',
        message: 'Product not found on this marketplace',
      };
    }

    if (error.response?.status === 429) {
      return {
        status: 'rate_limited',
        message: 'Too many requests. Please try again later.',
      };
    }

    if (error.code === 'ECONNABORTED') {
      return {
        status: 'timeout',
        message: 'Request timeout. Marketplace not responding.',
      };
    }

    return {
      status: 'error',
      message: 'Unable to fetch from marketplace',
    };
  }

  /**
   * Retry logic for API calls
   */
  async retryRequest(fn, retries = this.maxRetries) {
    let lastError;

    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          // Exponential backoff
          const delay = Math.pow(2, i) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Get status of this marketplace
   */
  getStatus() {
    return {
      name: this.name,
      enabled: this.enabled,
      configured: this.isConfigured(),
      status: this.enabled ? 'active' : 'disabled',
    };
  }
}

export default MarketplaceAdapter;
