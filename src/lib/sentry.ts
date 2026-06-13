import * as Sentry from "@sentry/react";

// ---------------------------------------------------------------------------
// Module state — tracks whether Phase B (analytics) integrations are active
// ---------------------------------------------------------------------------
let analyticsEnabled = false;

// ---------------------------------------------------------------------------
// Phase A – error-only baseline (called once at startup)
// ---------------------------------------------------------------------------

/**
 * Initializes Sentry Phase A: error capture only, no PII, no replay,
 * no performance tracing. Safe to call before consent is collected.
 */
export function initSentry() {
  if (!import.meta.env.PROD) {
    console.log("Sentry: Skipping initialization in development");
    return;
  }

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) {
    console.warn("Sentry: No DSN configured, skipping initialization");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION || "1.0.0",

    // Phase A: no performance tracing, no replay
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // No PII by default
    sendDefaultPii: false,
    attachStacktrace: true,

    // No analytics integrations at init time
    integrations: [],

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

    beforeSendTransaction(event) {
      // Remove sensitive headers
      if (event.request?.headers) {
        const {
          Authorization: _auth,
          Cookie: _cookie,
          "X-API-Key": _apiKey,
          ...safeHeaders
        } = event.request.headers;
        event.request.headers = safeHeaders;
      }
      return event;
    },
  });

  console.log("Sentry: Initialized (Phase A — errors only)");
}

// ---------------------------------------------------------------------------
// Phase B – consent-gated analytics integrations
// ---------------------------------------------------------------------------

/**
 * Enables Sentry replay + perf tracing after the user consents to analytics.
 * Idempotent: no-ops if already enabled or not in production.
 * Only the opaque user ID is sent — no email or PII (consent copy guarantee).
 * @param user - Object containing the user's opaque ID
 */
export function enableAnalyticsIntegrations(user: { id: string }): void {
  if (!import.meta.env.PROD || analyticsEnabled) return;

  Sentry.addIntegration(
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  );
  Sentry.addIntegration(Sentry.browserTracingIntegration());

  Sentry.setUser({ id: user.id });

  analyticsEnabled = true;
  console.log("Sentry: Phase B analytics integrations enabled");
}

/**
 * Disables Phase B integrations on consent withdrawal.
 * Closes the current Sentry client (flushing in-flight envelopes),
 * re-inits Phase A, and reloads the page so that no stale replay/tracing
 * state leaks.
 */
export async function disableAnalyticsIntegrations(): Promise<void> {
  if (!import.meta.env.PROD) return;

  analyticsEnabled = false;

  await Sentry.close();
  initSentry();
  window.location.reload();
}

/** Returns whether Phase B (analytics) integrations are currently active. */
export function isAnalyticsEnabled(): boolean {
  return analyticsEnabled;
}

// ---------------------------------------------------------------------------
// User context helpers
// ---------------------------------------------------------------------------

/**
 * Sets an opaque user ID in Sentry (Phase A level — no email/PII).
 * @param user - Object with user id
 */
export function setSentryUser(user: { id: string }): void {
  if (import.meta.env.PROD) {
    Sentry.setUser({ id: user.id });
  }
}

/** Clears the current user context from Sentry. */
export function clearSentryUser(): void {
  if (import.meta.env.PROD) {
    Sentry.setUser(null);
  }
}

// ---------------------------------------------------------------------------
// Existing helper functions (unchanged API surface)
// ---------------------------------------------------------------------------

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
 * @param name - The event name
 * @param data - Optional event data
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
 * Tracks a Web3 transaction lifecycle in Sentry as a breadcrumb.
 * @param operation - Name of the transaction operation
 * @param data - Optional transaction details
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

    if (data?.status === "failed" && data?.error) {
      Sentry.captureException(
        new Error(`Transaction failed: ${operation} - ${data.error}`),
      );
    }
  } else {
    console.log(`Transaction tracked: ${operation}`, data);
  }

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

/**
 * Captures a custom message event in Sentry with optional breadcrumb and severity.
 * @param message - The event message to capture
 * @param data - Optional key-value data to attach
 * @param level - Severity level
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
