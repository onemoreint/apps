import axios from 'axios';
import { MarketplaceAdapter } from './MarketplaceAdapter.js';
import config from '../config/env.js';

/**
 * AliExpress Marketplace Adapter
 * AliExpress has limited official API access
 * This adapter supports:
 * - Official AliExpress API (when credentials available)
 * - Third-party API services (RapidAPI, etc.)
 */
class AliExpressAdapter extends MarketplaceAdapter {
  constructor() {
    super('AliExpress', {
      enabled: config.marketplaces.aliexpress.enabled,
      appKey: config.marketplaces.aliexpress.appKey,
      appSecret: config.marketplaces.aliexpress.appSecret,
      apiUrl: config.marketplaces.aliexpress.apiUrl,
    });

    this.httpClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.timeout,
    });
  }

  /**
   * Check if AliExpress API is available
   */
  isConfigured() {
    return this.enabled && !!this.config.appKey && !!this.config.appSecret;
  }

  /**
   * Search for products on AliExpress
   */
  async searchProducts(query, options = {}) {
    if (!this.isConfigured()) {
      return {
        status: 'not_configured',
        message: 'AliExpress API credentials not configured',
        results: [],
      };
    }

    try {
      this.log.info(`Searching AliExpress for: ${query}`);

      // When official API or third-party service is configured
      // This would call the actual search endpoint
      return {
        status: 'not_available',
        message: 'AliExpress search not yet implemented',
        results: [],
      };
    } catch (error) {
      return this.handleError(error, 'searchProducts');
    }
  }

  /**
   * Get product from AliExpress URL
   */
  async getProduct(url) {
    if (!url.includes('aliexpress')) {
      return {
        status: 'invalid_url',
        message: 'URL is not from AliExpress',
      };
    }

    try {
      this.log.info(`Fetching AliExpress product: ${url}`);

      // Extract item ID from URL
      const itemId = this._extractItemId(url);

      if (!itemId) {
        return {
          status: 'invalid_url',
          message: 'Could not extract item ID from URL',
        };
      }

      // When API is configured, use it here
      return {
        status: 'not_available',
        message: 'AliExpress product fetch not yet implemented',
        itemId: itemId,
      };
    } catch (error) {
      return this.handleError(error, 'getProduct');
    }
  }

  /**
   * Normalize product from AliExpress format
   */
  normalizeProduct(rawProduct) {
    if (!rawProduct || !this.validateProduct(rawProduct)) {
      return null;
    }

    return {
      title: rawProduct.product_name || rawProduct.title,
      brand: rawProduct.brand_name || rawProduct.brand,
      model: rawProduct.model,
      sku: rawProduct.sku,
      mpn: rawProduct.mpn,
      gtin: rawProduct.gtin,
      description: rawProduct.product_desc || rawProduct.description,
      images: this._extractImages(rawProduct),
      price: this._parsePrice(rawProduct.sale_price || rawProduct.price),
      currency: rawProduct.currency || 'USD',
      originalPrice: this._parsePrice(rawProduct.original_price),
      availability: this._parseAvailability(rawProduct),
      seller: rawProduct.seller_name || 'AliExpress Seller',
      specifications: this._extractSpecifications(rawProduct),
      dimensions: this._extractDimensions(rawProduct),
      material: rawProduct.material,
      color: rawProduct.color,
      variant: this._extractVariant(rawProduct),
      sourceUrl: url,
      platformName: 'AliExpress',
      shipping: this._extractShipping(rawProduct),
    };
  }

  /**
   * Extract item ID from URL
   */
  _extractItemId(url) {
    try {
      const urlObj = new URL(url);

      // Check for item/ pattern
      const itemMatch = urlObj.pathname.match(/\/item\/(\d+)/);
      if (itemMatch) return itemMatch[1];

      // Check for query parameter
      const itemParam = urlObj.searchParams.get('item_id');
      if (itemParam) return itemParam;

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Extract images from product
   */
  _extractImages(product) {
    const images = [];

    if (product.image_url_list && Array.isArray(product.image_url_list)) {
      images.push(...product.image_url_list);
    }

    if (product.image && !images.includes(product.image)) {
      images.push(product.image);
    }

    return images.slice(0, 10);
  }

  /**
   * Parse price
   */
  _parsePrice(price) {
    if (!price && price !== 0) return null;

    if (typeof price === 'number') return price;

    // Handle price ranges (e.g., "$2.95-$5.00")
    const priceStr = String(price);
    const match = priceStr.match(/[\d.]+/);

    if (match) {
      const parsed = parseFloat(match[0]);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  /**
   * Parse availability
   */
  _parseAvailability(product) {
    if (product.available_quantity && product.available_quantity > 0) {
      return 'in_stock';
    }

    if (product.stock_status === 'available' || product.stock_status === 'in_stock') {
      return 'in_stock';
    }

    if (product.stock_status === 'out_of_stock' || product.available_quantity === 0) {
      return 'out_of_stock';
    }

    return 'unknown';
  }

  /**
   * Extract specifications
   */
  _extractSpecifications(product) {
    const specs = {};

    if (product.props_name) {
      // props_name format from AliExpress API
      const names = product.props_name.split(',');
      if (product.props_value) {
        const values = product.props_value.split(',');
        for (let i = 0; i < names.length && i < values.length; i++) {
          specs[names[i].trim()] = values[i].trim();
        }
      }
    }

    if (product.specifications && typeof product.specifications === 'object') {
      Object.assign(specs, product.specifications);
    }

    return specs;
  }

  /**
   * Extract dimensions
   */
  _extractDimensions(product) {
    const dimensions = {};

    if (product.package_length) dimensions.depth = parseFloat(product.package_length);
    if (product.package_width) dimensions.width = parseFloat(product.package_width);
    if (product.package_height) dimensions.height = parseFloat(product.package_height);
    if (product.gross_weight) dimensions.weight = parseFloat(product.gross_weight);

    return Object.keys(dimensions).length > 0 ? dimensions : null;
  }

  /**
   * Extract variant information
   */
  _extractVariant(product) {
    const variant = {};

    if (product.color) variant.color = product.color;
    if (product.size) variant.size = product.size;

    if (product.sku_attributes && Array.isArray(product.sku_attributes)) {
      for (const attr of product.sku_attributes) {
        if (attr.attr_name && attr.attr_value) {
          variant[attr.attr_name] = attr.attr_value;
        }
      }
    }

    return Object.keys(variant).length > 0 ? variant : null;
  }

  /**
   * Extract shipping information
   */
  _extractShipping(product) {
    if (product.shipping_price) {
      return parseFloat(product.shipping_price);
    }

    // AliExpress often has free shipping or included shipping
    if (product.shipping_free) {
      return 0;
    }

    return null;
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

export default new AliExpressAdapter();
