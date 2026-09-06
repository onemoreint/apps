import logger from '../utils/logger.js';

/**
 * Matching Engine - Calculate if two products are identical
 * Central business logic for product comparison
 */
class MatchingEngine {
  constructor() {
    this.log = logger.child('MatchingEngine');

    // Matching weights
    this.weights = {
      gtin: 0.25,
      sku: 0.20,
      brand: 0.10,
      variant: 0.10,
      specifications: 0.15,
      dimensions: 0.08,
      image: 0.07,
      title: 0.05,
    };

    // Score thresholds
    this.thresholds = {
      exact: 95,
      probable: 85,
      unverified: 70,
      rejected: 0,
    };
  }

  /**
   * Calculate exact match between two products
   */
  calculateExactMatch(original, candidate, fingerprints) {
    const result = {
      score: 0,
      status: 'rejected',
      confidence: 'low',
      verifiedAttributes: [],
      differences: [],
      reasons: [],
      contradictions: [],
    };

    if (!original || !candidate) {
      result.reasons.push('Invalid product data');
      return result;
    }

    // First, check for hard contradictions
    const contradictions = this._checkContradictions(original, candidate);
    if (contradictions.length > 0) {
      result.score = 0;
      result.status = 'rejected';
      result.confidence = 'high';
      result.contradictions = contradictions;
      result.reasons.push('Critical differences detected');
      return result;
    }

    // Check fingerprints if provided
    if (fingerprints && fingerprints.original && fingerprints.candidate) {
      const fpComparison = this._compareFingerprintsForMatch(fingerprints.original, fingerprints.candidate);
      result.score += fpComparison.score * 0.4; // Fingerprint is 40% of total score
      result.verifiedAttributes.push(...fpComparison.verified);
      result.differences.push(...fpComparison.differences);
    }

    // Check critical identifiers
    const identifierScore = this._scoreIdentifiers(original, candidate);
    result.score += identifierScore.score * 0.35; // 35% of score
    result.verifiedAttributes.push(...identifierScore.verified);
    result.differences.push(...identifierScore.differences);

    // Check brand match
    const brandScore = this._scoreBrand(original, candidate);
    result.score += brandScore.score * 0.1; // 10% of score
    if (brandScore.verified) result.verifiedAttributes.push('brand');
    if (brandScore.difference) result.differences.push(brandScore.difference);

    // Check variant match
    const variantScore = this._scoreVariant(original, candidate);
    result.score += variantScore.score * 0.08; // 8% of score
    result.verifiedAttributes.push(...variantScore.verified);
    result.differences.push(...variantScore.differences);

    // Check specifications
    const specScore = this._scoreSpecifications(original, candidate);
    result.score += specScore.score * 0.05; // 5% of score
    result.verifiedAttributes.push(...specScore.verified);
    result.differences.push(...specScore.differences);

    // Cap and round score
    result.score = Math.round(Math.min(100, result.score));

    // Determine status based on score
    if (result.score >= this.thresholds.exact) {
      result.status = 'exact';
      result.confidence = 'high';
    } else if (result.score >= this.thresholds.probable) {
      result.status = 'probable';
      result.confidence = 'medium';
    } else if (result.score >= this.thresholds.unverified) {
      result.status = 'unverified';
      result.confidence = 'low';
    } else {
      result.status = 'rejected';
      result.confidence = 'high';
    }

    // Add reasoning
    this._addReasoning(result);

    return result;
  }

  /**
   * Check for hard contradictions (automatic rejections)
   */
  _checkContradictions(original, candidate) {
    const contradictions = [];

    // Check GTIN/EAN/UPC mismatch
    const gtins1 = [original.gtin, original.ean, original.upc].filter((g) => g);
    const gtins2 = [candidate.gtin, candidate.ean, candidate.upc].filter((g) => g);

    if (gtins1.length > 0 && gtins2.length > 0) {
      const hasCommon = gtins1.some((g1) => gtins2.includes(g1));
      if (!hasCommon) {
        // GTINs don't match - could be different product
        contradictions.push({
          type: 'gtin_mismatch',
          original: gtins1[0],
          candidate: gtins2[0],
        });
      }
    }

    // Check model mismatch
    if (original.model && candidate.model) {
      if (this._normalizeCompare(original.model) !== this._normalizeCompare(candidate.model)) {
        contradictions.push({
          type: 'model_mismatch',
          original: original.model,
          candidate: candidate.model,
        });
      }
    }

    // Check dimension mismatch (>5% difference)
    if (original.dimensions && candidate.dimensions) {
      const dimCheck = this._checkDimensionContradiction(original.dimensions, candidate.dimensions);
      if (dimCheck) {
        contradictions.push(dimCheck);
      }
    }

    // Check capacity mismatch (if it's part of identity)
    const cap1 = this._extractCapacity(original);
    const cap2 = this._extractCapacity(candidate);
    if (cap1 && cap2 && cap1 !== cap2) {
      contradictions.push({
        type: 'capacity_mismatch',
        original: cap1,
        candidate: cap2,
      });
    }

    return contradictions;
  }

  /**
   * Score critical identifiers
   */
  _scoreIdentifiers(original, candidate) {
    const result = {
      score: 0,
      verified: [],
      differences: [],
    };

    const identifiers = [
      { field: 'gtin', weight: 0.4 },
      { field: 'ean', weight: 0.4 },
      { field: 'upc', weight: 0.4 },
      { field: 'mpn', weight: 0.3 },
      { field: 'sku', weight: 0.2 },
    ];

    for (const { field, weight } of identifiers) {
      const val1 = original[field];
      const val2 = candidate[field];

      if (!val1 || !val2) continue;

      if (this._normalizeCompare(val1) === this._normalizeCompare(val2)) {
        result.score += weight;
        result.verified.push(field);
      } else {
        result.differences.push(`${field} mismatch`);
      }
    }

    return result;
  }

  /**
   * Score brand match
   */
  _scoreBrand(original, candidate) {
    const result = {
      score: 0,
      verified: false,
      difference: null,
    };

    const brand1 = original.brand || original.manufacturer;
    const brand2 = candidate.brand || candidate.manufacturer;

    if (!brand1 || !brand2) {
      result.score = 0.5; // Neutral if one is missing
      return result;
    }

    if (this._normalizeCompare(brand1) === this._normalizeCompare(brand2)) {
      result.score = 1;
      result.verified = true;
    } else {
      result.score = 0;
      result.difference = `Brand mismatch: ${brand1} vs ${brand2}`;
    }

    return result;
  }

  /**
   * Score variant match
   */
  _scoreVariant(original, candidate) {
    const result = {
      score: 0,
      verified: [],
      differences: [],
    };

    const variant1 = original.variant || {};
    const variant2 = candidate.variant || {};

    const keys1 = Object.keys(variant1);
    const keys2 = Object.keys(variant2);

    if (keys1.length === 0 && keys2.length === 0) {
      result.score = 1; // Both have no variants
      return result;
    }

    for (const key of keys1) {
      if (key in variant2) {
        if (this._normalizeCompare(variant1[key]) === this._normalizeCompare(variant2[key])) {
          result.score += 0.5;
          result.verified.push(`variant:${key}`);
        } else {
          result.differences.push(`Variant ${key} differs: ${variant1[key]} vs ${variant2[key]}`);
        }
      } else {
        result.differences.push(`Variant ${key} missing in candidate`);
      }
    }

    return result;
  }

  /**
   * Score specifications match
   */
  _scoreSpecifications(original, candidate) {
    const result = {
      score: 0,
      verified: [],
      differences: [],
    };

    const specs1 = original.specifications || {};
    const specs2 = candidate.specifications || {};

    if (Object.keys(specs1).length === 0) {
      result.score = 0.5; // No specs to compare
      return result;
    }

    let matchCount = 0;
    let totalCount = 0;

    for (const key of Object.keys(specs1)) {
      totalCount++;
      if (key in specs2) {
        if (this._normalizeCompare(specs1[key]) === this._normalizeCompare(specs2[key])) {
          matchCount++;
          result.verified.push(key);
        }
      }
    }

    result.score = totalCount > 0 ? matchCount / totalCount : 0;

    return result;
  }

  /**
   * Compare fingerprints for matching
   */
  _compareFingerprintsForMatch(fp1, fp2) {
    const result = {
      score: 0,
      verified: [],
      differences: [],
    };

    // Check critical identifiers
    const criticalKeys = ['gtin', 'ean', 'upc', 'asin', 'mpn'];
    for (const key of criticalKeys) {
      if (fp1.critical[key] && fp2.critical[key]) {
        if (fp1.critical[key] === fp2.critical[key]) {
          result.score = 1;
          result.verified.push(key);
          return result; // Strong enough match
        } else {
          result.differences.push(`${key} mismatch`);
        }
      }
    }

    // Check high priority identifiers
    const highKeys = ['brand', 'model', 'sku'];
    for (const key of highKeys) {
      if (fp1.high[key] && fp2.high[key]) {
        if (fp1.high[key] === fp2.high[key]) {
          result.score += 0.3;
          result.verified.push(key);
        }
      }
    }

    return result;
  }

  /**
   * Check for dimension contradiction
   */
  _checkDimensionContradiction(dim1, dim2) {
    const tolerance = 0.05; // 5% tolerance

    const fields = ['width', 'height', 'depth', 'weight'];

    for (const field of fields) {
      const val1 = dim1[field];
      const val2 = dim2[field];

      if (!val1 || !val2) continue;

      const diff = Math.abs(val1 - val2);
      const threshold = val1 * tolerance;

      if (diff > threshold && diff > 0.1) {
        // Difference more than 5% and more than 0.1 unit
        return {
          type: 'dimension_mismatch',
          field: field,
          original: val1,
          candidate: val2,
        };
      }
    }

    return null;
  }

  /**
   * Extract capacity from product
   */
  _extractCapacity(product) {
    if (product.specifications) {
      for (const [key, value] of Object.entries(product.specifications)) {
        if (key.toLowerCase().includes('capacity') || key.toLowerCase().includes('volume')) {
          return String(value).toLowerCase();
        }
      }
    }

    if (product.variant && product.variant.capacity) {
      return String(product.variant.capacity).toLowerCase();
    }

    return null;
  }

  /**
   * Normalize and compare strings
   */
  _normalizeCompare(value) {
    if (!value) return '';
    return String(value)
      .toLowerCase()
      .trim()
      .replace(/[\s\-\.]/g, '')
      .replace(/[^\w]/g, '');
  }

  /**
   * Add reasoning to result
   */
  _addReasoning(result) {
    if (result.status === 'exact') {
      result.reasons.push('Product identity confirmed: All critical attributes match');
      if (result.contradictions.length === 0) {
        result.reasons.push('No contradictions found');
      }
    } else if (result.status === 'probable') {
      result.reasons.push('Product likely matches based on available data');
      if (result.differences.length > 0) {
        result.reasons.push(`Some differences noted: ${result.differences.slice(0, 2).join(', ')}`);
      }
    } else if (result.status === 'unverified') {
      result.reasons.push('Insufficient data to confirm product match');
      if (result.verifiedAttributes.length === 0) {
        result.reasons.push('No matching attributes found');
      }
    } else {
      result.reasons.push('Product does not match original');
      if (result.contradictions.length > 0) {
        result.reasons.push(`Critical differences: ${result.contradictions.map((c) => c.type).join(', ')}`);
      }
    }
  }
}

export default new MatchingEngine();
