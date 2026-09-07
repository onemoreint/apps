import crypto from 'crypto';
import config from '../config/env.js';

class Cache {
  constructor() {
    this.storage = new Map();
    this.timers = new Map();
    this.enabled = config.cacheEnabled;
    this.ttl = config.cacheTtl;
  }

  /**
   * Generate cache key from string or object
   */
  _generateKey(input) {
    const data = typeof input === 'string' ? input : JSON.stringify(input);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Set value in cache with TTL
   */
  set(key, value, ttl = this.ttl) {
    if (!this.enabled) return;

    const cacheKey = this._generateKey(key);

    // Clear existing timer if any
    if (this.timers.has(cacheKey)) {
      clearTimeout(this.timers.get(cacheKey));
    }

    // Store value
    this.storage.set(cacheKey, {
      value,
      createdAt: Date.now(),
      ttl,
    });

    // Set expiration timer
    const timer = setTimeout(() => {
      this.storage.delete(cacheKey);
      this.timers.delete(cacheKey);
    }, ttl * 1000);

    this.timers.set(cacheKey, timer);
  }

  /**
   * Get value from cache
   */
  get(key) {
    if (!this.enabled) return null;

    const cacheKey = this._generateKey(key);
    const cached = this.storage.get(cacheKey);

    if (!cached) return null;

    // Check if expired
    const age = Date.now() - cached.createdAt;
    if (age > cached.ttl * 1000) {
      this.delete(key);
      return null;
    }

    return cached.value;
  }

  /**
   * Check if key exists in cache
   */
  has(key) {
    if (!this.enabled) return false;
    return this.get(key) !== null;
  }

  /**
   * Delete value from cache
   */
  delete(key) {
    const cacheKey = this._generateKey(key);
    this.storage.delete(cacheKey);

    if (this.timers.has(cacheKey)) {
      clearTimeout(this.timers.get(cacheKey));
      this.timers.delete(cacheKey);
    }
  }

  /**
   * Clear all cache
   */
  clear() {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.storage.clear();
    this.timers.clear();
  }

  /**
   * Get cache statistics
   */
  stats() {
    return {
      enabled: this.enabled,
      size: this.storage.size,
      ttl: this.ttl,
      entries: Array.from(this.storage.entries()).map(([key, data]) => ({
        key: key.substring(0, 8) + '...',
        age: Date.now() - data.createdAt,
        ttl: data.ttl,
      })),
    };
  }
}

export default new Cache();
