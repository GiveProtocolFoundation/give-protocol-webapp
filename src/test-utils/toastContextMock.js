// Mock for @/contexts/ToastContext
// Mapped via moduleNameMapper so all ToastContext imports get this mock.
// useToast is a jest.fn() so tests can call mockReturnValue to override per-test.
import { jest } from "@jest/globals";

export const useToast = jest.fn(() => ({
  showToast: jest.fn(() => "mock-toast-id"),
  dismissToast: jest.fn(),
}));

/** Mock ToastProvider pass-through */
export const ToastProvider = ({ children }) => children;

/** Stub for ToastContainer (noop in tests). */
export const ToastContainer = () => null;
