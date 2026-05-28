// Mock for @/hooks/useCharityWallets
// Mapped via moduleNameMapper — useCharityWallets is a jest.fn() for per-test overrides.
import { jest } from "@jest/globals";

export const useCharityWallets = jest.fn(() => ({
  wallets: [],
  loading: false,
  error: null,
  fetchWallets: jest.fn().mockResolvedValue([]), // skipcq: JS-W1042 — mockResolvedValue requires an argument
  fetchPrimaryWallet: jest.fn().mockResolvedValue(null), // skipcq: JS-W1042 — mockResolvedValue requires an argument
  addVerifiedWallet: jest.fn().mockResolvedValue(null), // skipcq: JS-W1042 — mockResolvedValue requires an argument
  addInstitutionalWallet: jest.fn().mockResolvedValue(null), // skipcq: JS-W1042 — mockResolvedValue requires an argument
  setPrimary: jest.fn().mockResolvedValue(true), // skipcq: JS-W1042 — mockResolvedValue requires an argument
  deleteWallet: jest.fn().mockResolvedValue(true), // skipcq: JS-W1042 — mockResolvedValue requires an argument
}));
