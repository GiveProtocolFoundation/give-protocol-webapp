interface CacheConfig {
  maxSize?: number;
  ttl?: number;
}

/**
 * Simple caching system with TTL-based expiration and capacity management.
 * Implements singleton pattern for application-wide cache consistency.
 *
 * @class CacheManager
 * @description Basic in-memory cache with time-to-live (TTL) support and automatic
 * eviction when capacity is reached. Uses FIFO eviction strategy to maintain performance.
 *
 * @example
 * ```typescript
 * const cache = CacheManager.getInstance({
 *   maxSize: 50,
 *   ttl: 2 * 60 * 1000 // 2 minutes
 * });
 *
 * // Store data
 * cache.set('api_response', { data: 'cached value' });
 *
 * // Retrieve data
 * const result = cache.get('api_response');
 *
 * // Clear cache
 * cache.clear();
 * ```
 */
export class CacheManager {
  private static instance: CacheManager;
  private readonly cache: Map<string, { value: unknown; timestamp: number }> =
    new Map();
  private readonly maxSize: number;
  private readonly ttl: number;

  /**
   * Private constructor that applies the supplied cache configuration with sensible defaults.
   * @param config - Optional cache configuration (`maxSize` defaults to 100, `ttl` to 5 minutes).
   */
  private constructor(config: CacheConfig = {}) {
    this.maxSize = config.maxSize || 100;
    this.ttl = config.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  /**
   * Gets the singleton instance of CacheManager.
   *
   * @function getInstance
   * @param {CacheConfig} [config] - Optional cache configuration
   * @returns {CacheManager} The singleton instance
   * @example
   * ```typescript
   * const cache = CacheManager.getInstance({ maxSize: 200 });
   * ```
   */
  static getInstance(config?: CacheConfig): CacheManager {
    if (!this.instance) {
      this.instance = new CacheManager(config);
    }
    return this.instance;
  }

  /**
   * Stores a value in the cache with automatic expiration.
   *
   * @function set
   * @param {string} key - The cache key
   * @param {unknown} value - The value to store
   * @returns {void}
   * @example
   * ```typescript
   * cache.set('user_data', { id: 1, name: 'John' });
   * ```
   */
  set(key: string, value: unknown): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now(),
    });
  }

  /**
   * Retrieves a value from the cache, checking for expiration.
   *
   * @function get
   * @param {string} key - The cache key to retrieve
   * @returns {unknown | null} The cached value or null if not found/expired
   * @example
   * ```typescript
   * const userData = cache.get('user_data');
   * if (userData) {
   *   console.log('Found cached data:', userData);
   * }
   * ```
   */
  get(key: string): unknown | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Clears all entries from the cache.
   *
   * @function clear
   * @returns {void}
   * @example
   * ```typescript
   * cache.clear(); // Remove all cached data
   * ```
   */
  clear(): void {
    this.cache.clear();
  }
}
