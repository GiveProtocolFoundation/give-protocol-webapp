import React, { Component, ErrorInfo } from "react";
import i18next from "i18next";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "./ui/Button";
import { Logger } from "@/utils/logger";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (_error: Error, _errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  recoveryAttempts: number;
}

const MAX_RECOVERY_ATTEMPTS = 3;
const RECOVERY_COOLDOWN = 5000; // 5 seconds

/**
 * React error boundary that catches rendering errors and displays a fallback UI.
 * Supports optional custom fallback content, error callback, and limited auto-recovery attempts.
 */
export class ErrorBoundary extends Component<Props, State> {
  private lastRecoveryAttempt = 0;
  private cacheOperationsCount = 0;
  private navigationAttempts = 0;

  /**
   * Initializes the boundary with a clean error state and zero recovery attempts.
   * @param props - React component props, including the wrapped `children` and optional `onError` callback.
   */
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: 0,
    };
  }

  /** Derives error state from a caught error to trigger the fallback UI. */
  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * React lifecycle hook invoked when a descendant throws. Logs the error, invokes the
   * optional `onError` prop, stores the error in state, and triggers automatic recovery
   * for transient failure classes.
   * @param error - The error thrown by a descendant component.
   * @param errorInfo - React-supplied diagnostic metadata including the component stack.
   */
  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log detailed error information
    Logger.error("React error boundary caught error", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      location: window.location.href,
      timestamp: new Date().toISOString(),
      recoveryAttempts: this.state.recoveryAttempts,
    });

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      hasError: true,
    });

    // Attempt automatic recovery for certain errors
    if (this.canAttemptRecovery(error)) {
      this.attemptRecovery();
    }
  }

  /**
   * Decides whether the boundary should attempt automatic recovery for a given error.
   * Recoverable errors include chunk-loading, network, and timeout failures up to
   * {@link MAX_RECOVERY_ATTEMPTS}.
   * @param error - The error that was caught.
   * @returns `true` if recovery should be attempted.
   */
  private canAttemptRecovery(error: Error): boolean {
    // List of errors that we can attempt to recover from
    const recoverableErrors = [
      "ChunkLoadError", // Webpack chunk loading error
      "NetworkError",
      "TimeoutError",
      "SyntaxError", // Sometimes caused by malformed JSON
    ];

    return (
      this.state.recoveryAttempts < MAX_RECOVERY_ATTEMPTS &&
      (recoverableErrors.includes(error.name) ||
        error.message.includes("loading chunk") ||
        error.message.includes("dynamically imported module") ||
        error.message.includes("network"))
    );
  }

  /** Returns true when the error is a stale-chunk / dynamic-import failure. */
  private static isChunkError(error: Error): boolean {
    return (
      error.name === "ChunkLoadError" ||
      error.message.includes("loading chunk") ||
      error.message.includes("dynamically imported module")
    );
  }

  /**
   * Attempts to recover from a caught error, throttled by {@link RECOVERY_COOLDOWN}.
   * For chunk-load errors the page is reloaded; otherwise caches are cleared and the
   * error state is reset so children remount.
   */
  private readonly attemptRecovery = async () => {
    const now = Date.now();
    if (now - this.lastRecoveryAttempt < RECOVERY_COOLDOWN) {
      return;
    }

    this.lastRecoveryAttempt = now;
    this.setState((prev) => ({ recoveryAttempts: prev.recoveryAttempts + 1 }));

    try {
      // For chunk/import errors a full reload is needed so the browser
      // fetches fresh HTML with correct asset hashes.
      if (this.state.error && ErrorBoundary.isChunkError(this.state.error)) {
        await this.clearCache();
        window.location.reload();
        return;
      }

      // Clear cache and reload resources
      await this.clearCache();

      // Reset error state
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });

      // Log recovery attempt
      Logger.info("Attempted error recovery", {
        attempt: this.state.recoveryAttempts,
        timestamp: new Date().toISOString(),
      });
    } catch (recoveryError) {
      Logger.error("Recovery attempt failed", {
        error: recoveryError,
        attempt: this.state.recoveryAttempts,
      });
    }
  };

  /** Clears all browser caches to aid error recovery. */
  private async clearCache() {
    this.cacheOperationsCount++;
    if ("caches" in window) {
      try {
        const cacheKeys = await caches.keys();
        await Promise.all(cacheKeys.map((key) => caches.delete(key)));
      } catch (error) {
        Logger.error("Failed to clear cache", { error });
      }
    }
  }

  /**
   * Resets the boundary back to its initial, error-free state so children remount.
   */
  private readonly handleReset = () => {
    // Reset state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      recoveryAttempts: 0,
    });
  };

  /**
   * Navigates the browser to the application root, used as a last-resort recovery action.
   */
  private readonly handleNavigateHome = () => {
    this.navigationAttempts++;
    // Navigate to home page
    window.location.href = "/";
  };

  /** Renders children or an error fallback UI when an error has been caught. */
  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
              {i18next.t("error.somethingWrong")}
            </h2>
            <p className="text-gray-600 mb-6 text-center">
              {this.state.error?.message || i18next.t("error.unexpectedError")}
            </p>
            <div className="space-y-3">
              <Button
                onClick={this.handleReset}
                variant="secondary"
                className="w-full flex items-center justify-center"
                disabled={this.state.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {this.state.recoveryAttempts >= MAX_RECOVERY_ATTEMPTS
                  ? i18next.t("error.tooManyAttempts")
                  : i18next.t("error.tryAgain")}
              </Button>
              <Button
                onClick={this.handleNavigateHome}
                className="w-full flex items-center justify-center"
              >
                <Home className="h-4 w-4 mr-2" />
                {i18next.t("error.goHome")}
              </Button>
            </div>
            {process.env.NODE_ENV === "development" && this.state.errorInfo && (
              <details className="mt-4 p-4 bg-gray-50 rounded-md">
                <summary className="text-sm text-gray-700 cursor-pointer">
                  {i18next.t("error.details")}
                </summary>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto whitespace-pre-wrap">
                  {this.state.error?.stack}
                </pre>
                <pre className="mt-2 text-xs text-gray-600 overflow-auto whitespace-pre-wrap">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
