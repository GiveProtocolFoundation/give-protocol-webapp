// Mock for @/hooks/useFeaturedCauses
// Mapped via moduleNameMapper — useFeaturedCauses is a jest.fn() for per-test overrides.
import { jest } from "@jest/globals";

export const useFeaturedCauses = jest.fn(() => ({
  causes: [],
  loading: false,
  error: null,
}));
