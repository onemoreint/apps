import axios from 'axios';
import { MarketplaceAdapter } from './MarketplaceAdapter.js';
import config from '../config/env.js';

/**
 * Temu Marketplace Adapter
 * Temu has an official API for partners
 * This adapter connects to Temu Open Platform API
 */
class TemuAdapter extends MarketplaceAdapter {
  constructor() {
    super('Temu', {
      enabled: config.marketplaces.temu.enabled,
      appKey: config.marketplaces.temu.appKey,
      appSecret: config.marketplaces.temu.appSecret,
      accessToken: config.marketplaces.temu.accessToken,
      region: config.marketplaces.temu.region,
      apiUrl: config.marketplaces.temu.apiUrl,
    });

    this.httpClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: this.timeout,
    });
  }

  /**
   * Check if Temu API is available
   */
  isConfigured() {
    return this.enabled && !!this.config.appKey && !!this.config.appSecret;
  }

  /**
   * Get authentication header
   */
  _getAuthHeader() {
    return {
      'X-App-Key': this.config.appKey,
      'Authorization': `Bearer ${this.config.accessToken || this.config.appSecret}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Search for products on Temu
   */
  async searchProducts(query, options = {}) {
    if (!this.isConfigured()) {
      return {
        status: 'not_configured',
        message: 'Temu API not configured',
        results: [],
      };
    }

    try {
      this.log.info(`Searching Temu for: ${query}`);

      // When Temu API is properly configured, this would work
      return {
        status: 'not_available',
        message: 'Temu search not yet implemented',
        results: [],
      };
    } catch (error) {
      return this.handleError(error, 'searchProducts');
    }
  }

  /**
   * Get product from Temu URL
   */
  async getProduct(url) {
    if (!url.includes('temu')) {
      return {
        status: 'invalid_url',
        message: 'URL is not from Temu',
      };
    }

    try {
      this.log.info(`Fetching Temu product: ${url}`);

      // Extract product ID from URL
      const productId = this._extractProductId(url);

      if (!productId) {
        return {
          status: 'invalid_url',
          message: 'Could not extract product ID from URL',
        };
      }

      // When API is configured, fetch here
      return {
        status: 'not_available',
        message: 'Temu product fetch not yet implemented',
        productId: productId,
      };
    } catch (error) {
      return this.handleError(error, 'getProduct');
    }
  }

  /**
   * Normalize product from Temu format
   */
  normalizeProduct(rawProduct) {
    if (!rawProduct || !this.validateProduct(rawProduct)) {
      return null;
    }

    return {
      title: rawProduct.title || rawProduct.product_name,
      brand: rawProduct.brand,
      model: rawProduct.model_number,
      sku: rawProduct.sku,
      mpn: rawProduct.manufacturer_part_number,
      gtin: rawProduct.gtin,
      description: rawProduct.description,
      images: this._extractImages(rawProduct),
      price: this._parsePrice(rawProduct.current_price || rawProduct.price),
      currency: rawProduct.currency || 'USD',
      originalPrice: this._parsePrice(rawProduct.original_price),
      availability: this._parseAvailability(rawProduct),
      seller: rawProduct.seller_name || 'Temu',
      specifications: this._extractSpecifications(rawProduct),
      dimensions: this._extractDimensions(rawProduct),
      material: rawProduct.material,
      color: rawProduct.color,
      variant: this._extractVariant(rawProduct),
      sourceUrl: rawProduct.product_url,
      platformName: 'Temu',
      shipping: this._extractShipping(rawProduct),
    };
  }

  /**
   * Extract product ID from Temu URL
   */
  _extractProductId(url) {
    try {
      const urlObj = new URL(url);

      // Temu URL pattern: /goods/XXXXX.html
      const match = urlObj.pathname.match(/\/goods\/(\d+)/);
      if (match) return match[1];

      // Alternative pattern
      const goodsMatch = urlObj.pathname.match(/goods[\/=_-](\d+)/);
      if (goodsMatch) return goodsMatch[1];

      // Check query parameter
      const idParam = urlObj.searchParams.get('goods_id');
      if (idParam) return idParam;

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

    if (product.image_url && !images.includes(product.image_url)) {
      images.push(product.image_url);
    }

    if (product.main_image && !images.includes(product.main_image)) {
      images.unshift(product.main_image);
    }

    return images.slice(0, 10);
  }

  /**
   * Parse price
   */
  _parsePrice(price) {
    if (!price && price !== 0) return null;

    if (typeof price === 'number') return price;

    const parsed = parseFloat(String(price).replace(/[^\d.,-]/g, '').replace(/,/g, '.'));
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Parse availability
   */
  _parseAvailability(product) {
    if (product.in_stock || product.stock_quantity > 0) {
      return 'in_stock';
    }

    if (!product.in_stock || product.stock_quantity === 0) {
      return 'out_of_stock';
    }

    return product.status || 'unknown';
  }

  /**
   * Extract specifications
   */
  _extractSpecifications(product) {
    const specs = {};

    if (product.specifications && typeof product.specifications === 'object') {
      Object.assign(specs, product.specifications);
    }

    if (product.attributes && Array.isArray(product.attributes)) {
      for (const attr of product.attributes) {
        if (attr.attribute_name && attr.attribute_value) {
          specs[attr.attribute_name] = attr.attribute_value;
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

    if (product.package_dimensions) {
      const dims = product.package_dimensions;
      if (dims.length) dimensions.depth = parseFloat(dims.length);
      if (dims.width) dimensions.width = parseFloat(dims.width);
      if (dims.height) dimensions.height = parseFloat(dims.height);
    }

    if (product.package_weight) {
      dimensions.weight = parseFloat(product.package_weight);
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

    if (product.variants && Array.isArray(product.variants)) {
      if (product.variants.length > 0) {
        const selected = product.variants.find((v) => v.selected) || product.variants[0];
        if (selected.color) variant.color = selected.color;
        if (selected.size) variant.size = selected.size;
        if (selected.option_value) variant.option = selected.option_value;
      }
    }

    return Object.keys(variant).length > 0 ? variant : null;
  }

  /**
   * Extract shipping information
   */
  _extractShipping(product) {
    if (product.shipping_fee) {
      return parseFloat(product.shipping_fee);
    }

    if (product.free_shipping) {
      return 0;
    }

    // Temu often has low or free shipping
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

export default new TemuAdapter();
