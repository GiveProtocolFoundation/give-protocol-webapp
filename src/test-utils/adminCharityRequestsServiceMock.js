// Mock for @/services/adminCharityRequestsService
// Mapped via moduleNameMapper — each export is a jest.fn() for per-test overrides.
import { jest } from "@jest/globals";

export const listCharityRequests = jest.fn(() =>
  Promise.resolve({
    requests: [],
    totalCount: 0,
  }),
);
