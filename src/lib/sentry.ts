import * as Sentry from "@sentry/react";

/**
 * Initializes Sentry error tracking for production environments.
 * Skipped in development. Requires VITE_SENTRY_DSN to be configured.
 * Error-only mode: replay and performance tracing are disabled (ePrivacy).
 */
export function initSentry() {
  // Only initialize Sentry in production
  if (!import.meta.env.PROD) {
    console.log("Sentry: Skipping initialization in development");
    return;
  }

  // Check if DSN is configured
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn("Sentry: No DSN configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",

    // ePrivacy: disable performance tracing and session replay
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // No PII in default payloads; keep stacktraces for error diagnostics
    sendDefaultPii: false,
    attachStacktrace: true,

    integrations: [],

    // Filter out noise and sensitive data
    beforeSend(event) {
      // Filter out browser extension errors
      if (
        event.exception?.values?.[0]?.stacktrace?.frames?.some((frame) =>
          frame.filename?.includes("extension://"),
        )
      ) {
        return null;
      }

      // Filter out user cancellation errors (wallet rejections, etc.)
      if (
        event.exception?.values?.[0]?.value?.includes("User rejected") ||
        event.exception?.values?.[0]?.value?.includes("User denied")
      ) {
        return null;
      }

      // Filter out ResizeObserver warnings
      if (event.exception?.values?.[0]?.value?.includes("ResizeObserver")) {
        return null;
      }

      return event;
    },
  });

  console.log("Sentry: Initialized successfully");
}

// Helper functions for custom tracking
/**
 * Captures an error exception in Sentry (production) or logs to console (development).
 * @param error - The Error object to capture
 * @param context - Optional key-value metadata to attach to the error report
 */
export function trackError(error: Error, context?: Record<string, unknown>) {
  if (import.meta.env.PROD) {
    Sentry.withScope((scope) => {
      if (context) {
        scope.setContext("custom", context);
      }
      Sentry.captureException(error);
    });
  } else {
    console.error("Error tracked:", error, context);
  }
}

/**
 * Tracks a custom event with optional data as a breadcrumb in Sentry.
 * Only sends data in production environment.
 *
 * @function trackEvent
 * @param {string} name - The event name
 * @param {Record<string, unknown>} [data] - Optional event data
 * @returns {void}
 * @example
 * ```typescript
 * trackEvent('user_action', {
 *   action: 'button_click',
 *   component: 'navbar',
 *   timestamp: Date.now()
 * });
 * ```
 */
export function trackEvent(name: string, data?: Record<string, unknown>) {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      message: name,
      data,
      level: "info",
    });
  } else {
    console.log("Event tracked:", name, data);
  }
}

/**
 * Sets the current user context in Sentry for error tracking.
 * Only the opaque user ID is sent — no email or PII (ePrivacy).
 *
 * @param user - Object containing the user's UUID
 */
export function setUserContext(user: { id: string }) {
  if (import.meta.env.PROD) {
    Sentry.setUser({ id: user.id });
  }
}

/**
 * Clears the current user context from Sentry.
 * Only active in production environment.
 *
 * @function clearUserContext
 * @returns {void}
 * @example
 * ```typescript
 * clearUserContext(); // Called during logout
 * ```
 */
export function clearUserContext() {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
}

// Transaction tracking for Web3 operations
/**
 * Tracks a Web3 transaction lifecycle in Sentry as a breadcrumb.
 * Captures failed transactions as exceptions in production.
 * @param operation - Name of the transaction operation (e.g., "donate", "approve")
 * @param data - Optional transaction details including hash, amount, token, status
 * @returns Object with a `finish` method to record final transaction status
 */
export function trackTransaction(
  operation: string,
  data?: {
    transactionHash?: string;
    amount?: string;
    token?: string;
    charity?: string;
    charityId?: string;
    donationType?: string;
    status?: "pending" | "success" | "failed" | "started";
    error?: string;
  },
) {
  if (import.meta.env.PROD) {
    Sentry.addBreadcrumb({
      message: `Transaction: ${operation}`,
      data,
      level: data?.status === "failed" ? "error" : "info",
      category: "transaction",
    });

    // If transaction failed, also capture as an exception
    if (data?.status === "failed" && data?.error) {
      Sentry.captureException(
        new Error(`Transaction failed: ${operation} - ${data.error}`),
      );
    }
  } else {
    console.log(`Transaction tracked: ${operation}`, data);
  }

  // Return an object with a finish method for transaction lifecycle tracking
  return {
    finish: (status: "ok" | "error") => {
      if (import.meta.env.PROD) {
        Sentry.addBreadcrumb({
          message: `Transaction finished: ${operation}`,
          data: { ...data, finalStatus: status },
          level: status === "error" ? "error" : "info",
          category: "transaction",
        });
      } else {
        console.log(`Transaction finished: ${operation}`, { status, data });
      }
    },
  };
}

// Custom event capture for testing and debugging
/**
 * Captures a custom message event in Sentry with an optional breadcrumb and severity level.
 * @param message - The event message to capture
 * @param data - Optional key-value data to attach as a breadcrumb
 * @param level - Severity level: "info" (default), "warning", or "error"
 */
export function captureCustomEvent(
  message: string,
  data?: Record<string, unknown>,
  level: "info" | "warning" | "error" = "info",
) {
  if (import.meta.env.PROD) {
    Sentry.captureMessage(message, level);

    if (data) {
      Sentry.addBreadcrumb({
        message,
        data,
        level,
        category: "custom",
      });
    }
  } else {
    console.log(`Custom event: ${message}`, { level, data });
  }
}

// Aliases for AuthContext compatibility
/** Alias for setUserContext — sets the authenticated user in Sentry. */
export const setSentryUser = setUserContext;
/** Alias for clearUserContext — clears the authenticated user from Sentry. */
export const clearSentryUser = clearUserContext;
