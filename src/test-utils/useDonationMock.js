// Mock for @/hooks/web3/useDonation
// Mapped via moduleNameMapper — useDonation is a jest.fn() so tests
// can call mockReturnValue to provide per-test donation state.
import { jest } from "@jest/globals";

export const useDonation = jest.fn(() => ({
  donate: jest.fn().mockResolvedValue(null),
  withdraw: jest.fn(),
  loading: false,
  approving: false,
  error: null,
}));

// Re-export DonationType enum stub so consumers that import it don't break
export const DonationType = { ONE_TIME: "ONE_TIME", RECURRING: "RECURRING" };
