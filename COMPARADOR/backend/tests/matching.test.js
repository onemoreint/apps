import assert from 'assert';
import matchingEngine from '../services/matchingEngine.js';

/**
 * Tests for Matching Engine
 * Run with: npm test
 */

describe('Matching Engine', () => {
  describe('calculateExactMatch', () => {
    it('should detect exact match with identical GTIN', () => {
      const original = {
        title: 'Organizador de cocina 3 niveles',
        brand: 'KitchenPro',
        model: 'KP-3000',
        gtin: '8437012345678',
        price: 89.99,
      };

      const candidate = {
        title: 'Organizador metálico 3 niveles',
        brand: 'KitchenPro',
        model: 'KP-3000',
        gtin: '8437012345678',
        price: 45.99,
      };

      const result = matchingEngine.calculateExactMatch(original, candidate);

      assert.ok(result.score >= 95, `Score should be >= 95, got ${result.score}`);
      assert.strictEqual(result.status, 'exact', `Status should be 'exact', got ${result.status}`);
    });

    it('should reject product with different capacity', () => {
      const original = {
        title: 'Botella de agua 500ml',
        brand: 'DrinkPro',
        specifications: { capacity: '500ml' },
      };

      const candidate = {
        title: 'Botella de agua 750ml',
        brand: 'DrinkPro',
        specifications: { capacity: '750ml' },
      };

      const result = matchingEngine.calculateExactMatch(original, candidate);

      assert.ok(result.contradictions.length > 0, 'Should have contradictions');
      assert.strictEqual(result.status, 'rejected', `Should be rejected`);
    });

    it('should reject product with different model', () => {
      const original = {
        title: 'iPhone 15 128GB',
        brand: 'Apple',
        model: 'iPhone15',
        gtin: '123456789',
      };

      const candidate = {
        title: 'iPhone 15 256GB',
        brand: 'Apple',
        model: 'iPhone15Pro',
        gtin: '987654321',
      };

      const result = matchingEngine.calculateExactMatch(original, candidate);

      assert.ok(result.contradictions.length > 0);
      assert.strictEqual(result.status, 'rejected');
    });

    it('should detect probable match with same SKU', () => {
      const original = {
        title: 'Product A',
        brand: 'BrandX',
        sku: 'SKU-12345',
        price: 100,
      };

      const candidate = {
        title: 'Product A',
        brand: 'BrandX',
        sku: 'SKU-12345',
        price: 85,
      };

      const result = matchingEngine.calculateExactMatch(original, candidate);

      assert.ok(result.score >= 85, `Score should be >= 85, got ${result.score}`);
      assert.ok(['exact', 'probable'].includes(result.status));
    });

    it('should reject very different products', () => {
      const original = {
        title: 'Laptop Intel',
        brand: 'Dell',
        model: 'XPS',
      };

      const candidate = {
        title: 'Laptop AMD',
        brand: 'Lenovo',
        model: 'ThinkPad',
      };

      const result = matchingEngine.calculateExactMatch(original, candidate);

      assert.ok(result.score < 70, 'Score should be < 70 for very different products');
      assert.strictEqual(result.status, 'rejected');
    });

    it('should handle missing data gracefully', () => {
      const original = { title: 'Product' };
      const candidate = {};

      const result = matchingEngine.calculateExactMatch(original, candidate);

      assert.ok(result.score < 70, 'Should have low score for missing data');
    });
  });

  describe('_checkContradictions', () => {
    it('should detect GTIN mismatch as contradiction', () => {
      const original = { gtin: '1234567890123' };
      const candidate = { gtin: '9876543210987' };

      const contradictions = matchingEngine._checkContradictions(original, candidate);

      assert.ok(contradictions.length > 0);
      assert.strictEqual(contradictions[0].type, 'gtin_mismatch');
    });

    it('should allow missing GTIN', () => {
      const original = { gtin: '' };
      const candidate = { gtin: '' };

      const contradictions = matchingEngine._checkContradictions(original, candidate);

      assert.strictEqual(contradictions.length, 0);
    });

    it('should detect dimension mismatch', () => {
      const original = {
        dimensions: { width: 40, height: 60, depth: 20 },
      };

      const candidate = {
        dimensions: { width: 50, height: 70, depth: 25 },
      };

      const contradictions = matchingEngine._checkContradictions(original, candidate);

      assert.ok(contradictions.some((c) => c.type === 'dimension_mismatch'));
    });

    it('should allow small dimension tolerance', () => {
      const original = {
        dimensions: { width: 40, height: 60, depth: 20 },
      };

      const candidate = {
        dimensions: { width: 40.5, height: 61, depth: 19.8 },
      };

      const contradictions = matchingEngine._checkContradictions(original, candidate);

      assert.strictEqual(
        contradictions.filter((c) => c.type === 'dimension_mismatch').length,
        0,
        'Small differences should be tolerated'
      );
    });
  });
});
