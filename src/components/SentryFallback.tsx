/* eslint-disable react/prop-types -- props are typed via Sentry.FallbackRender; eslint's prop-types check doesn't see TS-only signatures */
import type * as Sentry from "@sentry/react";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * Top-level fallback rendered when Sentry's error boundary traps an
 * unhandled exception. Exported separately so it can be unit-tested
 * without bringing up the full provider tree from App.
 */
export const SentryFallback: Sentry.FallbackRender = ({
  error,
  resetError,
}) => (
  <ErrorBoundary fallback={null}>
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Something went wrong
        </h2>
        <p className="text-gray-600 mb-6">
          {error instanceof Error
            ? error.message
            : "An unexpected error occurred"}
        </p>
        <button
          onClick={resetError}
          className="bg-emerald-600 text-white px-4 py-2 rounded hover:bg-emerald-700"
        >
          Try Again
        </button>
      </div>
    </div>
  </ErrorBoundary>
);
