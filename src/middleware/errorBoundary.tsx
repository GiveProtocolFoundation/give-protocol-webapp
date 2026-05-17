import React, { Component, ErrorInfo } from "react";
import { Logger } from "@/utils/logger";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * React Error Boundary component for catching and handling runtime errors
 * @class ErrorBoundary
 * @extends Component
 * @description Catches JavaScript errors anywhere in the child component tree,
 * logs error information, and displays a fallback UI instead of crashing the app
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  private errorCount = 0;

  /**
   * Initializes the boundary with a clean (no-error) state.
   * @param props - React component props, including the wrapped `children`.
   */
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  /** Derives error state from a caught error to trigger fallback UI. */
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  /** Logs caught errors with component stack trace for debugging. */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.errorCount++;
    Logger.error("React error boundary caught error", {
      error: {
        message: error.message,
        stack: error.stack,
      },
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      errorCount: this.errorCount,
    });
  }

  /**
   * Reloads the current page; used by the fallback UI as a last-resort recovery action.
   */
  static handleReload = () => {
    window.location.reload();
  };

  /** Renders children normally or a fallback UI when an error has been caught. */
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full p-6 bg-white rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Something went wrong
            </h2>
            <p className="text-gray-600 mb-4">
              {this.state.error?.message || "An unexpected error occurred"}
            </p>
            <button
              onClick={ErrorBoundary.handleReload}
              className="w-full bg-emerald-600 text-white py-2 px-4 rounded-md hover:bg-emerald-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
