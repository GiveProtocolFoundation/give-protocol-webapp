import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type PageState = "validating" | "ready" | "submitting" | "success" | "invalid";

/**
 * Landing page for Supabase password-reset magic links.
 * Supabase JS auto-parses the URL hash on page load and fires a
 * PASSWORD_RECOVERY auth state change event. This page listens for that event,
 * then presents a form where the user can set their new password.
 *
 * @returns {JSX.Element} Password reset form, loading state, success, or
 *   invalid-link state.
 */
const ResetPassword: React.FC = () => {
  const { t } = useTranslation();
  const [pageState, setPageState] = useState<PageState>("validating");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const startInvalidTimer = () => {
      timeoutId = setTimeout(() => {
        setPageState((prev) => (prev === "validating" ? "invalid" : prev));
      }, 5000);
    };

    // Belt-and-suspenders: if Supabase already exchanged the token before
    // this component mounted, getSession will return the recovery session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState("ready");
      } else {
        startInvalidTimer();
      }
    });

    // Primary signal: PASSWORD_RECOVERY event fired by Supabase JS when it
    // detects #type=recovery in the URL hash.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        if (timeoutId !== null) clearTimeout(timeoutId);
        setPageState("ready");
      }
    });

    return () => {
      subscription.unsubscribe();
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  }, []);

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    [],
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (password !== confirmPassword) {
        setError(
          t("auth.resetPassword.mismatch", "Passwords do not match."),
        );
        return;
      }

      setPageState("submitting");
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        setPageState("ready");
      } else {
        setPageState("success");
      }
    },
    [password, confirmPassword, t],
  );

  if (pageState === "validating") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t("auth.resetPassword.validating", "Validating reset link\u2026")}
          </p>
        </div>
      </div>
    );
  }

  if (pageState === "invalid") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="bg-red-100 dark:bg-red-900/30 rounded-full p-4 inline-flex mx-auto mb-6">
            <svg
              aria-hidden="true"
              className="h-10 w-10 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {t(
              "auth.resetPassword.invalidLink",
              "This password reset link is invalid or has expired.",
            )}
          </h1>
          <Link
            to="/auth"
            className="text-sm text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium underline"
          >
            {t("auth.resetPassword.requestNew", "Request a new reset link")}
          </Link>
        </div>
      </div>
    );
  }

  if (pageState === "success") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
          <div className="bg-emerald-100 dark:bg-emerald-900/30 rounded-full p-4 inline-flex mx-auto mb-6">
            <svg
              aria-hidden="true"
              className="h-10 w-10 text-emerald-600 dark:text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
            {t(
              "auth.resetPassword.success",
              "Password updated successfully!",
            )}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t(
              "auth.resetPassword.successSubtitle",
              "You can now sign in with your new password.",
            )}
          </p>
          <Link
            to="/auth"
            className="block w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-center font-medium transition-colors"
          >
            {t("auth.resetPassword.backToSignIn", "Back to Sign In")}
          </Link>
        </div>
      </div>
    );
  }

  // pageState === "ready" | "submitting"
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t("auth.resetPassword.title", "Set New Password")}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          {t(
            "auth.resetPassword.subtitle",
            "Choose a strong password for your account.",
          )}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            label={t("auth.resetPassword.newPassword", "New Password")}
            value={password}
            onChange={handlePasswordChange}
            autoComplete="new-password"
            required
            minLength={8}
          />
          <Input
            type="password"
            label={t(
              "auth.resetPassword.confirmPassword",
              "Confirm New Password",
            )}
            value={confirmPassword}
            onChange={handleConfirmPasswordChange}
            autoComplete="new-password"
            required
          />

          {error !== "" && (
            <div role="alert" className="text-sm text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full min-h-[48px]"
            disabled={pageState === "submitting"}
            aria-busy={pageState === "submitting"}
          >
            {pageState === "submitting"
              ? t("auth.resetPassword.updating", "Updating\u2026")
              : t("auth.resetPassword.submit", "Update Password")}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
