// Mock Supabase client for Jest ESM testing
// This module is mapped via moduleNameMapper to intercept @/lib/supabase imports

import { jest } from "@jest/globals";

// Global state to control mock responses per test
let mockState = {
  fromResults: new Map(), // Map of table name -> result
  defaultResult: { data: [], error: null },
  authUser: null, // The authenticated user
  authError: null, // Auth error if any
};

// Helper to set mock response for a table
export const setMockResult = (tableName, result) => {
  mockState.fromResults.set(tableName, result);
};

// Helper to set default result
export const setDefaultMockResult = (result) => {
  mockState.defaultResult = result;
};

// Helper to set the authenticated user
export const setMockAuthUser = (user) => {
  mockState.authUser = user;
  mockState.authError = null;
};

// Helper to set auth error
export const setMockAuthError = (error) => {
  mockState.authUser = null;
  mockState.authError = error;
};

// Helper to reset all mock state
export const resetMockState = () => {
  mockState = {
    fromResults: new Map(),
    defaultResult: { data: [], error: null },
    authUser: null,
    authError: null,
  };
};

// Create chainable query builder with configurable results
// Returns a Promise with chain methods attached (not a plain object with 'then')
const createQueryBuilder = (tableName) => {
  // Get the result for this table or use default
  const getResult = () =>
    mockState.fromResults.get(tableName) || mockState.defaultResult;

  // Create a deferred Promise that resolves to the result
  // Using queueMicrotask ensures all chain methods are called before resolution
  const builder = new Promise((resolve) => {
    queueMicrotask(() => resolve(getResult()));
  });

  // Attach chainable methods to the Promise
  // Each method returns `builder` to allow chaining
  builder.select = jest.fn(() => builder);
  builder.insert = jest.fn(() => builder);
  builder.update = jest.fn(() => builder);
  builder.delete = jest.fn(() => builder);
  builder.upsert = jest.fn(() => builder);
  builder.eq = jest.fn(() => builder);
  builder.neq = jest.fn(() => builder);
  builder.gt = jest.fn(() => builder);
  builder.gte = jest.fn(() => builder);
  builder.lt = jest.fn(() => builder);
  builder.lte = jest.fn(() => builder);
  builder.like = jest.fn(() => builder);
  builder.ilike = jest.fn(() => builder);
  builder.is = jest.fn(() => builder);
  builder.in = jest.fn(() => builder);
  builder.or = jest.fn(() => builder);
  builder.and = jest.fn(() => builder);
  builder.not = jest.fn(() => builder);
  builder.contains = jest.fn(() => builder);
  builder.containedBy = jest.fn(() => builder);
  builder.range = jest.fn(() => builder);
  builder.order = jest.fn(() => builder);
  builder.limit = jest.fn(() => builder);
  builder.offset = jest.fn(() => builder);

  // Terminal methods that return fresh Promises
  builder.single = jest.fn(() => Promise.resolve(getResult()));
  builder.maybeSingle = jest.fn(() => Promise.resolve(getResult()));

  return builder;
};

// Create the mock from function
const mockFrom = jest.fn((tableName) => createQueryBuilder(tableName));

// Create the mock supabase client
export const supabase = {
  from: mockFrom,
  auth: {
    getUser: jest.fn().mockImplementation(() =>
      Promise.resolve({
        data: { user: mockState.authUser },
        error: mockState.authError,
      }),
    ),
    getSession: jest
      .fn()
      .mockResolvedValue({ data: { session: null }, error: null }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
    signInWithOAuth: jest.fn().mockResolvedValue({ data: null, error: null }),
    signInWithPassword: jest
      .fn()
      .mockResolvedValue({ data: null, error: null }),
    resend: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: jest.fn(() => ({
        data: { publicUrl: "https://mock-url.com" },
      })),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
  functions: {
    invoke: jest.fn().mockResolvedValue({ data: null, error: null }),
  },
  rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  })),
  removeChannel: jest.fn(),
};

// Export helpers for tests
export const supabaseHelpers = {
  getCurrentUser: jest.fn().mockResolvedValue(null),
  signOut: jest.fn().mockResolvedValue(),
  refreshSession: jest.fn().mockResolvedValue({ session: null, user: null }),
  handleError: jest.fn(),
  testConnection: jest.fn().mockResolvedValue(true),
};

export default supabase;
