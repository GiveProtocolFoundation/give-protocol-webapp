// Mock for @/utils/logger
// Mapped via moduleNameMapper so all Logger imports get jest.fn() spies.
import { jest } from "@jest/globals";

const loggerInstance = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

export const Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  createLogger: jest.fn(() => loggerInstance),
};
