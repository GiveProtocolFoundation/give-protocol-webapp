import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../contexts/ToastContext";
import { supabase } from "../../lib/supabase";
import { validateAuthInput } from "../../utils/validation";
import { UserType } from "../../types/auth";

/**
 * Authentication actions hook for login, registration, and password management
 * @function useAuthActions
 * @description Provides comprehensive authentication actions including login, registration, email verification,
 * and password reset functionality. Includes input validation, automatic profile creation, and navigation handling
 * with toast notifications for all operations.
 * @returns {Object} Authentication action functions and loading state
 * @returns {Function} returns.login - User login function: (email: string, password: string) => Promise<void>
 * @returns {Function} returns.register - User registration function: (email: string, password: string, type: UserType, metadata?: object) => Promise<void>
 * @returns {Function} returns.sendVerificationEmail - Send verification email: (email: string) => Promise<void>
 * @returns {Function} returns.resetPassword - Send password reset email: (email: string) => Promise<void>
 * @returns {boolean} returns.loading - Loading state for all authentication operations
 * @example
 * ```tsx
 * const { login, register, resetPassword, loading } = useAuthActions();
 *
 * const handleLogin = async (e: React.FormEvent) => {
 *   e.preventDefault();
 *   try {
 *     await login(email, password);
 *     // Navigation and success toast handled automatically
 *   } catch (error) {
 *     // Error toast shown automatically
 *   }
 * };
 *
 * const handleRegister = async (email: string, password: string) => {
 *   await register(email, password, 'donor', {
 *     firstName: 'John',
 *     lastName: 'Doe'
 *   });
 * };
 *
 * return (
 *   <form onSubmit={handleLogin}>
 *     <input type="email" value={email} onChange={setEmail} />
 *     <input type="password" value={password} onChange={setPassword} />
 *     <button type="submit" disabled={loading}>
 *       {loading ? 'Signing In...' : 'Sign In'}
 *     </button>
 *   </form>
 * );
 * ```
 */
export function useAuthActions() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  /** Signs in a user with email and password, then navigates to the appropriate portal. */
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      validateAuthInput(email, password);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const firstName =
        data.user?.user_metadata?.full_name?.split(" ")[0] ??
        data.user?.email ??
        "there";
      showToast({
        type: "success",
        title: `Welcome back, ${firstName}`,
        message: "You're signed in.",
      });
      navigate(
        data.user?.user_metadata?.type === "charity"
          ? "/charity-portal"
          : "/give-dashboard",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to sign in";
      showToast("error", "Sign-in failed", message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /** Registers a new user, creates their profile, and navigates to sign-in. */
  const register = async (
    email: string,
    password: string,
    type: UserType,
    metadata = {},
  ) => {
    try {
      setLoading(true);
      validateAuthInput(email, password);

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            type,
            ...metadata,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          user_id: data.user.id,
          type,
        });

        if (profileError) throw profileError;
      }

      showToast(
        "success",
        "Registration successful",
        "Please check your email to verify your account",
      );
      navigate("/auth");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to register";
      showToast("error", "Authentication Error", message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /** Sends a verification OTP email to the given address. */
  const sendVerificationEmail = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      showToast("success", "Verification email sent");
    } catch (error) {
      showToast("error", "Failed to send verification email");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /** Sends a password-reset email to the given address. */
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      showToast("success", "Password reset email sent");
    } catch (error) {
      showToast("error", "Failed to send reset email");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    login,
    register,
    sendVerificationEmail,
    resetPassword,
    loading,
  };
}
