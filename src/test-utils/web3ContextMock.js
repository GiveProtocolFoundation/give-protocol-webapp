// Mock for @/contexts/Web3Context
// Mapped via moduleNameMapper so all Web3Context imports get this mock.
// useWeb3 is a jest.fn() so tests can call mockReturnValue to override per-test.
import { jest } from "@jest/globals";

export const useWeb3 = jest.fn(() => ({
  provider: null,
  signer: null,
  address: null,
  chainId: 8453,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchChain: jest.fn(),
}));

/** Mock Web3Provider pass-through */
export const Web3Provider = ({ children }) => children;
