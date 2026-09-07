import crypto from 'crypto';
import logger from '../utils/logger.js';

/**
 * Generate product fingerprint for identification
 * Fingerprints are used to identify if two products are truly the same
 */
class FingerprintGenerator {
  constructor() {
    this.log = logger.child('FingerprintGenerator');

    // Priority levels for identification
    this.levels = {
      critical: {
        priority: 1,
        keys: ['gtin', 'ean', 'upc', 'asin', 'mpn', 'model'],
      },
      high: {
        priority: 2,
        keys: ['brand', 'manufacturer', 'sku', 'model'],
      },
      medium: {
        priority: 3,
        keys: ['variant', 'color', 'dimensions', 'material', 'specifications'],
      },
      low: {
        priority: 4,
        keys: ['title', 'description', 'images'],
      },
    };
  }

  /**
   * Generate fingerprint from normalized product
   */
  generateFingerprint(product) {
    if (!product || typeof product !== 'object') {
      throw new Error('Invalid product for fingerprinting');
    }

    const fingerprint = {
      id: this._generateId(),
      critical: this._extractCriticalIdentifiers(product),
      high: this._extractHighPriorityIdentifiers(product),
      medium: this._extractMediumPriorityIdentifiers(product),
      low: this._extractLowPriorityIdentifiers(product),
      hash: null,
    };

    // Generate hash of critical + high priority data
    fingerprint.hash = this._generateHash(fingerprint.critical, fingerprint.high);

    this.log.debug('Generated fingerprint', {
      id: fingerprint.id.substring(0, 8),
      critical: Object.keys(fingerprint.critical).length,
      high: Object.keys(fingerprint.high).length,
    });

    return fingerprint;
  }

  /**
   * Extract critical identifiers (strongest signals)
   */
  _extractCriticalIdentifiers(product) {
    const critical = {};

    if (product.gtin && this._isValid(product.gtin)) critical.gtin = product.gtin;
    if (product.ean && this._isValid(product.ean)) critical.ean = product.ean;
    if (product.upc && this._isValid(product.upc)) critical.upc = product.upc;
    if (product.asin && this._isValid(product.asin)) critical.asin = product.asin;
    if (product.mpn && this._isValid(product.mpn)) critical.mpn = product.mpn;

    return critical;
  }

  /**
   * Extract high priority identifiers
   */
  _extractHighPriorityIdentifiers(product) {
    const high = {};

    if (product.brand && this._isValid(product.brand)) high.brand = product.brand;
    if (product.manufacturer && this._isValid(product.manufacturer)) high.manufacturer = product.manufacturer;
    if (product.sku && this._isValid(product.sku)) high.sku = product.sku;
    if (product.model && this._isValid(product.model)) high.model = product.model;

    return high;
  }

  /**
   * Extract medium priority identifiers
   */
  _extractMediumPriorityIdentifiers(product) {
    const medium = {};

    if (product.color && this._isValid(product.color)) medium.color = product.color;

    // Variant information
    if (product.variant && Object.keys(product.variant).length > 0) {
      medium.variant = this._serializeVariant(product.variant);
    }

    // Dimensions (critical for physical products)
    if (product.dimensions && this._hasDimensions(product.dimensions)) {
      medium.dimensions = this._serializeDimensions(product.dimensions);
    }

    // Material
    if (product.material && this._isValid(product.material)) {
      medium.material = product.material;
    }

    // Capacity/Volume from specifications
    if (product.specifications) {
      const capacityKey = this._findCapacityKey(product.specifications);
      if (capacityKey) {
        medium.capacity = product.specifications[capacityKey];
      }
    }

    return medium;
  }

  /**
   * Extract low priority identifiers
   */
  _extractLowPriorityIdentifiers(product) {
    const low = {};

    if (product.title && this._isValid(product.title)) {
      low.title = product.title.substring(0, 100); // First 100 chars
    }

    if (product.images && product.images.length > 0) {
      low.imageCount = product.images.length;
      // Could add image hash here for visual comparison
    }

    return low;
  }

  /**
   * Find capacity specification key
   */
  _findCapacityKey(specs) {
    const capacityKeywords = ['capacity', 'volume', 'size', 'ml', 'cc', 'oz', 'liter', 'litro', 'capacidad'];

    for (const [key, value] of Object.entries(specs)) {
      const keyLower = key.toLowerCase();
      if (capacityKeywords.some((keyword) => keyLower.includes(keyword))) {
        return key;
      }
    }

    return null;
  }

  /**
   * Check if value is valid for identification
   */
  _isValid(value) {
    if (!value) return false;
    if (typeof value !== 'string') return false;

    const trimmed = String(value).trim();
    if (trimmed.length === 0) return false;
    if (trimmed.toLowerCase() === 'unknown' || trimmed.toLowerCase() === 'n/a') return false;
    if (trimmed.toLowerCase() === 'no disponible') return false;

    return true;
  }

  /**
   * Check if dimensions are available
   */
  _hasDimensions(dimensions) {
    if (!dimensions) return false;
    return !!(dimensions.width || dimensions.height || dimensions.depth || dimensions.weight);
  }

  /**
   * Serialize variant for consistent comparison
   */
  _serializeVariant(variant) {
    const keys = Object.keys(variant).sort();
    return keys
      .map((key) => `${key}:${variant[key]}`)
      .join(';');
  }

  /**
   * Serialize dimensions for consistent comparison
   */
  _serializeDimensions(dimensions) {
    const parts = [];
    if (dimensions.width) parts.push(`W:${dimensions.width}`);
    if (dimensions.height) parts.push(`H:${dimensions.height}`);
    if (dimensions.depth) parts.push(`D:${dimensions.depth}`);
    if (dimensions.weight) parts.push(`WT:${dimensions.weight}`);

    return parts.join(';');
  }

  /**
   * Generate unique ID
   */
  _generateId() {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate hash from critical and high priority data
   */
  _generateHash(critical, high) {
    const combined = {
      ...critical,
      ...high,
    };

    const sorted = Object.keys(combined)
      .sort()
      .map((key) => `${key}=${combined[key]}`)
      .join('|');

    return crypto
      .createHash('sha256')
      .update(sorted)
      .digest('hex');
  }

  /**
   * Compare two fingerprints
   * Returns: { identical, score, mismatches }
   */
  compareFingerprints(fp1, fp2) {
    const comparison = {
      identical: false,
      score: 0,
      level: 'unverified',
      matchedIdentifiers: [],
      missingIdentifiers: [],
      contradictions: [],
    };

    // Check if hashes are identical (strongest match)
    if (fp1.hash && fp2.hash && fp1.hash === fp2.hash) {
      comparison.identical = true;
      comparison.score = 99;
      comparison.level = 'exact';
      return comparison;
    }

    // Compare critical identifiers
    const criticalMatches = this._compareLevelIdentifiers(fp1.critical, fp2.critical);
    if (criticalMatches.exactMatches > 0) {
      comparison.score += 40;
      comparison.level = 'probable';
      comparison.matchedIdentifiers.push(...criticalMatches.matched);
    }

    // Compare high priority identifiers
    const highMatches = this._compareLevelIdentifiers(fp1.high, fp2.high);
    if (highMatches.exactMatches > 0) {
      comparison.score += 25;
      comparison.matchedIdentifiers.push(...highMatches.matched);
    }

    // Compare medium priority
    const mediumMatches = this._compareLevelIdentifiers(fp1.medium, fp2.medium);
    if (mediumMatches.exactMatches > 0) {
      comparison.score += 20;
      comparison.matchedIdentifiers.push(...mediumMatches.matched);
    }

    // Check for contradictions (hard rejects)
    const contradictions = this._findContradictions(fp1, fp2);
    if (contradictions.length > 0) {
      comparison.score = Math.max(0, comparison.score - 50);
      comparison.contradictions = contradictions;
      comparison.level = 'rejected';
    }

    // Low priority has minimal impact
    const lowMatches = this._compareLevelIdentifiers(fp1.low, fp2.low);
    comparison.score += lowMatches.exactMatches * 2;

    // Cap score at 100
    comparison.score = Math.min(100, comparison.score);

    // Determine final level
    if (comparison.score >= 95) {
      comparison.level = 'exact';
    } else if (comparison.score >= 85) {
      comparison.level = 'probable';
    } else if (comparison.score >= 70) {
      comparison.level = 'unverified';
    } else {
      comparison.level = 'rejected';
    }

    return comparison;
  }

  /**
   * Compare identifiers at same priority level
   */
  _compareLevelIdentifiers(level1, level2) {
    const result = {
      exactMatches: 0,
      partialMatches: 0,
      matched: [],
      unmatched: [],
    };

    for (const key in level1) {
      if (key in level2) {
        if (level1[key] === level2[key]) {
          result.exactMatches++;
          result.matched.push(key);
        }
      }
    }

    return result;
  }

  /**
   * Find contradictions between fingerprints
   */
  _findContradictions(fp1, fp2) {
    const contradictions = [];

    // Check critical contradictions
    const checkKeys = ['gtin', 'ean', 'upc', 'asin', 'mpn', 'model'];

    for (const key of checkKeys) {
      const val1 = fp1.critical[key] || fp1.high[key];
      const val2 = fp2.critical[key] || fp2.high[key];

      if (val1 && val2 && val1 !== val2) {
        // Different values for identifier
        contradictions.push({
          type: 'identifier_mismatch',
          field: key,
          value1: val1,
          value2: val2,
          severity: 'critical',
        });
      }
    }

    // Check dimension contradictions
    const dim1 = fp1.medium.dimensions;
    const dim2 = fp2.medium.dimensions;
    if (dim1 && dim2) {
      const dimContradiction = this._compareDimensions(dim1, dim2);
      if (dimContradiction) {
        contradictions.push({
          type: 'dimension_mismatch',
          severity: 'high',
          details: dimContradiction,
        });
      }
    }

    // Check color contradictions (if part of product identity)
    const color1 = fp1.medium.color;
    const color2 = fp2.medium.color;
    if (color1 && color2 && color1 !== color2) {
      contradictions.push({
        type: 'color_mismatch',
        value1: color1,
        value2: color2,
        severity: 'medium',
      });
    }

    return contradictions;
  }

  /**
   * Compare dimension serialized strings
   */
  _compareDimensions(dim1Str, dim2Str) {
    // Parse dimensions and compare with tolerance
    const parse = (str) => {
      const result = {};
      const pairs = str.split(';');
      for (const pair of pairs) {
        const [key, value] = pair.split(':');
        result[key] = parseFloat(value);
      }
      return result;
    };

    const d1 = parse(dim1Str);
    const d2 = parse(dim2Str);

    // Check if dimensions are significantly different (more than 5% difference)
    for (const key of ['W', 'H', 'D', 'WT']) {
      if (d1[key] && d2[key]) {
        const diff = Math.abs(d1[key] - d2[key]);
        const tolerance = d1[key] * 0.05; // 5% tolerance

        if (diff > tolerance) {
          return `${key} differs: ${d1[key]} vs ${d2[key]}`;
        }
      }
    }

    return null;
  }
}

export default new FingerprintGenerator();
