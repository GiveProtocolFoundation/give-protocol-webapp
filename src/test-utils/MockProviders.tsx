/* eslint-disable react-refresh/only-export-components */
/**
 * Mock providers for testing components that require context
 * This file provides lightweight mock implementations of all app contexts
 */

import React, { createContext } from "react";
import { BrowserRouter, MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { jest } from "@jest/globals";

// ============================================================================
// Mock Context Values
// ============================================================================

/**
 * Default mock values for SettingsContext
 */
export const mockSettingsContextValue = {
  language: "en" as const,
  setLanguage: jest.fn(),
  currency: "USD" as const,
  setCurrency: jest.fn(),
  theme: "light" as const,
  setTheme: jest.fn(),
  languageOptions: [{ value: "en", label: "English" }],
  currencyOptions: [{ value: "USD", label: "US Dollar", symbol: "$" }],
};

/**
 * Default mock values for ToastContext
 */
export const mockToastContextValue = {
  showToast: jest.fn(),
};

/**
 * Default mock values for AuthContext
 */
export const mockAuthContextValue = {
  user: null,
  loading: false,
  error: null,
  userType: null,
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  loginWithApple: jest.fn(),
  logout: jest.fn(),
  resetPassword: jest.fn(),
  refreshSession: jest.fn(),
  register: jest.fn(),
  sendUsernameReminder: jest.fn(),
};

/**
 * Default mock values for Web3Context
 */
export const mockWeb3ContextValue = {
  provider: null,
  signer: null,
  address: null,
  chainId: 1287,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchChain: jest.fn(),
};

/**
 * Default mock values for MultiChainContext
 */
export const mockMultiChainContextValue = {
  wallet: null,
  accounts: [],
  activeAccount: null,
  activeChainType: "evm" as const,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: jest.fn(),
  disconnect: jest.fn(),
  switchAccount: jest.fn(),
  switchChainType: jest.fn(),
  switchChain: jest.fn(),
  clearError: jest.fn(),
};

/**
 * Default mock values for CurrencyContext
 */
export const mockCurrencyContextValue = {
  selectedCurrency: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    coingeckoId: "usd",
  },
  setSelectedCurrency: jest.fn(),
  tokenPrices: {},
  isLoading: false,
  refreshPrices: jest.fn(),
  convertToFiat: jest.fn((amount: number) => amount),
  convertFromFiat: jest.fn((amount: number) => amount),
};

// ============================================================================
// Mock Context Providers
// ============================================================================

// Create mock contexts
const MockSettingsContext = createContext(mockSettingsContextValue);
const MockToastContext = createContext(mockToastContextValue);
const MockAuthContext = createContext(mockAuthContextValue);
const MockWeb3Context = createContext(mockWeb3ContextValue);
const MockMultiChainContext = createContext(mockMultiChainContextValue);
const MockCurrencyContext = createContext(mockCurrencyContextValue);

// Export context hooks for use in tests
export const MockSettingsProvider = MockSettingsContext.Provider;
export const MockToastProvider = MockToastContext.Provider;
export const MockAuthProvider = MockAuthContext.Provider;
export const MockWeb3Provider = MockWeb3Context.Provider;
export const MockMultiChainProvider = MockMultiChainContext.Provider;
export const MockCurrencyProvider = MockCurrencyContext.Provider;

// ============================================================================
// Query Client for Testing
// ============================================================================

/**
 * Creates a new QueryClient configured for testing
 * Disables retries and caching for predictable test behavior
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

// ============================================================================
// Test Wrapper Components
// ============================================================================

interface AllProvidersProps {
  children: React.ReactNode;
  settings?: Partial<typeof mockSettingsContextValue>;
  toast?: Partial<typeof mockToastContextValue>;
  auth?: Partial<typeof mockAuthContextValue>;
  web3?: Partial<typeof mockWeb3ContextValue>;
  multiChain?: Partial<typeof mockMultiChainContextValue>;
  currency?: Partial<typeof mockCurrencyContextValue>;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

/**
 * Helper to compose multiple providers without deep JSX nesting
 */
const composeProviders = (
  providers: Array<[React.Provider<unknown>, unknown]>,
  children: React.ReactNode,
): React.ReactElement => {
  return providers.reduceRight(
    (acc, [Provider, value]) => React.createElement(Provider, { value }, acc),
    children as React.ReactElement,
  );
};

/**
 * Comprehensive test wrapper that includes all app providers
 * Use this for component tests that need full context support
 */
export const AllProviders: React.FC<AllProvidersProps> = ({
  children,
  settings = {},
  toast = {},
  auth = {},
  web3 = {},
  multiChain = {},
  currency = {},
  queryClient,
  initialEntries,
}) => {
  const client = queryClient || createTestQueryClient();

  const settingsValue = { ...mockSettingsContextValue, ...settings };
  const toastValue = { ...mockToastContextValue, ...toast };
  const authValue = { ...mockAuthContextValue, ...auth };
  const web3Value = { ...mockWeb3ContextValue, ...web3 };
  const multiChainValue = { ...mockMultiChainContextValue, ...multiChain };
  const currencyValue = { ...mockCurrencyContextValue, ...currency };

  const Router = initialEntries ? MemoryRouter : BrowserRouter;
  const routerProps = initialEntries ? { initialEntries } : {};

  const routerContent = React.createElement(Router, routerProps, children);

  const contextProviders: Array<[React.Provider<unknown>, unknown]> = [
    [MockSettingsContext.Provider as React.Provider<unknown>, settingsValue],
    [MockToastContext.Provider as React.Provider<unknown>, toastValue],
    [MockAuthContext.Provider as React.Provider<unknown>, authValue],
    [MockWeb3Context.Provider as React.Provider<unknown>, web3Value],
    [
      MockMultiChainContext.Provider as React.Provider<unknown>,
      multiChainValue,
    ],
    [MockCurrencyContext.Provider as React.Provider<unknown>, currencyValue],
  ];

  const wrappedContent = composeProviders(contextProviders, routerContent);

  return (
    <QueryClientProvider client={client}>{wrappedContent}</QueryClientProvider>
  );
};

/**
 * Hook replacement exports - these can be used to mock the actual hooks
 */
export const createMockUseSettings =
  (overrides = {}) =>
  () => ({
    ...mockSettingsContextValue,
    ...overrides,
  });

/**
 * Creates a mock implementation of the useToast hook for testing
 * @param overrides - Partial toast context values to override defaults
 * @returns A mock useToast hook function
 */
export const createMockUseToast =
  (overrides = {}) =>
  () => ({
    ...mockToastContextValue,
    ...overrides,
  });

/**
 * Creates a mock implementation of the useAuth hook for testing
 * @param overrides - Partial auth context values to override defaults
 * @returns A mock useAuth hook function
 */
export const createMockUseAuth =
  (overrides = {}) =>
  () => ({
    ...mockAuthContextValue,
    ...overrides,
  });

/**
 * Creates a mock implementation of the useWeb3 hook for testing
 * @param overrides - Partial web3 context values to override defaults
 * @returns A mock useWeb3 hook function
 */
export const createMockUseWeb3 =
  (overrides = {}) =>
  () => ({
    ...mockWeb3ContextValue,
    ...overrides,
  });

/**
 * Creates a mock implementation of the useMultiChain hook for testing
 * @param overrides - Partial multi-chain context values to override defaults
 * @returns A mock useMultiChain hook function
 */
export const createMockUseMultiChain =
  (overrides = {}) =>
  () => ({
    ...mockMultiChainContextValue,
    ...overrides,
  });

/**
 * Creates a mock implementation of the useCurrency hook for testing
 * @param overrides - Partial currency context values to override defaults
 * @returns A mock useCurrency hook function
 */
export const createMockUseCurrency =
  (overrides = {}) =>
  () => ({
    ...mockCurrencyContextValue,
    ...overrides,
  });
