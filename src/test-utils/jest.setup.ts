import "@testing-library/jest-dom";
import { jest } from "@jest/globals";
import type React from "react";

// Mock MultiChainContext to prevent errors in tests. Use jest.fn() so tests
// can override the return value with mockReturnValue.
jest.mock("@/contexts/MultiChainContext", () => ({
  useMultiChainContext: jest.fn(() => ({
    wallet: null,
    accounts: [],
    activeAccount: null,
    activeChainType: "evm",
    isConnected: false,
    isConnecting: false,
    error: null,
    connect: jest.fn(),
    disconnect: jest.fn(),
    switchAccount: jest.fn(),
    switchChainType: jest.fn(),
    switchChain: jest.fn(),
    clearError: jest.fn(),
  })),
  MultiChainProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock useUnifiedWallets hook. Use jest.fn() so tests can override per-test.
jest.mock("@/hooks/useWallet", () => {
  const originalModule = jest.requireActual("@/hooks/useWallet");
  return {
    ...originalModule,
    useUnifiedWallets: jest.fn(() => ({
      wallets: [],
      isLoading: false,
    })),
  };
});

// Set required environment variables for tests
process.env.VITE_SUPABASE_URL =
  process.env.VITE_SUPABASE_URL || "https://mock-supabase-url.supabase.co";
process.env.VITE_SUPABASE_ANON_KEY =
  process.env.VITE_SUPABASE_ANON_KEY || "mock-supabase-anon-key";
process.env.VITE_DOCS_URL =
  process.env.VITE_DOCS_URL || "https://mock-docs-url.com";
process.env.VITE_MOONBASE_RPC_URL =
  process.env.VITE_MOONBASE_RPC_URL ||
  "https://rpc.api.moonbase.moonbeam.network";

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
})) as unknown as typeof IntersectionObserver;

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  unobserve: jest.fn(),
})) as unknown as typeof ResizeObserver;

// Mock PerformanceObserver
global.PerformanceObserver = jest.fn().mockImplementation(() => ({
  disconnect: jest.fn(),
  observe: jest.fn(),
  takeRecords: jest.fn(() => []),
})) as unknown as typeof PerformanceObserver;
(
  global.PerformanceObserver as unknown as { supportedEntryTypes: string[] }
).supportedEntryTypes = [];
