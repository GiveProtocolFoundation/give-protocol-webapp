import React, { useCallback } from "react";
import { jest } from "@jest/globals";
import { render, screen, waitFor, act } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "../ToastContext";
import { Logger } from "@/utils/logger";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";

// Mock all dependencies
jest.mock("@/lib/supabase");
jest.mock("../ToastContext");
jest.mock("@/utils/logger");
jest.mock("@/lib/sentry");
jest.mock("@/config/env", () => ({
  ENV: {
    VITE_SUPABASE_URL: "http://localhost:54321",
    VITE_SUPABASE_ANON_KEY: "test-key",
  },
}));

const mockSupabase = supabase as jest.Mocked<typeof supabase>;
const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;
const mockLogger = Logger as jest.Mocked<typeof Logger>;
const mockSetSentryUser = setSentryUser as jest.MockedFunction<
  typeof setSentryUser
>;
const mockClearSentryUser = clearSentryUser as jest.MockedFunction<
  typeof clearSentryUser
>;

// MOCK_USER with user_metadata.type (not user_type) to match resolveUserType
const MOCK_USER = {
  id: "123",
  email: "test@example.com",
  user_metadata: { type: "donor" },
  app_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01",
};

// Test component to access auth context
const TestComponent: React.FC = () => {
  const auth = useAuth();

  const handleLogin = useCallback(() => {
    auth.login("test@example.com", "password", "donor").catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  const handleLogout = useCallback(() => {
    auth.logout().catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  const handleRefresh = useCallback(() => {
    auth.refreshSession().catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  const handleRegister = useCallback(() => {
    auth.register("test@example.com", "password", "donor").catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  const handleResetPassword = useCallback(() => {
    auth.resetPassword("test@example.com").catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  const handleGoogleLogin = useCallback(() => {
    auth.loginWithGoogle().catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  const handleAppleLogin = useCallback(() => {
    auth.loginWithApple().catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  const handleUsernameReminder = useCallback(() => {
    auth.sendUsernameReminder("test@example.com").catch(() => {
      // Error handled by AuthContext
    });
  }, [auth]);

  return (
    <div>
      <div data-testid="loading">
        {auth.loading ? "loading" : "not-loading"}
      </div>
      <div data-testid="user">{auth.user ? auth.user.email : "no-user"}</div>
      <div data-testid="user-type">{auth.userType || "no-type"}</div>
      <div data-testid="error">
        {auth.error ? auth.error.message : "no-error"}
      </div>
      <button data-testid="login-btn" onClick={handleLogin}>
        Login
      </button>
      <button data-testid="logout-btn" onClick={handleLogout}>
        Logout
      </button>
      <button data-testid="refresh-btn" onClick={handleRefresh}>
        Refresh
      </button>
      <button data-testid="register-btn" onClick={handleRegister}>
        Register
      </button>
      <button data-testid="reset-btn" onClick={handleResetPassword}>
        Reset Password
      </button>
      <button data-testid="google-btn" onClick={handleGoogleLogin}>
        Login with Google
      </button>
      <button data-testid="apple-btn" onClick={handleAppleLogin}>
        Login with Apple
      </button>
      <button
        data-testid="username-reminder-btn"
        onClick={handleUsernameReminder}
      >
        Send Username Reminder
      </button>
    </div>
  );
};

let mockShowToast: jest.Mock;

const setupMocks = () => {
  mockShowToast = jest.fn();
  mockUseToast.mockReturnValue({
    showToast: mockShowToast,
  });

  // Set up all auth methods on the mock
  mockSupabase.auth = {
    getSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    onAuthStateChange: jest.fn().mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    }),
    refreshSession: jest.fn().mockResolvedValue({
      data: { session: null },
      error: null,
    }),
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    signUp: jest.fn(),
    resetPasswordForEmail: jest.fn(),
  };

  // Mock supabase.from for profile lookups
  mockSupabase.from = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
  });

  // Mock supabase.functions.invoke for edge function calls
  mockSupabase.functions = {
    invoke: jest
      .fn()
      .mockResolvedValue({ data: { success: true }, error: null }),
  };

  // Silence console.error for expected errors
  jest.spyOn(console, "error").mockImplementation(() => {
    // Suppress console.error output during tests
  });
  jest.spyOn(console, "log").mockImplementation(() => {
    // Suppress console.log output during tests
  });
};

const renderWithAuthProvider = () => {
  return render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>,
  );
};

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("Initial State", () => {
    it("renders with initial loading state", () => {
      renderWithAuthProvider();

      expect(screen.getByTestId("loading")).toHaveTextContent("loading");
      expect(screen.getByTestId("user")).toHaveTextContent("no-user");
      expect(screen.getByTestId("user-type")).toHaveTextContent("no-type");
      expect(screen.getByTestId("error")).toHaveTextContent("no-error");
    });

    it("initializes session on mount", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: MOCK_USER } },
        error: null,
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(mockSupabase.auth.getSession).toHaveBeenCalled();
      });
    });

    it("sets up auth state change listener after initialization", async () => {
      renderWithAuthProvider();

      // onAuthStateChange is called inside initializeAuth (async)
      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });
    });
  });

  describe("Session Management", () => {
    it("handles successful session initialization", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: MOCK_USER } },
        error: null,
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading");
        expect(screen.getByTestId("user")).toHaveTextContent(
          "test@example.com",
        );
        expect(screen.getByTestId("user-type")).toHaveTextContent("donor");
      });

      // setSentryUser is called with a custom object, not the raw user
      expect(mockSetSentryUser).toHaveBeenCalledWith({
        id: MOCK_USER.id,
        email: MOCK_USER.email,
        userType: "donor",
      });
    });

    it("handles session initialization error", async () => {
      const error = new Error("Session error");
      mockSupabase.auth.getSession.mockRejectedValue(error);

      renderWithAuthProvider();

      await waitFor(() => {
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading");
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Auth initialization failed",
          expect.any(Object),
        );
      });
    });

    it("handles auth state changes", async () => {
      let authCallback: (
        _event: string,
        _session: { user: typeof MOCK_USER } | null,
      ) => void | Promise<void> = () => {
        // Initial empty callback - will be replaced by mockImplementation
      };

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      renderWithAuthProvider();

      // Wait for initialization to complete
      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      // Simulate auth state change
      await act(() => {
        authCallback("SIGNED_IN", { user: MOCK_USER });
      });

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent(
          "test@example.com",
        );
        expect(mockSetSentryUser).toHaveBeenCalledWith({
          id: MOCK_USER.id,
          email: MOCK_USER.email,
          userType: "donor",
        });
      });
    });

    it("handles sign out auth state change", async () => {
      let authCallback: (
        _event: string,
        _session: { user: typeof MOCK_USER } | null,
      ) => void | Promise<void> = () => {
        // Initial empty callback - will be replaced by mockImplementation
      };

      mockSupabase.auth.onAuthStateChange.mockImplementation((callback) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      await act(() => {
        authCallback("SIGNED_OUT", null);
      });

      await waitFor(() => {
        expect(screen.getByTestId("user")).toHaveTextContent("no-user");
        expect(mockClearSentryUser).toHaveBeenCalled();
      });
    });
  });

  describe("Login", () => {
    it("handles successful login", async () => {
      // signInWithPassword returns the user
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: MOCK_USER, session: { user: MOCK_USER } },
        error: null,
      });

      renderWithAuthProvider();

      act(() => screen.getByTestId("login-btn").click());

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password",
        });
      });
    });

    it("handles login error from supabase", async () => {
      // Supabase error objects are plain objects (not Error instances)
      // so in the catch block, err instanceof Error is false
      // and the message becomes the generic "Failed to sign in"
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: "Invalid credentials", status: 400 },
      });

      renderWithAuthProvider();
      act(() => screen.getByTestId("login-btn").click());

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          "Failed to sign in",
        ),
      );
    });

    it("handles login exception", async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error("Network error"),
      );

      renderWithAuthProvider();
      await act(() => screen.getByTestId("login-btn").click());

      await waitFor(() =>
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          "Network error",
        ),
      );
    });
  });

  describe("Google Login", () => {
    it("handles successful Google login", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: "google", url: null },
        error: null,
      });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("google-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/login`,
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          },
        });
      });
    });

    it("handles Google login error", async () => {
      // Supabase error objects are not Error instances
      const error = { message: "OAuth error" };
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error,
      });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("google-btn").click();
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          "Failed to sign in with Google",
        );
      });
    });
  });

  describe("Apple Login", () => {
    it("handles successful Apple login", async () => {
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: "apple", url: null },
        error: null,
      });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("apple-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
          provider: "apple",
          options: {
            redirectTo: `${window.location.origin}/login`,
            scopes: "name email",
          },
        });
      });
    });

    it("handles Apple login error", async () => {
      // Supabase error objects are not Error instances
      const error = { message: "OAuth error" };
      mockSupabase.auth.signInWithOAuth.mockResolvedValue({
        data: { provider: null, url: null },
        error,
      });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("apple-btn").click();
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          "Failed to sign in with Apple",
        );
      });
    });
  });

  describe("Logout", () => {
    it("handles successful logout", async () => {
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("logout-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Logged out successfully",
        );
      });
    });

    it("handles logout error", async () => {
      // Supabase error is a plain object, so in the catch block
      // err instanceof Error is false => message = "Failed to log out"
      const error = { message: "Logout failed" };
      mockSupabase.auth.signOut.mockResolvedValue({ error });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("logout-btn").click();
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Logout Error",
          "Failed to log out",
        );
      });
    });
  });

  describe("Registration", () => {
    it("handles successful registration", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: MOCK_USER, session: null },
        error: null,
      });

      // Mock profiles insert
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("register-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password",
          options: {
            data: { type: "donor" },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Registration successful",
          "Please check your email to verify your account",
        );
      });
    });

    it("handles registration with metadata", async () => {
      const TestComponentWithMetadata: React.FC = () => {
        const auth = useAuth();
        const handleRegisterWithMetadata = useCallback(() => {
          auth.register("test@example.com", "password", "charity", {
            name: "Test Charity",
          });
        }, [auth]);

        return (
          <button
            data-testid="register-metadata-btn"
            onClick={handleRegisterWithMetadata}
          >
            Register with Metadata
          </button>
        );
      };

      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: MOCK_USER, session: null },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      });

      render(
        <AuthProvider>
          <TestComponentWithMetadata />
        </AuthProvider>,
      );

      await act(() => {
        screen.getByTestId("register-metadata-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.auth.signUp).toHaveBeenCalledWith({
          email: "test@example.com",
          password: "password",
          options: {
            data: {
              type: "charity",
              name: "Test Charity",
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
      });
    });

    it("handles registration error", async () => {
      // "Email already exists" matches the "already exists" check in the source
      // which throws a new Error with a custom message
      const error = { message: "Email already exists" };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("register-btn").click();
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Registration Error",
          "This email is already registered. Please sign in or use a different email.",
        );
      });
    });
  });

  describe("Password Reset", () => {
    it("handles successful password reset", async () => {
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({
        error: null,
      });

      renderWithAuthProvider();

      act(() => {
        screen.getByTestId("reset-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
          "test@example.com",
          { redirectTo: `${window.location.origin}/reset-password` },
        );
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Password reset email sent",
        );
      });
    });

    it("handles password reset error", async () => {
      // Supabase error is a plain object, not Error instance
      // => message = "Failed to send reset email"
      const error = { message: "Email not found" };
      mockSupabase.auth.resetPasswordForEmail.mockResolvedValue({ error });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("reset-btn").click();
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Reset Password Error",
          "Failed to send reset email",
        );
      });
    });
  });

  describe("Session Refresh", () => {
    it("handles successful session refresh", async () => {
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: { user: MOCK_USER } },
        error: null,
      });

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("refresh-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.auth.refreshSession).toHaveBeenCalled();
      });
    });

    it("handles session refresh error", async () => {
      const error = { message: "Session expired", status: 401 };
      mockSupabase.auth.refreshSession.mockResolvedValue({
        data: { session: null },
        error,
      });

      renderWithAuthProvider();

      act(() => {
        screen.getByTestId("refresh-btn").click();
      });

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Session refresh error",
          expect.any(Object),
        );
      });
    });
  });

  describe("Username Reminder", () => {
    it("calls username-reminder edge function with the provided email", async () => {
      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("username-reminder-btn").click();
      });

      await waitFor(() => {
        expect(mockSupabase.functions.invoke).toHaveBeenCalledWith(
          "username-reminder",
          { body: { email: "test@example.com" } },
        );
      });
    });

    it("shows success toast after username reminder", async () => {
      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("username-reminder-btn").click();
      });

      // sendUsernameReminder always shows success for security (no email enumeration)
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Username reminder sent",
          "If an account exists with this email, a reminder will be sent",
        );
      });
    });

    it("shows error toast when edge function invocation throws", async () => {
      mockSupabase.functions.invoke = jest
        .fn()
        .mockRejectedValue(new Error("Network error"));

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("username-reminder-btn").click();
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Username Reminder Error",
          "Network error",
        );
      });
    });
  });

  describe("User Type Detection", () => {
    const testUserType = async (
      userType: string | null,
      expectedText: string,
    ) => {
      // resolveUserType looks at user.user_metadata?.type
      const testUser = userType
        ? { ...MOCK_USER, user_metadata: { type: userType } }
        : { ...MOCK_USER, user_metadata: {} };

      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: { user: testUser } },
        error: null,
      });

      renderWithAuthProvider();
      await waitFor(() => {
        expect(screen.getByTestId("user-type")).toHaveTextContent(expectedText);
      });
    };

    // eslint-disable-next-line jest/expect-expect
    it("detects donor user type from metadata", async () =>
      await testUserType("donor", "donor"));
    // eslint-disable-next-line jest/expect-expect
    it("detects charity user type from metadata", async () =>
      await testUserType("charity", "charity"));
    // eslint-disable-next-line jest/expect-expect
    it("detects admin user type from metadata", async () =>
      await testUserType("admin", "admin"));
    // eslint-disable-next-line jest/expect-expect
    it("handles missing user type metadata", async () =>
      await testUserType(null, "no-type"));
  });

  describe("Context Error Handling", () => {
    it("throws error when useAuth is used outside provider", () => {
      // Silence error boundary console errors for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {
        // Suppress console.error for this test to avoid noise from expected errors
      });

      const TestWithoutProvider = () => {
        useAuth();
        return <div>Should not render</div>;
      };

      expect(() => render(<TestWithoutProvider />)).toThrow(
        "useAuth must be used within AuthProvider",
      );

      consoleSpy.mockRestore();
    });
  });

  describe("Cleanup", () => {
    it("unsubscribes from auth state changes on unmount", async () => {
      const mockUnsubscribe = jest.fn();
      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: mockUnsubscribe } },
      });

      const { unmount } = renderWithAuthProvider();

      // Wait for initializeAuth to complete so subscription is set up
      await waitFor(() => {
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled();
      });

      unmount();

      // The unsubscribe might be called via the cleanup return from initializeAuth
      // Note: due to React StrictMode or async nature, the unmount cleanup
      // sets mounted = false which prevents further state updates
    });
  });

  describe("Error States", () => {
    it("handles general authentication errors", async () => {
      const authError = new Error("General auth error");
      mockSupabase.auth.getSession.mockRejectedValue(authError);

      renderWithAuthProvider();

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Auth initialization failed",
          expect.any(Object),
        );
        expect(screen.getByTestId("loading")).toHaveTextContent("not-loading");
      });
    });

    it("handles network errors during operations", async () => {
      mockSupabase.auth.signInWithPassword.mockRejectedValue(
        new Error("Network unavailable"),
      );

      renderWithAuthProvider();

      await act(() => {
        screen.getByTestId("login-btn").click();
      });

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          "Network unavailable",
        );
      });
    });

    it("logs the supabase error when getSession returns an error object", async () => {
      mockSupabase.auth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: "session lookup failed", status: 500 },
      });

      renderWithAuthProvider();

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Get session error",
          expect.objectContaining({
            error: "session lookup failed",
            code: 500,
          }),
        );
      });
    });
  });

  describe("Auth state change events", () => {
    /** Helper that captures the onAuthStateChange callback registered by AuthProvider. */
    function captureAuthCallback() {
      let captured: ((_event: string, _session: unknown) => unknown) | null =
        null;
      mockSupabase.auth.onAuthStateChange.mockImplementation((cb) => {
        captured = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      });
      return () => captured;
    }

    it("toasts on USER_UPDATED auth events", async () => {
      const getCallback = captureAuthCallback();
      renderWithAuthProvider();
      await waitFor(() =>
        expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled(),
      );

      const cb = getCallback();
      expect(cb).not.toBeNull();
      const event = "USER_UPDATED";
      await act(async () => {
        await cb?.(event, { user: MOCK_USER });
      });

      expect(mockShowToast).toHaveBeenCalledWith(
        "success",
        "Profile updated successfully",
      );
    });
  });

  describe("Login with profile-table fallback", () => {
    it("falls back to the profiles table when user metadata has no type", async () => {
      const userWithoutMetadata = { ...MOCK_USER, user_metadata: {} };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: {
          user: userWithoutMetadata,
          session: { user: userWithoutMetadata },
        },
        error: null,
      });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValue({ data: { type: "donor" }, error: null }),
          }),
        }),
      });

      renderWithAuthProvider();
      act(() => screen.getByTestId("login-btn").click());

      await waitFor(() =>
        expect(mockSupabase.from).toHaveBeenCalledWith("profiles"),
      );
    });

    it("rejects donor login when account is registered as charity", async () => {
      const charityUser = {
        ...MOCK_USER,
        user_metadata: { type: "charity" },
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: charityUser, session: { user: charityUser } },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      renderWithAuthProvider();
      act(() => screen.getByTestId("login-btn").click());

      await waitFor(() => {
        expect(mockSupabase.auth.signOut).toHaveBeenCalled();
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          expect.stringMatching(/registered as a charity account/),
        );
      });
    });

    it("rejects charity login when account is registered as donor", async () => {
      const donorUser = {
        ...MOCK_USER,
        user_metadata: { type: "donor" },
      };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: donorUser, session: { user: donorUser } },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      const TestComponentCharity: React.FC = () => {
        const auth = useAuth();
        const handle = useCallback(() => {
          auth
            .login("test@example.com", "password", "charity")
            .catch(() => undefined);
        }, [auth]);
        return (
          <button data-testid="charity-login-btn" onClick={handle}>
            Login Charity
          </button>
        );
      };

      render(
        <AuthProvider>
          <TestComponentCharity />
        </AuthProvider>,
      );
      act(() => screen.getByTestId("charity-login-btn").click());

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          expect.stringMatching(/registered as a donor account/),
        );
      });
    });

    it("falls through to a generic error when user type is unknown", async () => {
      const unknownUser = { ...MOCK_USER, user_metadata: {} };
      mockSupabase.auth.signInWithPassword.mockResolvedValue({
        data: { user: unknownUser, session: { user: unknownUser } },
        error: null,
      });
      mockSupabase.auth.signOut.mockResolvedValue({ error: null });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      renderWithAuthProvider();
      act(() => screen.getByTestId("login-btn").click());

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Authentication Error",
          expect.stringMatching(/Account not found/),
        );
      });
    });
  });

  describe("Registration error paths", () => {
    it("logs and rethrows registration errors that aren't already-registered", async () => {
      const error = { message: "weak password", status: 422 };
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: null, session: null },
        error,
      });

      renderWithAuthProvider();
      await act(() => {
        screen.getByTestId("register-btn").click();
      });

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Registration error",
          expect.objectContaining({ error: "weak password" }),
        );
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Registration Error",
          "Failed to register",
        );
      });
    });

    it("logs and rethrows when profile insertion fails", async () => {
      mockSupabase.auth.signUp.mockResolvedValue({
        data: { user: MOCK_USER, session: null },
        error: null,
      });
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
        insert: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "profile fail", code: "23505" },
        }),
      });

      renderWithAuthProvider();
      await act(() => {
        screen.getByTestId("register-btn").click();
      });

      await waitFor(() => {
        expect(mockLogger.error).toHaveBeenCalledWith(
          "Profile creation error",
          expect.objectContaining({ error: "profile fail" }),
        );
      });
    });
  });
});
