import axios from 'axios';
import { MarketplaceAdapter } from './MarketplaceAdapter.js';
import config from '../config/env.js';

/**
 * SHEIN Marketplace Adapter
 * IMPORTANT: SHEIN does not have a public official API
 * This adapter is a placeholder for future implementation
 * when/if SHEIN provides official API access
 */
class SheinAdapter extends MarketplaceAdapter {
  constructor() {
    super('SHEIN', {
      enabled: config.marketplaces.shein.enabled,
      apiKey: config.marketplaces.shein.apiKey,
      apiSecret: config.marketplaces.shein.apiSecret,
      apiUrl: config.marketplaces.shein.apiUrl,
    });

    this.httpClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.timeout,
    });
  }

  /**
   * Check if SHEIN API is available
   */
  isConfigured() {
    return this.enabled && !!this.config.apiKey && !!this.config.apiSecret;
  }

  /**
   * Search for products on SHEIN
   * Placeholder for when official API becomes available
   */
  async searchProducts(query, options = {}) {
    if (!this.isConfigured()) {
      return {
        status: 'not_configured',
        message: 'SHEIN API not yet configured. Awaiting official API access.',
        results: [],
      };
    }

    try {
      this.log.info(`Searching SHEIN for: ${query}`);

      // This would use SHEIN's official API when available
      // For now, returning placeholder response
      return {
        status: 'not_available',
        message: 'SHEIN search not yet implemented',
        results: [],
      };
    } catch (error) {
      return this.handleError(error, 'searchProducts');
    }
  }

  /**
   * Get product from SHEIN URL
   */
  async getProduct(url) {
    if (!url.includes('shein')) {
      return {
        status: 'invalid_url',
        message: 'URL is not from SHEIN',
      };
    }

    try {
      this.log.info(`Fetching SHEIN product: ${url}`);

      // Parse SHEIN URL to get product ID
      const productId = this._extractProductId(url);

      if (!productId) {
        return {
          status: 'invalid_url',
          message: 'Could not extract product ID from URL',
        };
      }

      // When SHEIN API is available, use it here
      // For now, return not_available
      return {
        status: 'not_available',
        message: 'SHEIN product fetch not yet implemented',
        productId: productId,
      };
    } catch (error) {
      return this.handleError(error, 'getProduct');
    }
  }

  /**
   * Normalize product from SHEIN format
   */
  normalizeProduct(rawProduct) {
    if (!rawProduct || !this.validateProduct(rawProduct)) {
      return null;
    }

    return {
      title: rawProduct.name || rawProduct.title,
      brand: rawProduct.brand,
      model: rawProduct.model,
      sku: rawProduct.sku || rawProduct.goods_sku,
      mpn: rawProduct.mpn,
      gtin: rawProduct.gtin,
      description: rawProduct.description || rawProduct.desc,
      images: this._extractImages(rawProduct),
      price: this._parsePrice(rawProduct.price),
      currency: rawProduct.currency || 'USD',
      originalPrice: this._parsePrice(rawProduct.original_price),
      availability: this._parseAvailability(rawProduct),
      seller: 'SHEIN',
      specifications: this._extractSpecifications(rawProduct),
      dimensions: this._extractDimensions(rawProduct),
      material: rawProduct.material,
      color: rawProduct.color,
      variant: this._extractVariant(rawProduct),
      sourceUrl: rawProduct.url,
      platformName: 'SHEIN',
    };
  }

  /**
   * Extract product ID from URL
   */
  _extractProductId(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;

      // SHEIN URL patterns: /p/XXXXX or /goods/XXXXX
      const match = pathname.match(/\/(?:p|goods)\/(\d+)/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  /**
   * Extract images from product
   */
  _extractImages(product) {
    if (product.image_url) {
      return [product.image_url];
    }

    if (product.image_urls && Array.isArray(product.image_urls)) {
      return product.image_urls;
    }

    if (product.images && Array.isArray(product.images)) {
      return product.images.map((img) => img.url || img);
    }

    return [];
  }

  /**
   * Parse price
   */
  _parsePrice(price) {
    if (!price) return null;

    if (typeof price === 'number') return price;

    const parsed = parseFloat(String(price).replace(/[^\d.,-]/g, '').replace(/,/g, '.'));
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse availability
   */
  _parseAvailability(product) {
    const status = product.stock_status || product.status;

    if (status === 'IN_STOCK' || product.stock > 0) {
      return 'in_stock';
    }

    if (status === 'OUT_OF_STOCK' || product.stock === 0) {
      return 'out_of_stock';
    }

    return 'unknown';
  }

  /**
   * Extract specifications
   */
  _extractSpecifications(product) {
    const specs = {};

    if (product.specs && typeof product.specs === 'object') {
      Object.assign(specs, product.specs);
    }

    if (product.attributes && Array.isArray(product.attributes)) {
      for (const attr of product.attributes) {
        if (attr.name && attr.value) {
          specs[attr.name] = attr.value;
        }
      }
    }

    return specs;
  }

  /**
   * Extract dimensions
   */
  _extractDimensions(product) {
    const dimensions = {};

    if (product.dimensions) {
      if (product.dimensions.width) dimensions.width = parseFloat(product.dimensions.width);
      if (product.dimensions.height) dimensions.height = parseFloat(product.dimensions.height);
      if (product.dimensions.depth) dimensions.depth = parseFloat(product.dimensions.depth);
    }

    if (product.weight) {
      dimensions.weight = parseFloat(product.weight);
    }

    return Object.keys(dimensions).length > 0 ? dimensions : null;
  }

  /**
   * Extract variant information
   */
  _extractVariant(product) {
    const variant = {};

    if (product.color) variant.color = product.color;
    if (product.size) variant.size = product.size;
    if (product.quantity) variant.quantity = product.quantity;

    if (product.variants && Array.isArray(product.variants)) {
      if (product.variants.length > 0) {
        const selected = product.variants.find((v) => v.selected) || product.variants[0];
        if (selected.color) variant.color = selected.color;
        if (selected.size) variant.size = selected.size;
      }
    }

    return Object.keys(variant).length > 0 ? variant : null;
  }

  /**
   * Get marketplace status
   */
  getStatus() {
    return {
      name: this.name,
      enabled: this.enabled,
      configured: this.isConfigured(),
      status: this.isConfigured() ? 'active' : 'not_configured',
      message: this.isConfigured() ? 'Ready' : 'Awaiting API credentials',
    };
  }
}

export default new SheinAdapter();
