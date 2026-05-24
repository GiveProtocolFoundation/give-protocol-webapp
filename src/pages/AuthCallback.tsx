import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";

const SESSION_TIMEOUT_MS = 5000;

/**
 * AuthCallback page — landing point for email verification and OAuth redirects.
 * Supabase JS auto-parses the hash fragment on page load, establishing the session.
 * This component waits briefly for the session to appear then routes the user.
 * On timeout (e.g., expired link), it offers a frictionless one-click resend
 * by reading the user's email from the URL params set in the original verification link.
 *
 * @returns {JSX.Element} Loading spinner while verifying, expired-link state on timeout.
 */
const AuthCallback: React.FC = () => {
  const { user, userType, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [timedOut, setTimedOut] = useState(false);
  const [resendState, setResendState] = useState<
    "idle" | "loading" | "sent" | "error"
  >("idle");

  // Extract email encoded in the emailRedirectTo URL (set at signup time).
  const email = searchParams.get("email") ?? "";

  useEffect(() => {
    if (!loading && user) {
      if (userType === "charity") {
        navigate("/charity-portal", { replace: true });
      } else if (userType === "donor") {
        navigate("/give-dashboard", { replace: true });
      } else {
        navigate("/browse", { replace: true });
      }
      return;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, SESSION_TIMEOUT_MS);

    return () => { // skipcq: JS-0045 — useEffect cleanup is a valid return value
      clearTimeout(timer);
    };
  }, [user, userType, loading, navigate]);

  const handleResend = useCallback(async () => {
    setResendState("loading");
    const { error } = await supabase.functions.invoke("resend-verification", {
      body: { email },
    });
    if (error) {
      setResendState("error");
    } else {
      setResendState("sent");
    }
  }, [email]);

  if (timedOut && !user) {
    const hasEmail = Boolean(email);

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="bg-amber-100 rounded-full p-4">
              <svg
                className="h-10 w-10 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
                />
              </svg>
            </div>
          </div>

          {/* Headline */}
          <h1 className="text-xl font-bold text-gray-900 mb-3">
            Your verification link has expired
          </h1>

          {/* Body */}
          <p className="text-gray-600 mb-6">
            For your security, our verification links expire after 24 hours.
            Let&apos;s get you a fresh one.
          </p>

          {hasEmail ? (
            <>
              {resendState === "sent" ? (
                <div className="flex items-center justify-center gap-2 p-3 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  <span>Link sent!</span>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  fullWidth
                  onClick={handleResend}
                  disabled={resendState === "loading"}
                  className="mb-3"
                >
                  {resendState === "loading" ? "Sending..." : "Send new link"}
                </Button>
              )}

              {resendState === "error" && (
                <p className="text-sm text-red-600 mb-3">
                  Something went wrong. Please try again or return to login.
                </p>
              )}

              {resendState !== "sent" && (
                <p className="text-xs text-gray-400 mb-4">
                  Check your spam folder if it doesn&apos;t arrive within a few
                  minutes.
                </p>
              )}
            </>
          ) : null}

          <Link
            to="/auth"
            className="text-sm text-emerald-600 hover:text-emerald-700 font-medium underline"
          >
            Return to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600 text-sm">Verifying your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
