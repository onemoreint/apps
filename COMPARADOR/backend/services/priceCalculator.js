import logger from '../utils/logger.js';

/**
 * Calculate and normalize prices across currencies
 */
class PriceCalculator {
  constructor() {
    this.log = logger.child('PriceCalculator');

    // Approximate exchange rates (in production, use real-time API)
    this.exchangeRates = {
      USD: 1,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149.5,
      CNY: 7.24,
      INR: 83.12,
      COP: 4200,
      MXN: 17.05,
      BRL: 4.97,
      ARS: 850,
      VES: 40,
      CLP: 850,
      CRC: 520,
      UYU: 39,
      PHP: 56.5,
      THB: 35.5,
      VND: 24500,
      IDR: 15650,
      MYR: 4.7,
      SGD: 1.34,
      HKD: 7.81,
      AUD: 1.53,
      NZD: 1.69,
      CAD: 1.36,
      CHF: 0.88,
      SEK: 10.5,
      NOK: 10.6,
      DKK: 6.86,
      PLN: 4.0,
      CZK: 23.5,
      HUF: 360,
      RON: 4.58,
      BGN: 1.8,
      RUB: 98,
      TRY: 31.5,
      ZAR: 18.8,
      EGP: 49,
      KES: 155,
      NGN: 1550,
    };
  }

  /**
   * Calculate total price for a product
   */
  calculateTotalPrice(product) {
    const result = {
      productPrice: this._normalizePrice(product.price),
      currency: product.currency || 'USD',
      shipping: this._normalizePrice(product.shipping || 0),
      tax: this._normalizePrice(product.tax || 0),
      otherFees: this._normalizePrice(product.otherFees || 0),
      totalPrice: 0,
      breakdown: {},
      warnings: [],
    };

    result.totalPrice =
      (result.productPrice || 0) +
      (result.shipping || 0) +
      (result.tax || 0) +
      (result.otherFees || 0);

    result.breakdown = {
      product: result.productPrice,
      shipping: result.shipping,
      tax: result.tax,
      fees: result.otherFees,
    };

    // Add warnings
    if (!result.productPrice) {
      result.warnings.push('Product price not available');
    }

    if (result.shipping === 0 && product.shipping !== 0 && !product.shipping) {
      result.warnings.push('Shipping cost not confirmed');
    }

    return result;
  }

  /**
   * Normalize price value
   */
  _normalizePrice(value) {
    if (!value && value !== 0) return null;

    const parsed = parseFloat(String(value).replace(/[^\d.,-]/g, '').replace(/,/g, '.'));
    return isNaN(parsed) || parsed < 0 ? null : parseFloat(parsed.toFixed(2));
  }

  /**
   * Convert price between currencies
   */
  convertPrice(amount, fromCurrency, toCurrency) {
    if (!amount || !fromCurrency || !toCurrency) {
      return null;
    }

    const fromRate = this.exchangeRates[fromCurrency];
    const toRate = this.exchangeRates[toCurrency];

    if (!fromRate || !toRate) {
      this.log.warn(`Unknown currency: ${!fromRate ? fromCurrency : toCurrency}`);
      return null;
    }

    // Convert to USD first, then to target currency
    const usd = amount / fromRate;
    const converted = usd * toRate;

    return parseFloat(converted.toFixed(2));
  }

  /**
   * Get price in default currency
   */
  getPriceInDefaultCurrency(product, defaultCurrency = 'USD') {
    const total = this.calculateTotalPrice(product);

    if (total.currency === defaultCurrency) {
      return {
        amount: total.totalPrice,
        currency: defaultCurrency,
        original: total,
      };
    }

    const converted = this.convertPrice(total.totalPrice, total.currency, defaultCurrency);

    if (!converted) {
      return {
        amount: total.totalPrice,
        currency: total.currency,
        original: total,
        warning: 'Could not convert to requested currency',
      };
    }

    return {
      amount: converted,
      currency: defaultCurrency,
      original: total,
    };
  }

  /**
   * Compare prices between multiple products
   */
  comparePrices(products, targetCurrency = 'USD') {
    const comparison = {
      currency: targetCurrency,
      products: [],
      cheapest: null,
      mostExpensive: null,
      differences: {},
    };

    // Convert all to target currency
    for (const product of products) {
      const priceData = this.getPriceInDefaultCurrency(
        {
          price: product.price,
          currency: product.currency,
          shipping: product.shipping,
          tax: product.tax,
          otherFees: product.otherFees,
        },
        targetCurrency
      );

      comparison.products.push({
        ...product,
        convertedPrice: priceData.amount,
        totalPrice: priceData.amount,
      });

      if (!comparison.cheapest || priceData.amount < comparison.cheapest.totalPrice) {
        comparison.cheapest = {
          product: product,
          totalPrice: priceData.amount,
        };
      }

      if (!comparison.mostExpensive || priceData.amount > comparison.mostExpensive.totalPrice) {
        comparison.mostExpensive = {
          product: product,
          totalPrice: priceData.amount,
        };
      }
    }

    // Calculate savings
    if (comparison.cheapest && comparison.mostExpensive) {
      comparison.differences = {
        savings: (comparison.mostExpensive.totalPrice - comparison.cheapest.totalPrice).toFixed(2),
        percentage: (
          ((comparison.mostExpensive.totalPrice - comparison.cheapest.totalPrice) /
            comparison.mostExpensive.totalPrice) *
          100
        ).toFixed(1),
      };
    }

    return comparison;
  }

  /**
   * Estimate shipping cost (rule-based heuristic)
   */
  estimateShipping(marketplace, price, destination = 'global') {
    const estimates = {
      SHEIN: {
        global: 3.99,
        high: 5.99,
      },
      AliExpress: {
        global: 0.99,
        high: 2.99,
      },
      Temu: {
        global: 0,
        high: 0,
      },
      Amazon: {
        global: 5.99,
        high: 3.99,
      },
    };

    const marketplaceEst = estimates[marketplace] || { global: 5.0, high: 10.0 };

    // Price-based adjustment
    let base = destination === 'global' ? marketplaceEst.global : marketplaceEst.high;

    if (price > 100) {
      base = base * 1.5; // Heavier items
    }

    return parseFloat(base.toFixed(2));
  }

  /**
   * Calculate savings vs reference price
   */
  calculateSavings(referencePrice, comparePrice) {
    if (!referencePrice || !comparePrice) {
      return null;
    }

    const savings = referencePrice - comparePrice;
    const percentage = (savings / referencePrice) * 100;

    return {
      amount: parseFloat(savings.toFixed(2)),
      percentage: parseFloat(percentage.toFixed(1)),
      isCheaper: savings > 0,
    };
  }

  /**
   * Get price statistics for products
   */
  getPriceStatistics(products, currency = 'USD') {
    if (products.length === 0) {
      return null;
    }

    const prices = products
      .map((p) => this.getPriceInDefaultCurrency(p, currency).amount)
      .filter((p) => p !== null)
      .sort((a, b) => a - b);

    const sum = prices.reduce((a, b) => a + b, 0);
    const mean = sum / prices.length;
    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];
    const range = max - min;
    const stdev = Math.sqrt(
      prices.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / prices.length
    );

    return {
      currency,
      count: prices.length,
      min,
      max,
      mean: parseFloat(mean.toFixed(2)),
      median: parseFloat(median.toFixed(2)),
      range: parseFloat(range.toFixed(2)),
      stdev: parseFloat(stdev.toFixed(2)),
    };
  }

  /**
   * Format price for display
   */
  formatPrice(amount, currency = 'USD') {
    if (amount === null || amount === undefined) {
      return 'N/A';
    }

    const symbols = {
      USD: '$',
      EUR: '€',
      GBP: '£',
      JPY: '¥',
      CNY: '¥',
      INR: '₹',
      COP: '$',
      MXN: '$',
      BRL: 'R$',
      ARS: '$',
      VES: 'Bs',
      CLP: '$',
      CRC: '₡',
      UYU: '$U',
      PHP: '₱',
      THB: '฿',
      VND: '₫',
      IDR: 'Rp',
      MYR: 'RM',
      SGD: '$',
      HKD: 'HK$',
      AUD: 'A$',
      NZD: 'NZ$',
      CAD: 'C$',
      CHF: 'CHF',
      SEK: 'kr',
      NOK: 'kr',
      DKK: 'kr',
      PLN: 'zł',
      CZK: 'Kč',
      HUF: 'Ft',
      RON: 'lei',
      BGN: 'лв',
      RUB: '₽',
      TRY: '₺',
      ZAR: 'R',
      EGP: 'E£',
      KES: 'KSh',
      NGN: '₦',
    };

    const symbol = symbols[currency] || currency;
    const formatted = parseFloat(amount).toLocaleString('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    return `${symbol} ${formatted}`;
  }
}

export default new PriceCalculator();
