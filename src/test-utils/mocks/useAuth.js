/**
 * Mock implementation of useAuth hook for testing
 */

// Simple mock functions - tests can spy on these using jest.spyOn
const createMockFn = () => {
  /**
   * Mock function that records call arguments and returns a configured value
   * @param {...unknown} args - Arguments passed to the mock function
   * @returns {unknown} The configured return value
   */
  const fn = function (...args) {
    fn.calls.push(args);
    fn.callCount++;
    return fn.returnValue;
  };
  fn.calls = [];
  fn.callCount = 0;
  fn.returnValue = undefined;
  fn.mockClear = () => {
    fn.calls = [];
    fn.callCount = 0;
  };
  fn.mockReturnValue = (value) => {
    fn.returnValue = value;
    return fn;
  };
  return fn;
};

export const mockLogin = createMockFn();
export const mockLogout = createMockFn();
export const mockRegister = createMockFn();
export const mockResetPassword = createMockFn();
export const mockSendUsernameReminder = createMockFn();
export const mockLoginWithGoogle = createMockFn();
export const mockLoginWithApple = createMockFn();
export const mockRefreshSession = createMockFn();

// Default mock state
let mockState = {
  user: null,
  loading: false,
  error: null,
  userType: null,
};

// Allow tests to set mock state
export const setMockAuthState = (state) => {
  mockState = { ...mockState, ...state };
};

// Reset all mocks
export const resetAuthMocks = () => {
  mockLogin.mockClear();
  mockLogout.mockClear();
  mockRegister.mockClear();
  mockResetPassword.mockClear();
  mockSendUsernameReminder.mockClear();
  mockLoginWithGoogle.mockClear();
  mockLoginWithApple.mockClear();
  mockRefreshSession.mockClear();
  mockState = {
    user: null,
    loading: false,
    error: null,
    userType: null,
  };
};

/**
 * Mock useAuth hook that returns the current mock state and mock auth functions
 * @returns {object} The mock auth state combined with mock auth action functions
 */
export const useAuth = () => ({
  ...mockState,
  login: mockLogin,
  logout: mockLogout,
  register: mockRegister,
  resetPassword: mockResetPassword,
  sendUsernameReminder: mockSendUsernameReminder,
  loginWithGoogle: mockLoginWithGoogle,
  loginWithApple: mockLoginWithApple,
  refreshSession: mockRefreshSession,
});
