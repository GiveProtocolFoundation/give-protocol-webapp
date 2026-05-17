/**
 * Template type definitions for common test patterns
 * Use these as starting points when creating new test utilities
 */

import type { ReactNode } from "react";

// Template for component mock props
export interface MockComponentTemplate {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
  onClose?: () => void;
  disabled?: boolean;
  [key: string]: unknown; // For additional props, but prefer explicit typing
}

// Template for mock data
export interface MockDataTemplate<T = unknown> {
  data: T | T[] | null;
  error: Error | null;
  loading?: boolean;
}

// Template for mock function overrides
export interface MockOverridesTemplate {
  [methodName: string]: jest.Mock | Record<string, unknown>;
}

/**
 * Reference snippet of example usages for {@link MockComponentTemplate},
 * {@link MockDataTemplate}, and the mock factory pattern. Imported by docs/tests as needed.
 */
// Example usage documentation
export const MOCK_TEMPLATE_EXAMPLES = `
// Example 1: Creating a typed mock component
jest.mock('@/components/Modal', () => ({
  Modal: ({ onClose, children }: Pick<MockComponentTemplate, 'onClose' | 'children'>) => (
    <div onClick={onClose}>{children}</div>
  )
}));

// Example 2: Creating typed mock data
const mockResponse: MockDataTemplate<User> = {
  data: { id: '123', name: 'Test User' },
  error: null,
  loading: false
};

// Example 3: Creating a mock factory with proper types
export const createMockService = <T>(overrides: Partial<MockOverridesTemplate> = {}) => ({
  fetchData: jest.fn<Promise<T>, [string]>(),
  updateData: jest.fn<Promise<void>, [string, T]>(),
  ...overrides
});
`;
