import { Logger } from "@/utils/logger";

/**
 * Performance monitoring utility for tracking operation durations and identifying slow operations.
 * Implements singleton pattern to maintain consistent performance tracking across the application.
 *
 * @class PerformanceMonitor
 * @description Collects and analyzes performance metrics for various operations, automatically
 * logging slow operations and providing statistical analysis of performance data.
 *
 * @example
 * ```typescript
 * const monitor = PerformanceMonitor.getInstance();
 *
 * // Measure operation duration
 * const startTime = performance.now();
 * await someOperation();
 * monitor.measureTime('database_query', performance.now() - startTime);
 *
 * // Get performance statistics
 * const stats = monitor.getMetrics('database_query');
 * console.log(`Average: ${stats?.avg}ms, 95th percentile: ${stats?.p95}ms`);
 * ```
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private readonly metrics: Map<string, number[]> = new Map();
  private readonly SAMPLE_SIZE = 100;

  /**
   * Private constructor to enforce the singleton pattern; use {@link PerformanceMonitor.getInstance} instead.
   */
  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Gets the singleton instance of PerformanceMonitor.
   *
   * @function getInstance
   * @returns {PerformanceMonitor} The singleton instance
   * @example
   * ```typescript
   * const monitor = PerformanceMonitor.getInstance();
   * ```
   */
  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Records the duration of an operation for performance tracking.
   * Automatically logs warnings for slow operations (>1000ms).
   *
   * @function measureTime
   * @param {string} operation - The name of the operation being measured
   * @param {number} duration - The duration of the operation in milliseconds
   * @returns {void}
   * @example
   * ```typescript
   * const startTime = performance.now();
   * await fetchData();
   * monitor.measureTime('api_call', performance.now() - startTime);
   * ```
   */
  measureTime(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }

    const samples = this.metrics.get(operation);
    if (!samples) {
      Logger.error("No samples array found for operation", { operation });
      return;
    }
    samples.push(duration);

    // Keep only last N samples
    if (samples.length > this.SAMPLE_SIZE) {
      samples.shift();
    }

    // Log slow operations
    if (duration > 1000) {
      Logger.warn("Slow operation detected", {
        operation,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Retrieves performance statistics for a specific operation.
   *
   * @function getMetrics
   * @param {string} operation - The operation name to get metrics for
   * @returns {{ avg: number; p95: number; max: number } | null} Performance statistics or null if no data exists
   * @example
   * ```typescript
   * const stats = monitor.getMetrics('database_query');
   * if (stats) {
   *   console.log(`Avg: ${stats.avg}ms, P95: ${stats.p95}ms, Max: ${stats.max}ms`);
   * }
   * ```
   */
  getMetrics(operation: string): {
    avg: number;
    p95: number;
    max: number;
  } | null {
    const samples = this.metrics.get(operation);
    if (!samples || samples.length === 0) return null;

    const sorted = [...samples].sort((a, b) => a - b);
    const p95Index = Math.floor(samples.length * 0.95);

    return {
      avg: samples.reduce((a, b) => a + b, 0) / samples.length,
      p95: sorted[p95Index],
      max: sorted[sorted.length - 1],
    };
  }
}
