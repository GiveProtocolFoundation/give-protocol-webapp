import { jest } from "@jest/globals";

export const MonitoringService = {
  getInstance: jest.fn(() => ({
    trackError: jest.fn(),
    trackEvent: jest.fn(),
    setUser: jest.fn(),
  })),
};

export const getMonitoringService = jest.fn(() => ({
  trackError: jest.fn(),
  trackEvent: jest.fn(),
  trackMetric: jest.fn(),
  setUser: jest.fn(),
}));
