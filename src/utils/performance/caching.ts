import { Logger } from "../logger";

interface CacheConfig {
  maxSize: number;
  ttl: number;
  staleWhileRevalidate: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

/**
 * High-performance caching system with TTL, stale-while-revalidate, and automatic cleanup.
 * Implements singleton pattern with configurable cache behavior and memory management.
 *
 * @class CacheManager
 * @description Advanced caching solution supporting time-to-live (TTL), stale-while-revalidate patterns,
 * automatic capacity management, and periodic cleanup. Designed for high-performance applications
 * requiring intelligent cache invalidation and memory efficiency.
 *
 * @example
 * ```typescript
 * const cache = CacheManager.getInstance({
 *   maxSize: 200,
 *   ttl: 10 * 60 * 1000, // 10 minutes
 *   staleWhileRevalidate: 60 * 60 * 1000 // 1 hour
 * });
 *
 * // Store data
 * cache.set('user:123', userData);
 *
 * // Retrieve data (may return stale data while revalidating)
 * const user = await cache.get<User>('user:123');
 *
 * // Clear specific entry
 * cache.invalidate('user:123');
 * ```
 */
export class CacheManager {
  private static instance: CacheManager;
  private readonly cache: Map<string, CacheEntry<unknown>>;
  private config: CacheConfig = {
    maxSize: 100,
    ttl: 5 * 60 * 1000, // 5 minutes
    staleWhileRevalidate: 30 * 60 * 1000, // 30 minutes
  };

  /**
   * Private constructor that initializes the underlying map and schedules periodic eviction
   * of entries that have outlived their stale-while-revalidate window.
   */
  private constructor() {
    this.cache = new Map();
    // Cleanup expired entries periodically
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Gets the singleton instance of CacheManager with optional configuration.
   *
   * @function getInstance
   * @param {Partial<CacheConfig>} [config] - Optional cache configuration
   * @returns {CacheManager} The singleton instance
   * @example
   * ```typescript
   * const cache = CacheManager.getInstance({
   *   maxSize: 500,
   *   ttl: 15 * 60 * 1000 // 15 minutes
   * });
   * ```
   */
  static getInstance(config?: Partial<CacheConfig>): CacheManager {
    if (!this.instance) {
      this.instance = new CacheManager();
      if (config) {
        this.instance.config = { ...this.instance.config, ...config };
      }
    }
    return this.instance;
  }

  // Test utility method to reset singleton instance
  /**
   * Resets the singleton instance for testing purposes.
   * Only available in test and development environments.
   *
   * @function resetInstanceForTesting
   * @returns {void}
   * @example
   * ```typescript
   * // In test setup
   * CacheManager.resetInstanceForTesting();
   * ```
   */
  static resetInstanceForTesting(): void {
    if (
      process.env.NODE_ENV === "test" ||
      process.env.NODE_ENV === "development"
    ) {
      this.instance = undefined as unknown as CacheManager;
    }
  }

  /**
   * Retrieves data from cache with stale-while-revalidate support.
   *
   * @function get
   * @template T - The expected return type
   * @param {string} key - The cache key
   * @returns {Promise<T | null>} The cached data or null if not found/expired
   * @example
   * ```typescript
   * const userData = await cache.get<User>('user:123');
   * if (userData) {
   *   console.log('Found user:', userData.name);
   * }
   * ```
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();

    if (!entry) return null;

    // Return fresh data
    if (now < entry.expiresAt) {
      return entry.data as T;
    }

    // Return stale data if within staleWhileRevalidate window
    if (now < entry.expiresAt + this.config.staleWhileRevalidate) {
      Logger.info("Serving stale data", { key, age: now - entry.timestamp });
      return entry.data as T;
    }

    // Data is too old, remove it
    this.cache.delete(key);
    return null;
  }

  /**
   * Stores data in cache with automatic eviction if at capacity.
   *
   * @function set
   * @template T - The type of data being stored
   * @param {string} key - The cache key
   * @param {T} data - The data to store
   * @returns {void}
   * @example
   * ```typescript
   * cache.set('user:123', { id: 123, name: 'John Doe' });
   * ```
   */
  set<T>(key: string, data: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => a.timestamp - b.timestamp,
      )[0][0];
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.config.ttl,
    });
  }

  /**
   * Removes a specific entry from the cache.
   *
   * @function invalidate
   * @param {string} key - The cache key to remove
   * @returns {void}
   * @example
   * ```typescript
   * cache.invalidate('user:123'); // Remove specific user
   * ```
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clears all entries from the cache.
   *
   * @function invalidateAll
   * @returns {void}
   * @example
   * ```typescript
   * cache.invalidateAll(); // Clear entire cache
   * ```
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Removes cache entries whose age exceeds `ttl + staleWhileRevalidate`.
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt + this.config.staleWhileRevalidate) {
        this.cache.delete(key);
      }
    }
  }
}
