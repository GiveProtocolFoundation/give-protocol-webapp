// Monitoring service for application performance and error tracking
export interface MonitoringConfig {
  apiKey: string;
  appId: string;
  environment: string;
  enabledMonitors: string[];
}

export interface MonitoringMetrics {
  timestamp: number;
  event: string;
  data: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

/**
 * Application monitoring service for performance tracking, error monitoring, and user interaction analytics.
 * Implements singleton pattern to ensure consistent monitoring across the application.
 *
 * @class MonitoringService
 * @description Provides comprehensive monitoring capabilities including performance metrics,
 * error tracking, and user interaction monitoring. Integrates with external monitoring services
 * in production and provides local logging in development.
 *
 * @example
 * ```typescript
 * const config = {
 *   apiKey: 'your-api-key',
 *   appId: 'your-app-id',
 *   environment: 'production',
 *   enabledMonitors: ['performance', 'errors', 'interactions']
 * };
 *
 * const monitor = MonitoringService.getInstance(config);
 * monitor.trackMetric('user_action', { action: 'button_click', component: 'navbar' });
 * ```
 */
export class MonitoringService {
  private static instance: MonitoringService | null = null;
  private config: MonitoringConfig | null = null;
  private initialized = false;
  private metricsCache: MonitoringMetrics[] = [];
  private currentUserId: string | undefined = undefined;
  private currentSessionId: string | undefined = undefined;

  /**
   * Private constructor to enforce the singleton pattern; use {@link MonitoringService.getInstance} instead.
   */
  private constructor() {
    // Private constructor to enforce singleton pattern
  }

  /**
   * Gets the singleton instance of MonitoringService.
   *
   * @function getInstance
   * @param {MonitoringConfig} [config] - Optional configuration to initialize the service
   * @returns {MonitoringService} The singleton instance
   * @example
   * ```typescript
   * const monitor = MonitoringService.getInstance({
   *   apiKey: 'key',
   *   appId: 'app',
   *   environment: 'production',
   *   enabledMonitors: ['performance']
   * });
   * ```
   */
  static getInstance(config?: MonitoringConfig): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }

    if (config && !MonitoringService.instance.initialized) {
      MonitoringService.instance.initialize(config);
    }

    return MonitoringService.instance;
  }

  /**
   * Applies the supplied configuration, marks the service as initialized, and starts the enabled monitors.
   * @param config - The monitoring configuration to apply.
   */
  private initialize(config: MonitoringConfig): void {
    this.config = config;
    this.initialized = true;

    // Only log in development, in production this would integrate with monitoring service
    if (import.meta.env.DEV) {
      console.log("MonitoringService initialized with config:", {
        appId: config.appId,
        environment: config.environment,
        enabledMonitors: config.enabledMonitors,
      });
    }

    // Start monitoring if enabled
    this.startMonitoring();
  }

  /**
   * Starts the monitors enabled in the active configuration (performance, errors, interactions).
   */
  private startMonitoring(): void {
    if (!this.config || !this.initialized) return;

    // Performance monitoring
    if (this.config.enabledMonitors.includes("performance")) {
      this.monitorPerformance();
    }

    // Error monitoring (already handled by Sentry)
    if (this.config.enabledMonitors.includes("errors")) {
      this.monitorErrors();
    }

    // User interaction monitoring
    if (this.config.enabledMonitors.includes("interactions")) {
      this.monitorInteractions();
    }
  }

  /**
   * Initializes Core Web Vitals tracking and records the start of performance monitoring.
   */
  private monitorPerformance(): void {
    // Monitor Core Web Vitals
    if ("web-vitals" in window || typeof window !== "undefined") {
      // This would integrate with web-vitals library in a real implementation
      this.trackMetric("performance_monitoring_started", {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  /**
   * Registers global handlers to record uncaught JavaScript errors and unhandled promise rejections.
   */
  private monitorErrors(): void {
    // Global error handler (supplement to Sentry)
    window.addEventListener("error", (event) => {
      this.trackMetric("javascript_error", {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: Date.now(),
      });
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.trackMetric("unhandled_promise_rejection", {
        reason: event.reason?.toString() || "Unknown reason",
        timestamp: Date.now(),
      });
    });
  }

  /**
   * Attaches a document-level click listener that records interactions with buttons and anchor elements.
   */
  private monitorInteractions(): void {
    // Track key user interactions
    document.addEventListener("click", (event) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "BUTTON" ||
        target.tagName === "A" ||
        target.closest("button") ||
        target.closest("a")
      ) {
        this.trackMetric("user_interaction", {
          type: "click",
          element: target.tagName.toLowerCase(),
          text: target.textContent?.trim().substring(0, 50) || "",
          timestamp: Date.now(),
        });
      }
    });
  }

  /**
   * Tracks a custom metric with associated data.
   *
   * @function trackMetric
   * @param {string} event - The event name to track
   * @param {Record<string, unknown>} data - Additional data associated with the event
   * @returns {void}
   * @example
   * ```typescript
   * monitor.trackMetric('user_action', {
   *   action: 'click',
   *   component: 'navigation',
   *   timestamp: Date.now()
   * });
   * ```
   */
  public trackMetric(event: string, data: Record<string, unknown>): void {
    if (!this.initialized || !this.config) return;

    const metric: MonitoringMetrics = {
      timestamp: Date.now(),
      event,
      data,
      userId: this.getCurrentUserId(),
      sessionId: this.getCurrentSessionId(),
    };

    // In development, just log to console
    if (import.meta.env.DEV) {
      console.log("MonitoringService metric:", metric);
      return;
    }

    // In production, this would send to your monitoring service
    this.sendMetric(metric);
  }

  /**
   * Persists a metric to the in-memory cache and local storage, trimming each to the most recent 100 entries.
   * @param metric - The metric entry to store.
   */
  private sendMetric(metric: MonitoringMetrics): void {
    // This would send metrics to your monitoring backend
    // For now, store in localStorage as fallback and cache in instance
    try {
      this.metricsCache.push(metric);

      // Keep only last 100 metrics to prevent memory bloat
      if (this.metricsCache.length > 100) {
        this.metricsCache.splice(0, this.metricsCache.length - 100);
      }

      // Also persist to localStorage
      const existingMetrics = this.exportMetrics();
      existingMetrics.push(metric);
      if (existingMetrics.length > 100) {
        existingMetrics.splice(0, existingMetrics.length - 100);
      }
      localStorage.setItem(
        "monitoring_metrics",
        JSON.stringify(existingMetrics),
      );
    } catch (error) {
      console.warn("Failed to store monitoring metric:", error);
    }
  }

  /**
   * Returns the current user ID from cache or the `give_docs_user_id` cookie, if available.
   * @returns The user ID string, or `undefined` when no value can be resolved.
   */
  private getCurrentUserId(): string | undefined {
    // Get user ID from cache or fetch from localStorage/auth context
    if (this.currentUserId) {
      return this.currentUserId;
    }

    try {
      const userCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("give_docs_user_id="));
      this.currentUserId = userCookie?.split("=")[1];
      return this.currentUserId;
    } catch {
      return undefined;
    }
  }

  /**
   * Returns the current session ID from cache or the `give_docs_session_id` cookie, if available.
   * @returns The session ID string, or `undefined` when no value can be resolved.
   */
  private getCurrentSessionId(): string | undefined {
    // Get session ID from cache or fetch from localStorage/auth context
    if (this.currentSessionId) {
      return this.currentSessionId;
    }

    try {
      const sessionCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("give_docs_session_id="));
      this.currentSessionId = sessionCookie?.split("=")[1];
      return this.currentSessionId;
    } catch {
      return undefined;
    }
  }

  /**
   * Exports all collected metrics for analysis or reporting.
   *
   * @function exportMetrics
   * @returns {MonitoringMetrics[]} Array of all collected metrics
   * @example
   * ```typescript
   * const metrics = monitor.exportMetrics();
   * console.log(`Collected ${metrics.length} metrics`);
   * ```
   */
  public exportMetrics(): MonitoringMetrics[] {
    try {
      // Return both cached metrics and persisted metrics
      const persistedMetrics = JSON.parse(
        localStorage.getItem("monitoring_metrics") || "[]",
      );
      return [...this.metricsCache, ...persistedMetrics];
    } catch {
      return this.metricsCache.slice(); // Return copy of cached metrics
    }
  }

  /**
   * Clears all stored metrics from memory and localStorage.
   *
   * @function clearMetrics
   * @returns {void}
   * @example
   * ```typescript
   * monitor.clearMetrics(); // Reset monitoring data
   * ```
   */
  public clearMetrics(): void {
    this.metricsCache = [];
    localStorage.removeItem("monitoring_metrics");
  }
}

/**
 * Gets the MonitoringService singleton instance.
 *
 * @function getMonitoringService
 * @returns {MonitoringService} The singleton monitoring service instance
 * @example
 * ```typescript
 * import { getMonitoringService } from './monitoring';
 *
 * const monitor = getMonitoringService();
 * monitor.trackMetric('page_view', { path: window.location.pathname });
 * ```
 */
export const getMonitoringService = () => MonitoringService.getInstance();
