// Mock for @/hooks/useUnifiedAuth
// Mapped via moduleNameMapper so all useUnifiedAuth imports get this mock.
// useUnifiedAuth is a jest.fn() so tests can call mockReturnValue to override per-test.
import { jest } from "@jest/globals";

export const useUnifiedAuth = jest.fn(() => ({
  user: null,
  isAuthenticated: false,
  authMethod: null,
  email: null,
  walletAddress: null,
  isWalletConnected: false,
  isWalletLinked: false,
  isPasskeySupported: true,
  chainId: null,
  role: "donor",
  loading: false,
  walletAuthStep: null,
  error: null,
  signInWithEmail: jest.fn(),
  signUpWithEmail: jest.fn(),
  signInWithWallet: jest.fn(),
  signInWithPasskey: jest.fn(),
  registerPasskey: jest.fn(),
  signInWithGoogle: jest.fn(),
  signInWithApple: jest.fn(),
  linkWallet: jest.fn(),
  unlinkWallet: jest.fn(),
  signOut: jest.fn(),
}));
