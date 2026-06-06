import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  startTransition,
} from "react";
import { User, Session, AuthError as _AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useToast } from "./ToastContext";
import { Logger } from "@/utils/logger";
import { ENV as _ENV } from "@/config/env";
import { setSentryUser, clearSentryUser } from "@/lib/sentry";

interface AuthState {
  user: User | null;
  loading: boolean;
  error: Error | null;
  userType: "donor" | "charity" | "admin" | null;
}

interface AuthContextType extends AuthState {
  login: (
    _email: string,
    _password: string,
    _accountType: "donor" | "charity",
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithApple: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (_email: string) => Promise<void>;
  refreshSession: () => Promise<void>;
  register: (
    _email: string,
    _password: string,
    _type: "donor" | "charity",
    _metadata?: Record<string, unknown>,
  ) => Promise<void>;
  sendUsernameReminder: (_email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined); // skipcq: JS-W1042 — createContext requires a default value argument

const SESSION_REFRESH_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 second

type UserType = "donor" | "charity" | "admin" | null;

/**
 * Fetches user type from profile table
 */
async function fetchUserTypeFromProfile(userId: string): Promise<UserType> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("type")
    .eq("user_id", userId)
    .single();

  return (profile?.type as UserType) || null;
}

/**
 * Gets user type from metadata or falls back to profile table
 */
function resolveUserType(user: User | null | undefined): Promise<UserType> {
  if (!user) return Promise.resolve(null);

  const metadataType = user.user_metadata?.type as UserType;
  if (metadataType) return Promise.resolve(metadataType);

  return fetchUserTypeFromProfile(user.id);
}

/**
 * Updates Sentry user context based on session (ID only, no PII).
 */
function updateSentryUserContext(
  user: User | null | undefined,
  _userType: UserType,
): void {
  if (user) {
    setSentryUser({ id: user.id });
  } else {
    clearSentryUser();
  }
}

/**
 * Authentication provider component that manages user authentication state
 * Handles session initialization, refresh, and auth state changes
 * @param children - React components to wrap with auth context
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
    userType: null,
  });
  const { showToast } = useToast();
  const [retryCount, setRetryCount] = useState(0);

  const refreshSession = useCallback(async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.refreshSession();
      if (error) {
        Logger.error("Session refresh error", {
          error: error.message,
          stack: error.stack,
          code: error.status,
        });
        throw error;
      }

      const userType = session?.user?.user_metadata?.type as
        | "donor"
        | "charity"
        | null;

      setState((prev) => ({
        ...prev,
        user: session?.user ?? null,
        userType,
      }));

      Logger.info("Session refreshed successfully");
    } catch (err) {
      Logger.error("Session refresh failed", {
        error:
          err instanceof Error
            ? { message: err.message, stack: err.stack }
            : err,
        retryCount,
      });

      if (retryCount < MAX_RETRY_ATTEMPTS) {
        setRetryCount((prev) => prev + 1);
        setTimeout(refreshSession, RETRY_DELAY * Math.pow(2, retryCount));
      } else {
        // Force re-login if refresh fails repeatedly
        setState((prev) => ({
          ...prev,
          user: null,
          userType: null,
          error: new Error("Session expired. Please login again."),
        }));
        showToast("error", "Session expired", "Please login again");
      }
    }
  }, [retryCount, showToast]);

  useEffect(() => {
    let mounted = true;
    let refreshInterval: ReturnType<typeof setTimeout>;

    /** Displays a toast and starts/stops session refresh based on the auth event */
    const handleAuthEvent = (
      event: string,
      session: Session | null,
      startRefresh: () => void,
      stopRefresh: () => void,
    ) => {
      switch (event) {
        case "SIGNED_IN": {
          const user = session?.user;
          const walletAddress = user?.user_metadata?.wallet_address as
            | string
            | undefined;
          const authMethod = user?.user_metadata?.auth_method as
            | string
            | undefined;
          if (authMethod === "wallet" || walletAddress) {
            const addr = walletAddress ?? "";
            const truncated =
              addr.length > 10
                ? `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`
                : addr;
            showToast({
              type: "success",
              title: "Wallet connected",
              message: `Signed in with ${truncated}.`,
            });
          } else {
            const fullName = user?.user_metadata?.full_name as
              | string
              | undefined;
            const firstName =
              fullName?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";
            showToast({
              type: "success",
              title: `Welcome back, ${firstName}`,
              message: "You\u2019re signed in.",
            });
          }
          startRefresh();
          break;
        }
        case "SIGNED_OUT":
          showToast({
            type: "info",
            title: "Signed out",
            duration: 3000,
          });
          stopRefresh();
          break;
        case "USER_UPDATED":
          showToast("success", "Profile updated successfully");
          break;
        default:
          // Other auth events (TOKEN_REFRESHED, PASSWORD_RECOVERY, etc.) don't require user notification
          break;
      }
    };

    /** Starts periodic session refresh on a fixed interval */
    const startRefreshInterval = () => {
      refreshInterval = setInterval(refreshSession, SESSION_REFRESH_INTERVAL);
    };

    /** Clears the periodic session refresh interval */
    const stopRefreshInterval = () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };

    /** Loads the current session, resolves user type, and subscribes to auth changes */
    const initializeAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          Logger.error("Get session error", {
            error: sessionError.message,
            stack: sessionError.stack,
            code: sessionError.status,
          });
          throw sessionError;
        }

        if (!mounted) return undefined;

        const userType = await resolveUserType(session?.user);

        startTransition(() => {
          setState((prev) => ({
            ...prev,
            user: session?.user ?? null,
            userType,
            loading: false,
          }));
        });

        updateSentryUserContext(session?.user, userType);

        if (session?.user) startRefreshInterval();

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          Logger.info("Auth state changed", { event });

          const userType = await resolveUserType(session?.user);

          handleAuthEvent(
            event,
            session,
            startRefreshInterval,
            stopRefreshInterval,
          );

          startTransition(() => {
            setState((prev) => ({
              ...prev,
              user: session?.user ?? null,
              userType,
              loading: false,
            }));
          });

          updateSentryUserContext(session?.user, userType);
        });

        return () => {
          mounted = false;
          subscription.unsubscribe();
          stopRefreshInterval();
        };
      } catch (err) {
        Logger.error("Auth initialization failed", {
          error:
            err instanceof Error
              ? { message: err.message, stack: err.stack }
              : err,
        });

        if (mounted) {
          startTransition(() => {
            setState((prev) => ({
              ...prev,
              error:
                err instanceof Error
                  ? err
                  : new Error("Failed to initialize auth"),
              loading: false,
            }));
          });
        }
        return undefined;
      }
    };

    initializeAuth();
  }, [refreshSession, showToast]);

  const login = useCallback(
    async (
      email: string,
      password: string,
      accountType: "donor" | "charity",
    ) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // First, check if the user exists
        const {
          data: { user },
          error: checkError,
        } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (checkError) {
          Logger.error("Login error from Supabase", {
            error: checkError.message,
            code: checkError.status,
            email,
          });
          throw checkError;
        }

        // Verify the user has the correct account type
        // First check user metadata
        let userType = user?.user_metadata?.type;

        // If not in metadata, check the profile table
        if (!userType && user) {
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("type")
            .eq("user_id", user.id)
            .single();

          if (!profileError && profile) {
            userType = profile.type;
          }
        }

        // Check account type compatibility
        // - Donor login: only allows 'donor' users
        // - Charity login: allows both 'charity' and 'admin' users
        const isValidLogin =
          (accountType === "donor" && userType === "donor") ||
          (accountType === "charity" &&
            (userType === "charity" || userType === "admin"));

        if (!isValidLogin) {
          // Sign out the user immediately to prevent session creation
          await supabase.auth.signOut();
          if (accountType === "charity" && userType === "donor") {
            throw new Error(
              "This account is registered as a donor account. Please use the Donor Login.",
            );
          }
          if (
            accountType === "donor" &&
            (userType === "charity" || userType === "admin")
          ) {
            throw new Error(
              "This account is registered as a charity account. Please use the Charity Login.",
            );
          }
          throw new Error(
            "Account not found. Please check your email and password.",
          );
        }

        // Set user state directly so Login.tsx can redirect immediately
        // rather than waiting for the async onAuthStateChange listener
        setState((prev) => ({
          ...prev,
          user: user ?? null,
          userType: (userType as UserType) ?? null,
        }));
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sign in";
        showToast({
          type: "error",
          title: "Sign-in failed",
          message,
        });
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error(message),
        }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [showToast],
  );

  const loginWithGoogle = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        Logger.error("Google login error", {
          error: error.message,
          code: error.status,
        });
        throw error;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in with Google";
      showToast({
        type: "error",
        title: "Sign-in failed",
        message,
      });
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error(message),
      }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [showToast]);

  const loginWithApple = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/login`,
          scopes: "name email",
        },
      });

      if (error) {
        Logger.error("Apple login error", {
          error: error.message,
          code: error.status,
        });
        throw error;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to sign in with Apple";
      showToast({
        type: "error",
        title: "Sign-in failed",
        message,
      });
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error(message),
      }));
      throw err;
    } finally {
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const { error } = await supabase.auth.signOut();
      if (error) {
        Logger.error("Logout error", {
          error: error.message,
          code: error.status,
        });
        throw error;
      }

      // Clear user state immediately
      setState({
        user: null,
        userType: null,
        loading: false,
        error: null,
      });

      // Redirect to login page so user must re-authenticate
      window.location.href = `${window.location.origin}/login`;

      // SIGNED_OUT auth event fires the sign-out toast via handleAuthEvent
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to log out";
      showToast({ type: "error", title: "Sign-out failed", message });
      setState((prev) => ({
        ...prev,
        error: err instanceof Error ? err : new Error(message),
        loading: false,
      }));
      throw err;
    }
  }, [showToast]);

  const resetPassword = useCallback(
    async (email: string) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

        if (error) {
          Logger.error("Password reset error", {
            error: error.message,
            code: error.status,
            email,
          });
          throw error;
        }
        showToast("success", "Password reset email sent");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to send reset email";
        showToast("error", "Reset Password Error", message);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error(message),
        }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [showToast],
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      type: "donor" | "charity",
      metadata = {},
    ) => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        // Attempt to sign up the user
        // If the email is already registered, Supabase will return an error
        // This approach avoids using dummy credentials for checking
        const { data: _data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              type,
              ...metadata,
            },
            emailRedirectTo: `${window.location.origin}/auth/callback?email=${encodeURIComponent(email)}`,
          },
        });

        if (error) {
          // Check if error is because user already exists
          if (
            error.message?.toLowerCase().includes("already registered") ||
            error.message?.toLowerCase().includes("already exists") ||
            error.message?.toLowerCase().includes("user already registered")
          ) {
            // For better UX, we don't reveal which account type the email is registered with
            throw new Error(
              "This email is already registered. Please sign in or use a different email.",
            );
          }
          Logger.error("Registration error", {
            error: error.message,
            code: error.status,
            email,
            type,
          });
          throw error;
        }

        showToast(
          "success",
          "Registration successful",
          "Please check your email to verify your account",
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to register";
        showToast("error", "Registration Error", message);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error(message),
        }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [showToast],
  );

  const sendUsernameReminder = useCallback(
    async (email: string): Promise<void> => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));
        await supabase.functions.invoke("username-reminder", {
          body: { email },
        });
        // Always show success regardless of backend result to prevent email enumeration
        showToast(
          "success",
          "Username reminder sent",
          "If an account exists with this email, a reminder will be sent",
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to send username reminder";
        showToast("error", "Username Reminder Error", message);
        setState((prev) => ({
          ...prev,
          error: err instanceof Error ? err : new Error(message),
        }));
        throw err;
      } finally {
        setState((prev) => ({ ...prev, loading: false }));
      }
    },
    [showToast],
  );

  const contextValue = React.useMemo(
    () => ({
      ...state,
      login,
      loginWithGoogle,
      loginWithApple,
      logout,
      resetPassword,
      refreshSession,
      register,
      sendUsernameReminder,
    }),
    [
      state,
      login,
      loginWithGoogle,
      loginWithApple,
      logout,
      resetPassword,
      refreshSession,
      register,
      sendUsernameReminder,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

/**
 * Hook to access the authentication context
 * Must be used within an AuthProvider component
 * @returns AuthContextType containing user state and authentication methods
 * @throws Error if used outside of AuthProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
