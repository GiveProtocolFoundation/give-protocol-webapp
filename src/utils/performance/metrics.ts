import { Logger } from "@/utils/logger";

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

/**
 * Advanced performance metrics collection system with automatic browser API integration.
 * Tracks detailed performance data and automatically monitors long tasks using Performance Observer API.
 *
 * @class PerformanceMetrics
 * @description Collects comprehensive performance metrics including custom measurements and
 * automatic browser performance monitoring. Integrates with Performance Observer API to track
 * long tasks and provides detailed performance analysis capabilities.
 *
 * @example
 * ```typescript
 * const metrics = PerformanceMetrics.getInstance();
 *
 * // Measure operation timing
 * const startTime = performance.now();
 * await someOperation();
 * metrics.measureTime('api_request', startTime);
 *
 * // Get performance data
 * const apiMetrics = metrics.getMetrics('api_request');
 * const averageTime = metrics.getAverageMetric('api_request');
 * console.log(`Average API request time: ${averageTime}ms`);
 * ```
 */
export class PerformanceMetrics {
  private static instance: PerformanceMetrics;
  private readonly metrics: PerformanceMetric[] = [];
  private readonly MAX_METRICS = 1000;

  /**
   * Private constructor that wires up the `PerformanceObserver` instances tracked by this service.
   */
  private constructor() {
    this.initializeObservers();
  }

  /**
   * Gets the singleton instance of PerformanceMetrics.
   *
   * @function getInstance
   * @returns {PerformanceMetrics} The singleton instance
   * @example
   * ```typescript
   * const metrics = PerformanceMetrics.getInstance();
   * ```
   */
  static getInstance(): PerformanceMetrics {
    if (!this.instance) {
      this.instance = new PerformanceMetrics();
    }
    return this.instance;
  }

  /**
   * Measures the time elapsed since a start time and records the metric.
   * Automatically logs warnings for slow operations (>1000ms).
   *
   * @function measureTime
   * @param {string} name - The name of the operation being measured
   * @param {number} startTime - The start time from performance.now()
   * @returns {void}
   * @example
   * ```typescript
   * const startTime = performance.now();
   * await fetchData();
   * metrics.measureTime('data_fetch', startTime);
   * ```
   */
  measureTime(name: string, startTime: number): void {
    const duration = performance.now() - startTime;
    this.addMetric(name, duration);

    // Log slow operations
    if (duration > 1000) {
      Logger.warn("Slow operation detected", {
        operation: name,
        duration,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /** Records a named metric value and evicts the oldest entry when at capacity */
  private addMetric(name: string, value: number): void {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
    });

    // Keep only last N metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics.shift();
    }
  }

  /**
   * Registers a `PerformanceObserver` for `longtask` entries when the runtime supports them.
   */
  private initializeObservers(): void {
    // Performance Observer for long tasks
    if (PerformanceObserver.supportedEntryTypes.includes("longtask")) {
      new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          this.addMetric("LongTask", entry.duration);
        });
      }).observe({ entryTypes: ["longtask"] });
    }
  }

  /**
   * Retrieves performance metrics, optionally filtered by metric name.
   *
   * @function getMetrics
   * @param {string} [name] - Optional metric name to filter by
   * @returns {PerformanceMetric[]} Array of performance metrics
   * @example
   * ```typescript
   * // Get all metrics
   * const allMetrics = metrics.getMetrics();
   *
   * // Get specific metrics
   * const apiMetrics = metrics.getMetrics('api_call');
   * ```
   */
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter((metric) => metric.name === name);
    }
    return this.metrics;
  }

  /**
   * Calculates the average value for a specific metric.
   *
   * @function getAverageMetric
   * @param {string} name - The metric name to calculate average for
   * @returns {number} The average value, or 0 if no metrics exist
   * @example
   * ```typescript
   * const avgResponseTime = metrics.getAverageMetric('api_response');
   * console.log(`Average response time: ${avgResponseTime}ms`);
   * ```
   */
  getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;

    const sum = metrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / metrics.length;
  }
}
