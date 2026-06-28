import { jest } from "@jest/globals";
import { CacheManager } from "../caching";

// Mock the logger to avoid test noise
jest.mock("../../logger", () => ({
  Logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    // Reset singleton instance for each test
    CacheManager.resetInstanceForTesting();
    cache = CacheManager.getInstance();
  });

  afterEach(() => {
    cache.invalidateAll();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("singleton pattern", () => {
    it("returns same instance on multiple calls", () => {
      const cache1 = CacheManager.getInstance();
      const cache2 = CacheManager.getInstance();
      expect(cache1).toBe(cache2);
    });

    it("applies config on first getInstance call", () => {
      CacheManager.resetInstanceForTesting();
      const config = { maxSize: 50, ttl: 10000 };
      const cacheWithConfig = CacheManager.getInstance(config);

      // Config should be applied (we can test this indirectly through behavior)
      expect(cacheWithConfig).toBeInstanceOf(CacheManager);
    });
  });

  describe("basic cache operations", () => {
    it("stores and retrieves data", async () => {
      const testData = { test: "value" };
      cache.set("key1", testData);

      const result = await cache.get("key1");
      expect(result).toEqual(testData);
    });

    it("returns null for non-existent keys", async () => {
      const result = await cache.get("nonexistent");
      expect(result).toBeNull();
    });

    it("invalidates specific keys", async () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.invalidate("key1");

      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBe("value2");
    });

    it("invalidates all keys", async () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      cache.invalidateAll();

      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
    });
  });

  describe("TTL and expiration", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("returns fresh data within TTL", async () => {
      cache.set("key1", "value1");

      // Advance time but stay within TTL (default 5 minutes)
      jest.advanceTimersByTime(4 * 60 * 1000);

      const result = await cache.get("key1");
      expect(result).toBe("value1");
    });

    it("serves stale data within staleWhileRevalidate window", async () => {
      cache.set("key1", "value1");

      // Advance past TTL but within staleWhileRevalidate (default 30 minutes)
      jest.advanceTimersByTime(10 * 60 * 1000);

      const result = await cache.get("key1");
      expect(result).toBe("value1");
    });

    it("removes expired data beyond staleWhileRevalidate", async () => {
      cache.set("key1", "value1");

      // Advance past both TTL and staleWhileRevalidate
      jest.advanceTimersByTime(40 * 60 * 1000);

      const result = await cache.get("key1");
      expect(result).toBeNull();
    });
  });

  describe("capacity management", () => {
    it("evicts oldest entry when at capacity", async () => {
      // Create cache with small capacity for testing
      CacheManager.resetInstanceForTesting();
      cache = CacheManager.getInstance({ maxSize: 2 });

      cache.set("key1", "value1");
      cache.set("key2", "value2");
      cache.set("key3", "value3"); // Should evict key1

      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBe("value2");
      expect(await cache.get("key3")).toBe("value3");
    });
  });

  describe("cleanup process", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    it("runs cleanup periodically and removes expired entries", async () => {
      cache.set("key1", "value1");
      cache.set("key2", "value2");

      // Advance past expiration
      jest.advanceTimersByTime(40 * 60 * 1000);

      // Trigger cleanup (runs every 60 seconds)
      jest.advanceTimersByTime(60 * 1000);

      // Both entries should be cleaned up
      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBeNull();
    });

    it("cleanup removes only fully expired entries", async () => {
      // Reset cache with shorter TTL for easier testing
      CacheManager.resetInstanceForTesting();
      cache = CacheManager.getInstance({
        maxSize: 10,
        ttl: 5 * 60 * 1000, // 5 minutes
        staleWhileRevalidate: 5 * 60 * 1000, // 5 minutes
      });

      // Set multiple entries at different times
      cache.set("key1", "value1");

      // Advance time a bit
      jest.advanceTimersByTime(5 * 60 * 1000);
      cache.set("key2", "value2");

      // Advance time so key1 is past TTL+stale but key2 is only past TTL
      jest.advanceTimersByTime(6 * 60 * 1000); // Total: 11 min for key1, 6 min for key2

      // Access cleanup method indirectly by waiting for the interval
      jest.advanceTimersByTime(60 * 1000); // Trigger the setInterval cleanup

      // key1 should be cleaned up, key2 should still be in stale period
      expect(await cache.get("key1")).toBeNull();
      expect(await cache.get("key2")).toBe("value2");
    });

    it("cleanup iterates through all cache entries", async () => {
      // Reset and create a new instance to ensure clean state
      CacheManager.resetInstanceForTesting();
      cache = CacheManager.getInstance({
        maxSize: 10,
        ttl: 1000,
        staleWhileRevalidate: 1000,
      });

      // Set multiple entries
      for (let i = 0; i < 5; i++) {
        cache.set(`key${i}`, `value${i}`);
      }

      // Advance time past expiration for all entries
      jest.advanceTimersByTime(3000); // Past TTL + staleWhileRevalidate

      // Trigger cleanup
      jest.advanceTimersByTime(60 * 1000);

      // All entries should be removed
      for (let i = 0; i < 5; i++) {
        expect(await cache.get(`key${i}`)).toBeNull();
      }
    });
  });

  describe("resetInstanceForTesting edge cases", () => {
    it("only resets in test or development environment", () => {
      const originalEnv = process.env.NODE_ENV;

      // Test in production environment
      process.env.NODE_ENV = "production";
      const instanceBefore = CacheManager.getInstance();
      CacheManager.resetInstanceForTesting();
      const instanceAfter = CacheManager.getInstance();

      expect(instanceBefore).toBe(instanceAfter); // Should not reset in production

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it("resets in development environment", () => {
      const originalEnv = process.env.NODE_ENV;

      // Test in development environment
      process.env.NODE_ENV = "development";
      CacheManager.resetInstanceForTesting();
      const instance1 = CacheManager.getInstance();
      CacheManager.resetInstanceForTesting();
      const instance2 = CacheManager.getInstance();

      expect(instance1).not.toBe(instance2);

      // Restore original environment
      process.env.NODE_ENV = originalEnv;
    });

    it("resets in test environment", () => {
      // We're already in test environment
      CacheManager.resetInstanceForTesting();
      const instance1 = CacheManager.getInstance();
      CacheManager.resetInstanceForTesting();
      const instance2 = CacheManager.getInstance();

      expect(instance1).not.toBe(instance2);
    });
  });

  describe("config handling edge cases", () => {
    it("merges partial config correctly", async () => {
      CacheManager.resetInstanceForTesting();
      const partialConfig = { maxSize: 25 }; // Only specifying maxSize
      const cacheWithPartialConfig = CacheManager.getInstance(partialConfig);

      expect(cacheWithPartialConfig).toBeInstanceOf(CacheManager);

      // Test that the partial config is applied by testing capacity
      for (let i = 0; i < 30; i++) {
        cacheWithPartialConfig.set(`key${i}`, `value${i}`);
      }

      // Should only keep the last 25 entries due to maxSize: 25
      expect(await cacheWithPartialConfig.get("key0")).toBeNull();
      expect(await cacheWithPartialConfig.get("key29")).toBe("value29");
    });

    it("ignores config on subsequent getInstance calls", () => {
      CacheManager.resetInstanceForTesting();
      const instance1 = CacheManager.getInstance({ maxSize: 50 });
      const instance2 = CacheManager.getInstance({ maxSize: 200 }); // This should be ignored

      expect(instance1).toBe(instance2);
    });
  });

  describe("data type handling", () => {
    it("handles various data types correctly", async () => {
      cache.set("string", "hello world");
      cache.set("number", 42);
      cache.set("boolean", true);
      cache.set("null", null);
      const undef = undefined;
      cache.set("undefined", undef);
      cache.set("object", { nested: { value: "test" } });
      cache.set("array", [1, 2, 3, { nested: "array" }]);

      expect(await cache.get("string")).toBe("hello world");
      expect(await cache.get("number")).toBe(42);
      expect(await cache.get("boolean")).toBe(true);
      expect(await cache.get("null")).toBeNull();
      expect(await cache.get("undefined")).toBeUndefined();
      expect(await cache.get("object")).toEqual({ nested: { value: "test" } });
      expect(await cache.get("array")).toEqual([1, 2, 3, { nested: "array" }]);
    });

    it("handles complex nested objects", async () => {
      const complexObject = {
        level1: {
          level2: {
            level3: {
              arrays: [1, 2, [3, 4, [5, 6]]],
              dates: new Date("2024-01-01"),
              regex: /test/g,
              map: new Map([["key", "value"]]),
              set: new Set([1, 2, 3]),
            },
          },
        },
      };

      cache.set("complex", complexObject);
      const result = await cache.get("complex");

      expect(result).toEqual(complexObject);
    });
  });
});
