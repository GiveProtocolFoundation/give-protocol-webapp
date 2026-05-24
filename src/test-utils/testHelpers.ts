import { render, RenderOptions, RenderResult } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import {
  AllProviders,
  createTestQueryClient,
  mockSettingsContextValue,
  mockToastContextValue,
  mockAuthContextValue,
  mockWeb3ContextValue,
  mockCurrencyContextValue,
} from "./MockProviders";

// Re-export mock values for convenience
export {
  createTestQueryClient,
  mockSettingsContextValue,
  mockToastContextValue,
  mockAuthContextValue,
  mockWeb3ContextValue,
  mockCurrencyContextValue,
} from "./MockProviders";

// Re-export mock hook creators
export {
  createMockUseSettings,
  createMockUseToast,
  createMockUseAuth,
  createMockUseWeb3,
  createMockUseCurrency,
} from "./MockProviders";

/**
 * Wrapper component for routing in tests
 * @param props - Component props containing children
 * @returns BrowserRouter wrapper element
 */
export const TestWrapper: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => React.createElement(BrowserRouter, {}, children);

/**
 * Wrapper component that includes QueryClient and Router for tests
 * @param props - Component props containing children and optional queryClient
 * @returns Wrapped component with QueryClient and Router context
 */
export const TestProvidersWrapper: React.FC<{
  children: React.ReactNode;
  queryClient?: QueryClient;
}> = ({ children, queryClient }) => {
  const client = queryClient || createTestQueryClient();
  return React.createElement(
    QueryClientProvider,
    { client },
    React.createElement(BrowserRouter, {}, children),
  );
};

/**
 * Helper function to render components with router wrapper
 * @param component - React component to render
 * @returns Rendered component with router context
 */
export const renderWithRouter = (component: React.ReactElement) => {
  return render(React.createElement(TestWrapper, {}, component));
};

/**
 * Helper function to render components with QueryClient and router wrapper
 * @param component - React component to render
 * @param options - Optional render options including custom queryClient
 * @returns Rendered component with QueryClient and router context
 */
export const renderWithProviders = (
  component: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { queryClient?: QueryClient },
) => {
  const { queryClient, ...renderOptions } = options || {};
  const testQueryClient = queryClient || createTestQueryClient();

  /**
   * Wraps the component under test with QueryClientProvider and BrowserRouter.
   * @param props - React FC props with children
   * @returns Wrapped React element
   */
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      QueryClientProvider,
      { client: testQueryClient },
      React.createElement(BrowserRouter, {}, children),
    );

  return {
    ...render(component, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
};

/**
 * Options for renderWithAllProviders
 */
export interface RenderWithAllProvidersOptions extends Omit<
  RenderOptions,
  "wrapper"
> {
  settings?: Partial<typeof mockSettingsContextValue>;
  toast?: Partial<typeof mockToastContextValue>;
  auth?: Partial<typeof mockAuthContextValue>;
  web3?: Partial<typeof mockWeb3ContextValue>;
  currency?: Partial<typeof mockCurrencyContextValue>;
  queryClient?: QueryClient;
  initialEntries?: string[];
}

/**
 * Comprehensive render function that wraps components with all app providers
 * Use this for component tests that need full context support
 * @param component - React component to render
 * @param options - Provider overrides and render options
 * @returns Rendered component with all contexts and queryClient reference
 */
export const renderWithAllProviders = (
  component: React.ReactElement,
  options: RenderWithAllProvidersOptions = {},
): RenderResult & { queryClient: QueryClient } => {
  const {
    settings,
    toast,
    auth,
    web3,
    currency,
    queryClient,
    initialEntries,
    ...renderOptions
  } = options;

  const testQueryClient = queryClient || createTestQueryClient();

  /**
   * Wraps the component under test with AllProviders (full context support).
   * @param props - React FC props with children
   * @returns Wrapped React element
   */
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(
      AllProviders,
      {
        settings,
        toast,
        auth,
        web3,
        currency,
        queryClient: testQueryClient,
        initialEntries,
      },
      children,
    );

  return {
    ...render(component, { wrapper: Wrapper, ...renderOptions }),
    queryClient: testQueryClient,
  };
};

/**
 * Common test expectation for blockchain explorer links
 * @param element - HTML element to test
 * @param hash - Transaction hash for the link
 */
export const expectBlockchainLink = (element: HTMLElement, hash: string) => {
  expect(element).toHaveAttribute(
    "href",
    `https://moonbase.moonscan.io/tx/${hash}`,
  );
  expect(element).toHaveAttribute("target", "_blank");
  expect(element).toHaveAttribute("rel", "noopener noreferrer");
};

/**
 * Standard validation error messages for tests
 */
export const validationErrors = {
  emptyAlias: "Alias cannot be empty",
  aliasLength: "Alias must be between 3 and 20 characters",
  invalidCharacters:
    "Alias can only contain letters, numbers, underscores, and hyphens",
};

/**
 * Common CSS classes for testing UI components
 */
export const cssClasses = {
  card: {
    default: ["bg-white", "border", "border-gray-200", "rounded-lg", "p-4"],
    success: ["bg-green-50", "border", "border-green-200", "rounded-lg", "p-4"],
    error: ["p-3", "bg-red-50", "text-red-700", "text-sm", "rounded-md"],
  },
  button: {
    primary: ["flex", "items-center"],
  },
};
