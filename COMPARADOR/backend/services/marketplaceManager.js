import logger from '../utils/logger.js';
import sheinAdapter from '../marketplaces/shein.js';
import aliexpressAdapter from '../marketplaces/aliexpress.js';
import temuAdapter from '../marketplaces/temu.js';

/**
 * Marketplace Manager
 * Orchestrates search and product fetching across all marketplaces
 */
class MarketplaceManager {
  constructor() {
    this.log = logger.child('MarketplaceManager');
    this.adapters = {
      SHEIN: sheinAdapter,
      AliExpress: aliexpressAdapter,
      Temu: temuAdapter,
    };
  }

  /**
   * Search all enabled marketplaces for a product
   */
  async searchAllMarketplaces(originalProduct, options = {}) {
    this.log.info('Starting multi-marketplace search');

    const results = {
      SHEIN: null,
      AliExpress: null,
      Temu: null,
      timestamp: new Date().toISOString(),
    };

    const queries = this._generateSearchQueries(originalProduct);

    // Search all marketplaces in parallel
    const promises = Object.entries(this.adapters).map(([name, adapter]) =>
      this._searchMarketplace(adapter, queries, name, options).then((result) => {
        results[name] = result;
      })
    );

    await Promise.allSettled(promises);

    return results;
  }

  /**
   * Search a single marketplace
   */
  async _searchMarketplace(adapter, queries, name, options) {
    if (!adapter.isConfigured()) {
      return {
        status: 'not_configured',
        marketplace: name,
        message: `${name} not configured`,
        candidates: [],
      };
    }

    try {
      this.log.info(`Searching ${name} with ${queries.length} queries`);

      const candidates = [];

      // Try each query until we get results
      for (const query of queries) {
        try {
          const result = await adapter.searchProducts(query, {
            limit: options.limit || 10,
            timeout: options.timeout || 15000,
          });

          if (result.results && result.results.length > 0) {
            candidates.push(...result.results);

            // Stop after first successful query returns results
            if (candidates.length >= 3) {
              break;
            }
          }
        } catch (error) {
          this.log.debug(`Query "${query}" failed for ${name}: ${error.message}`);
        }
      }

      return {
        status: candidates.length > 0 ? 'success' : 'no_results',
        marketplace: name,
        candidates: candidates.slice(0, 10), // Limit to 10 candidates
        queriesAttempted: queries.length,
      };
    } catch (error) {
      this.log.error(`Search failed for ${name}: ${error.message}`);
      return {
        status: 'error',
        marketplace: name,
        message: error.message,
        candidates: [],
      };
    }
  }

  /**
   * Generate multiple search queries from product
   */
  _generateSearchQueries(product) {
    const queries = new Set();

    // Query 1: Brand + Model
    if (product.brand && product.model) {
      queries.add(`${product.brand} ${product.model}`);
    }

    // Query 2: Brand + SKU
    if (product.brand && product.sku) {
      queries.add(`${product.brand} ${product.sku}`);
    }

    // Query 3: Model alone
    if (product.model) {
      queries.add(product.model);
    }

    // Query 4: SKU alone
    if (product.sku) {
      queries.add(product.sku);
    }

    // Query 5: GTIN/EAN
    if (product.gtin) {
      queries.add(product.gtin);
    }

    if (product.ean && product.ean !== product.gtin) {
      queries.add(product.ean);
    }

    // Query 6: Brand + Title
    if (product.brand && product.title) {
      const titleShort = product.title.substring(0, 50);
      queries.add(`${product.brand} ${titleShort}`);
    }

    // Query 7: MPN
    if (product.mpn) {
      queries.add(product.mpn);
    }

    // Query 8: Full title (first 60 chars)
    if (product.title) {
      queries.add(product.title.substring(0, 60));
    }

    // Remove empty queries and filter
    const filtered = Array.from(queries)
      .filter((q) => q && q.trim().length > 2)
      .slice(0, 8); // Limit to 8 queries

    return filtered;
  }

  /**
   * Get product from a specific marketplace URL
   */
  async getProductFromMarketplace(url) {
    for (const [name, adapter] of Object.entries(this.adapters)) {
      if (url.includes(name.toLowerCase()) || url.includes(adapter.name.toLowerCase())) {
        if (!adapter.isConfigured()) {
          return {
            status: 'not_configured',
            message: `${name} not configured`,
          };
        }

        try {
          return await adapter.getProduct(url);
        } catch (error) {
          return adapter.handleError(error, 'getProduct');
        }
      }
    }

    return {
      status: 'unknown_marketplace',
      message: 'URL is not from a supported marketplace',
    };
  }

  /**
   * Get status of all marketplaces
   */
  getStatus() {
    const status = {
      marketplaces: {},
      timestamp: new Date().toISOString(),
    };

    for (const [name, adapter] of Object.entries(this.adapters)) {
      status.marketplaces[name] = adapter.getStatus();
    }

    return status;
  }

  /**
   * Get enabled marketplaces
   */
  getEnabledMarketplaces() {
    return Object.values(this.adapters)
      .filter((adapter) => adapter.enabled)
      .map((adapter) => adapter.name);
  }

  /**
   * Normalize all candidate products
   */
  normalizeAllCandidates(searchResults) {
    const normalized = {};

    for (const [marketplace, result] of Object.entries(searchResults)) {
      if (result && result.candidates && result.candidates.length > 0) {
        const adapter = this.adapters[marketplace];

        normalized[marketplace] = result.candidates
          .map((candidate) => {
            try {
              return adapter.normalizeProduct(candidate);
            } catch (error) {
              this.log.error(`Failed to normalize candidate from ${marketplace}: ${error.message}`);
              return null;
            }
          })
          .filter((product) => product !== null)
          .slice(0, 5); // Keep top 5 per marketplace
      } else {
        normalized[marketplace] = [];
      }
    }

    return normalized;
  }
}

export default new MarketplaceManager();
