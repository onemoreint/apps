import axios from 'axios';
import cheerio from 'cheerio';
import config from '../config/env.js';
import logger from '../utils/logger.js';

/**
 * Extract product information from a URL
 * Supports: Open Graph, JSON-LD, Schema.org, meta tags
 */
class ProductExtractor {
  constructor() {
    this.timeout = config.requestTimeout;
    this.headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9',
    };
  }

  /**
   * Main extraction method
   */
  async extractFromUrl(url) {
    const log = logger.child('ProductExtractor');

    try {
      log.info(`Extracting product from: ${url}`);

      const response = await axios.get(url, {
        timeout: this.timeout,
        headers: this.headers,
        maxRedirects: 5,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Try multiple extraction methods in order
      let product = this._extractFromJsonLd($);
      if (!product || !product.title) {
        product = this._extractFromSchema($);
      }
      if (!product || !product.title) {
        product = this._extractFromOpenGraph($);
      }
      if (!product || !product.title) {
        product = this._extractFromMetaTags($);
      }
      if (!product || !product.title) {
        product = this._extractFromDom($);
      }

      // Add source information
      product.sourceUrl = url;
      product.platformName = this._detectPlatform(url);

      log.info(`Successfully extracted product: ${product.title}`);
      return product;
    } catch (error) {
      log.error(`Product extraction failed: ${error.message}`);
      throw new Error(`Could not extract product from URL: ${error.message}`);
    }
  }

  /**
   * Extract from JSON-LD structured data
   */
  _extractFromJsonLd($) {
    const jsonLdScripts = $('script[type="application/ld+json"]');
    let product = null;

    jsonLdScripts.each((index, element) => {
      try {
        const data = JSON.parse($(element).html());

        // Find product data in nested structures
        const productData = this._findProductInJsonLd(data);

        if (productData) {
          product = this._normalizeJsonLdProduct(productData);
          return false; // break
        }
      } catch (e) {
        // Invalid JSON, skip
      }
    });

    return product || {};
  }

  /**
   * Recursively find product data in JSON-LD
   */
  _findProductInJsonLd(data) {
    if (!data) return null;

    if (data['@type'] === 'Product' || (Array.isArray(data['@type']) && data['@type'].includes('Product'))) {
      return data;
    }

    if (Array.isArray(data)) {
      for (const item of data) {
        const found = this._findProductInJsonLd(item);
        if (found) return found;
      }
    }

    if (typeof data === 'object') {
      for (const key in data) {
        const found = this._findProductInJsonLd(data[key]);
        if (found) return found;
      }
    }

    return null;
  }

  /**
   * Normalize JSON-LD product
   */
  _normalizeJsonLdProduct(data) {
    const product = {};

    // Direct mappings
    if (data.name) product.title = data.name;
    if (data.description) product.description = data.description;
    if (data.brand?.name) product.brand = data.brand.name;
    if (data.brand && typeof data.brand === 'string') product.brand = data.brand;
    if (data.manufacturer?.name) product.manufacturer = data.manufacturer.name;
    if (data.model) product.model = data.model;
    if (data.sku) product.sku = data.sku;
    if (data.gtin) product.gtin = data.gtin;
    if (data.gtin12) product.gtin = data.gtin12;
    if (data.gtin13) product.gtin = data.gtin13;
    if (data.gtin14) product.gtin = data.gtin14;
    if (data.mpn) product.mpn = data.mpn;

    // Price
    if (data.offers) {
      const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
      if (offer.price) product.price = parseFloat(offer.price);
      if (offer.priceCurrency) product.currency = offer.priceCurrency;
      if (offer.availability) product.availability = offer.availability;
    }

    // Images
    if (data.image) {
      if (typeof data.image === 'string') {
        product.images = [data.image];
      } else if (Array.isArray(data.image)) {
        product.images = data.image.filter((img) => typeof img === 'string');
      } else if (data.image.url) {
        product.images = [data.image.url];
      }
    }

    // Dimensions
    if (data.depth || data.width || data.height || data.weight) {
      product.dimensions = {};
      if (data.depth) product.dimensions.depth = parseFloat(data.depth);
      if (data.width) product.dimensions.width = parseFloat(data.width);
      if (data.height) product.dimensions.height = parseFloat(data.height);
      if (data.weight) product.dimensions.weight = parseFloat(data.weight);
    }

    return product;
  }

  /**
   * Extract from Schema.org microdata
   */
  _extractFromSchema($) {
    const product = {};

    // Look for itemscope with itemtype Product
    const items = $('[itemtype*="schema.org/Product"]');

    if (items.length === 0) return product;

    const item = items.first();

    // Extract itemprop values
    item.find('[itemprop]').each((index, element) => {
      const $el = $(element);
      const prop = $el.attr('itemprop');
      let value = null;

      if ($el.is('[content]')) {
        value = $el.attr('content');
      } else if ($el.is('img')) {
        value = $el.attr('src');
      } else if ($el.is('a')) {
        value = $el.attr('href');
      } else {
        value = $el.text().trim();
      }

      if (value) {
        if (prop === 'name') product.title = value;
        if (prop === 'brand') product.brand = value;
        if (prop === 'model') product.model = value;
        if (prop === 'sku') product.sku = value;
        if (prop === 'image') {
          if (!product.images) product.images = [];
          product.images.push(value);
        }
        if (prop === 'description') product.description = value;
        if (prop === 'price') product.price = parseFloat(value);
        if (prop === 'priceCurrency') product.currency = value;
      }
    });

    return product;
  }

  /**
   * Extract from Open Graph meta tags
   */
  _extractFromOpenGraph($) {
    const product = {};

    const ogTags = {
      'og:title': 'title',
      'og:description': 'description',
      'og:image': 'images',
      'product:price:amount': 'price',
      'product:price:currency': 'currency',
      'product:availability': 'availability',
    };

    for (const [ogTag, productKey] of Object.entries(ogTags)) {
      const value = $(`meta[property="${ogTag}"]`).attr('content');

      if (value) {
        if (productKey === 'images') {
          if (!product.images) product.images = [];
          product.images.push(value);
        } else if (productKey === 'price') {
          product[productKey] = parseFloat(value);
        } else {
          product[productKey] = value;
        }
      }
    }

    return product;
  }

  /**
   * Extract from standard meta tags
   */
  _extractFromMetaTags($) {
    const product = {};

    const metaTags = {
      description: 'description',
      keywords: 'keywords',
      'product-brand': 'brand',
      'product-model': 'model',
      'product-sku': 'sku',
    };

    for (const [metaName, productKey] of Object.entries(metaTags)) {
      const value = $(`meta[name="${metaName}"]`).attr('content');
      if (value) {
        product[productKey] = value;
      }
    }

    // Try common meta name variations
    product.title = product.title || $('meta[name="og:title"]').attr('content') || $('title').text();

    return product;
  }

  /**
   * Extract from DOM (fallback)
   */
  _extractFromDom($) {
    const product = {};

    // Try to find product title
    product.title =
      $('h1').first().text().trim() ||
      $('[data-testid*="title"]').first().text().trim() ||
      $('title').text().trim() ||
      'Unknown Product';

    // Try to find price
    const priceElements = $('[data-testid*="price"], .price, [class*="price"]');
    if (priceElements.length > 0) {
      const priceText = priceElements.first().text();
      const priceMatch = priceText.match(/[\d.,]+/);
      if (priceMatch) {
        product.price = parseFloat(priceMatch[0].replace(/,/g, '.'));
      }
    }

    // Try to find images
    product.images = [];
    $('img[src*="product"], img[alt*="product"]')
      .slice(0, 5)
      .each((index, element) => {
        const src = $(element).attr('src');
        if (src && !src.includes('logo') && !src.includes('icon')) {
          product.images.push(src);
        }
      });

    return product;
  }

  /**
   * Detect platform from URL
   */
  _detectPlatform(url) {
    const hostname = new URL(url).hostname.toLowerCase();

    if (hostname.includes('amazon')) return 'Amazon';
    if (hostname.includes('shein')) return 'SHEIN';
    if (hostname.includes('aliexpress')) return 'AliExpress';
    if (hostname.includes('temu')) return 'Temu';
    if (hostname.includes('ebay')) return 'eBay';
    if (hostname.includes('mercadolibre')) return 'Mercado Libre';
    if (hostname.includes('walmart')) return 'Walmart';
    if (hostname.includes('shopee')) return 'Shopee';
    if (hostname.includes('alibaba')) return 'Alibaba';
    if (hostname.includes('walmart')) return 'Walmart';

    return 'Unknown';
  }
}

export default new ProductExtractor();
