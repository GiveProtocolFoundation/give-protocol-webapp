import { jest } from "@jest/globals";

// Shared spy so tests can assert on trackMetric calls across the suite.
// Exported as __mockTrackMetric for tests that need to verify metric tracking.
export const __mockTrackMetric = jest.fn();

const monitoringInstance = {
  trackError: jest.fn(),
  trackEvent: jest.fn(),
  trackMetric: __mockTrackMetric,
  setUser: jest.fn(),
};

export const MonitoringService = {
  getInstance: jest.fn(() => monitoringInstance),
};

export const getMonitoringService = jest.fn(() => monitoringInstance);
