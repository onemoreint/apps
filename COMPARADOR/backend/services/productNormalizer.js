import logger from '../utils/logger.js';

/**
 * Normalize product data for comparison
 * Handles units, currencies, text normalization, etc.
 */
class ProductNormalizer {
  constructor() {
    this.log = logger.child('ProductNormalizer');
  }

  /**
   * Normalize entire product object
   */
  normalize(product) {
    if (!product || typeof product !== 'object') {
      throw new Error('Invalid product object');
    }

    return {
      title: this._normalizeText(product.title),
      brand: this._normalizeText(product.brand),
      manufacturer: this._normalizeText(product.manufacturer),
      model: this._normalizeText(product.model),
      sku: this._normalizeSku(product.sku),
      mpn: this._normalizeText(product.mpn),
      gtin: this._normalizeGtin(product.gtin),
      ean: this._normalizeGtin(product.ean),
      upc: this._normalizeGtin(product.upc),
      asin: this._normalizeText(product.asin),
      description: this._normalizeText(product.description),
      category: this._normalizeText(product.category),
      images: this._normalizeImages(product.images),
      price: this._normalizePrice(product.price),
      currency: this._normalizeCurrency(product.currency),
      originalPrice: this._normalizePrice(product.originalPrice),
      availability: this._normalizeAvailability(product.availability),
      seller: this._normalizeText(product.seller),
      specifications: this._normalizeSpecifications(product.specifications),
      dimensions: this._normalizeDimensions(product.dimensions),
      material: this._normalizeText(product.material),
      color: this._normalizeColor(product.color),
      size: this._normalizeSize(product.size),
      variant: this._normalizeVariant(product.variant),
      sourceUrl: product.sourceUrl,
      platformName: product.platformName,
    };
  }

  /**
   * Normalize text: trim, lowercase for comparison, remove extra spaces
   */
  _normalizeText(text) {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);

    return text
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-àáäâèéëêìíïîòóöôùúüûñçß]/g, '');
  }

  /**
   * Normalize SKU: preserve format but normalize case and spaces
   */
  _normalizeSku(sku) {
    if (!sku) return '';
    return String(sku)
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '');
  }

  /**
   * Normalize GTIN/EAN/UPC: remove dashes and spaces, validate length
   */
  _normalizeGtin(gtin) {
    if (!gtin) return '';

    let normalized = String(gtin)
      .trim()
      .replace(/[\s\-]/g, '');

    // Validate: should be 8, 12, 13, or 14 digits
    if (/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(normalized)) {
      return normalized;
    }

    return '';
  }

  /**
   * Normalize images: filter valid URLs
   */
  _normalizeImages(images) {
    if (!Array.isArray(images)) return [];

    return images
      .filter((img) => {
        if (typeof img !== 'string') return false;
        try {
          new URL(img);
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, 10); // Limit to 10 images
  }

  /**
   * Normalize price: parse to float
   */
  _normalizePrice(price) {
    if (!price && price !== 0) return null;

    const parsed = parseFloat(String(price).replace(/[^\d.,-]/g, '').replace(/,/g, '.'));
    return isNaN(parsed) ? null : parsed;
  }

  /**
   * Normalize currency: ISO 4217 3-letter code
   */
  _normalizeCurrency(currency) {
    if (!currency) return 'USD';

    const code = String(currency).trim().toUpperCase();

    // Check if valid ISO 4217 code
    const validCurrencies = [
      'USD',
      'EUR',
      'GBP',
      'JPY',
      'CNY',
      'INR',
      'COP',
      'MXN',
      'BRL',
      'ARS',
      'VES',
      'CLP',
      'CRC',
      'UYU',
      'PHP',
      'THB',
      'VND',
      'IDR',
      'MYR',
      'SGD',
      'HKD',
      'AUD',
      'NZD',
      'CAD',
      'CHF',
      'SEK',
      'NOK',
      'DKK',
      'PLN',
      'CZK',
      'HUF',
      'RON',
      'BGN',
      'RUB',
      'TRY',
      'ZAR',
      'EGP',
      'KES',
      'NGN',
    ];

    return validCurrencies.includes(code) ? code : 'USD';
  }

  /**
   * Normalize availability
   */
  _normalizeAvailability(availability) {
    if (!availability) return 'unknown';

    const text = String(availability).toLowerCase();

    if (text.includes('in stock') || text.includes('en stock') || text.includes('disponible')) {
      return 'in_stock';
    }
    if (text.includes('out of stock') || text.includes('agotado') || text.includes('no disponible')) {
      return 'out_of_stock';
    }
    if (text.includes('preorder') || text.includes('pre-order') || text.includes('reserva')) {
      return 'preorder';
    }

    return 'unknown';
  }

  /**
   * Normalize specifications object
   */
  _normalizeSpecifications(specs) {
    if (!specs || typeof specs !== 'object' || Array.isArray(specs)) {
      return {};
    }

    const normalized = {};

    for (const [key, value] of Object.entries(specs)) {
      if (value !== null && value !== undefined && value !== '') {
        const normalizedKey = this._normalizeText(key);
        const normalizedValue = this._normalizeSpecValue(value);

        if (normalizedKey && normalizedValue) {
          normalized[normalizedKey] = normalizedValue;
        }
      }
    }

    return normalized;
  }

  /**
   * Normalize a specification value
   */
  _normalizeSpecValue(value) {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value === 'string') {
      return this._normalizeText(value);
    }

    if (Array.isArray(value)) {
      return value.map((v) => this._normalizeText(String(v))).filter((v) => v);
    }

    return String(value).toLowerCase();
  }

  /**
   * Normalize dimensions with unit conversion
   */
  _normalizeDimensions(dimensions) {
    if (!dimensions || typeof dimensions !== 'object') {
      return {
        width: null,
        height: null,
        depth: null,
        weight: null,
        unit: 'cm',
      };
    }

    const normalized = {
      width: this._normalizeMetric(dimensions.width),
      height: this._normalizeMetric(dimensions.height),
      depth: this._normalizeMetric(dimensions.depth),
      weight: this._normalizeMetric(dimensions.weight),
      unit: dimensions.unit || 'cm',
    };

    return normalized;
  }

  /**
   * Normalize metric value (length/weight)
   */
  _normalizeMetric(value) {
    if (!value && value !== 0) return null;

    const parsed = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(/,/g, '.'));
    return isNaN(parsed) || parsed < 0 ? null : parsed;
  }

  /**
   * Normalize color
   */
  _normalizeColor(color) {
    if (!color) return '';

    const normalized = this._normalizeText(color);

    // Normalize common color variations
    const colorMap = {
      negro: 'black',
      negro: 'black',
      blanco: 'white',
      blanco: 'white',
      rojo: 'red',
      azul: 'blue',
      verde: 'green',
      amarillo: 'yellow',
      gris: 'gray',
      grigio: 'gray',
      marrón: 'brown',
      marron: 'brown',
      rosa: 'pink',
      naranja: 'orange',
      púrpura: 'purple',
      purpura: 'purple',
      beige: 'beige',
      champagne: 'gold',
      dorado: 'gold',
      plateado: 'silver',
      bronce: 'bronze',
      transparente: 'transparent',
      cristal: 'clear',
    };

    return colorMap[normalized] || normalized;
  }

  /**
   * Normalize size (clothing, shoes, etc)
   */
  _normalizeSize(size) {
    if (!size) return '';

    const normalized = String(size).trim().toUpperCase();

    // Common size conversions
    const sizeMap = {
      'XS': 'XS',
      'S': 'S',
      'M': 'M',
      'L': 'L',
      'XL': 'XL',
      'XXL': 'XXL',
      '2XL': 'XXL',
      '3XL': 'XXXL',
      'SMALL': 'S',
      'MEDIUM': 'M',
      'LARGE': 'L',
      'EXTRA LARGE': 'XL',
    };

    return sizeMap[normalized] || normalized;
  }

  /**
   * Normalize variant object
   */
  _normalizeVariant(variant) {
    if (!variant || typeof variant !== 'object' || Array.isArray(variant)) {
      return {};
    }

    const normalized = {};

    for (const [key, value] of Object.entries(variant)) {
      if (value !== null && value !== undefined && value !== '') {
        if (key.toLowerCase() === 'color') {
          normalized[key] = this._normalizeColor(value);
        } else if (key.toLowerCase() === 'size') {
          normalized[key] = this._normalizeSize(value);
        } else {
          normalized[key] = this._normalizeText(String(value));
        }
      }
    }

    return normalized;
  }

  /**
   * Compare two normalized values for equality
   */
  compareValues(value1, value2, tolerance = 0) {
    if (value1 === value2) return true;

    // For numbers with tolerance (like price, dimensions)
    if (typeof value1 === 'number' && typeof value2 === 'number') {
      return Math.abs(value1 - value2) <= tolerance;
    }

    // For strings, use normalized comparison
    if (typeof value1 === 'string' && typeof value2 === 'string') {
      return value1.toLowerCase() === value2.toLowerCase();
    }

    return false;
  }
}

export default new ProductNormalizer();
