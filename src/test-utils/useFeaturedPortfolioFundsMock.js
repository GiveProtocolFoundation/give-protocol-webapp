// Mock for @/hooks/useFeaturedPortfolioFunds
// Mapped via moduleNameMapper — useFeaturedPortfolioFunds is a jest.fn() for per-test overrides.
import { jest } from "@jest/globals";

export const useFeaturedPortfolioFunds = jest.fn(() => ({
  funds: [],
  loading: false,
  error: null,
}));
