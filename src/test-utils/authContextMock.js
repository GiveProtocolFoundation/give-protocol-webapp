// Mock for @/contexts/AuthContext and @/hooks/useAuth
// Mapped via moduleNameMapper — useAuth is a jest.fn() for per-test overrides.
// AuthProvider is a pass-through wrapper.
import { jest } from "@jest/globals";
import { supabase } from "@/lib/supabase";

export const useAuth = jest.fn(() => ({
  user: null,
  loading: false,
  error: null,
  userType: null,
  // Default login calls supabase and checks account type to support
  // CharityLogin's donor-mismatch test without needing jest.mock().
  login: jest.fn(async (email, password, accountType) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    const user = data?.user;
    if (user && accountType) {
      const userType = user.user_metadata?.type;
      if (userType && userType !== accountType) {
        throw new Error(`This email is registered as a ${userType} account`);
      }
    }
  }),
  loginWithGoogle: jest.fn(),
  loginWithApple: jest.fn(),
  logout: jest.fn(),
  resetPassword: jest.fn(),
  refreshSession: jest.fn(),
  register: jest.fn(),
  sendUsernameReminder: jest.fn(),
}));

/** Mock AuthProvider pass-through */
export const AuthProvider = ({ children }) => children;
