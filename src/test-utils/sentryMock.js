// Mock for @/lib/sentry module
// Provides no-op implementations of all Sentry helper functions
import { jest } from "@jest/globals";

export function initSentry() {
  // No-op in tests
}

export function trackError(_error, _context) {
  // No-op in tests
}

export function trackEvent(_name, _data) {
  // No-op in tests
}

export function setUserContext(_user) {
  // No-op in tests
}

export function clearUserContext() {
  // No-op in tests
}

/** Mock: returns a no-op transaction handle */
export function trackTransaction(_operation, _data) {
  return {
    finish: () => {
      // No-op in tests
    },
  };
}

export function captureCustomEvent(_message, _data, _level) {
  // No-op in tests
}

// Aliases for AuthContext compatibility — jest.fn() for toHaveBeenCalledWith assertions
export const setSentryUser = jest.fn();
export const clearSentryUser = jest.fn();

// Phase B consent-gated integrations — jest.fn() for SentryConsentReactor assertions
export const enableAnalyticsIntegrations = jest.fn();
export const disableAnalyticsIntegrations = jest.fn();
export const isAnalyticsEnabled = jest.fn(() => false);
