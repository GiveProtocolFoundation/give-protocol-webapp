// Mock for @/services/adminAuditService
// Mapped via moduleNameMapper — each export is a jest.fn() for per-test overrides.
import { jest } from "@jest/globals";

export const getAdminAuditLog = jest.fn(() =>
  Promise.resolve({
    entries: [],
    totalCount: 0,
    page: 1,
    limit: 50,
    totalPages: 0,
  }),
);
export const insertAuditEntry = jest.fn(() => Promise.resolve(null));
export const logRead = jest.fn(() => Promise.resolve(null));
export const _resetDedupWindow = jest.fn();
