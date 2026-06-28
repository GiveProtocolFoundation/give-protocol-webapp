// Mock for @/hooks/web3/useTokenBalance
// Mapped via moduleNameMapper — useTokenBalance is a jest.fn() so tests
// can call mockReturnValue to provide per-test balance state.
import { jest } from "@jest/globals";

export const useTokenBalance = jest.fn(() => ({
  balance: 100,
  isLoading: false,
}));
