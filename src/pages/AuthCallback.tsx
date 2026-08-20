import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";

const SESSION_TIMEOUT_MS = 5000;

/** OTP types GoTrue can hand back on an emailed verification link. */
const EMAIL_OTP_TYPES: readonly EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * Narrow the untrusted `type` query param to a GoTrue email OTP type.
 *
 * @param {string | null} value - Raw `type` param from the verification link.
 * @returns {EmailOtpType | null} The matching OTP type, or null when unrecognised.
 */
function parseOtpType(value: string | null): EmailOtpType | null {
  const match = EMAIL_OTP_TYPES.find((t) => t === value);
  return match ?? null;
}

/**
 * Read the signup email out of a verification link.
 * The Send Email Hook nests the original `emailRedirectTo` under `next`, so the
 * `email` param can live either at the top level or inside that nested URL.
 *
 * @param {URLSearchParams} params - Query params of the current location.
 * @returns {string} The email address, or an empty string when absent.
 */
function extractEmail(params: URLSearchParams): string {
  const direct = params.get("email");
  if (direct) return direct;

  const next = params.get("next");
  if (!next) return "";

  const queryStart = next.indexOf("?");
  if (queryStart === -1) return "";
  return new URLSearchParams(next.slice(queryStart + 1)).get("email") ?? "";
}

/**
 * AuthCallback page — landing point for email verification and OAuth redirects.
 *
 * Handles both link shapes GoTrue can produce:
 * - `?token_hash=…&type=…` (Send Email Hook / server-side verification). These
 *   are exchanged here via `verifyOtp`, which is cross-device safe — unlike PKCE
 *   `?code=`, it does not need the code_verifier written at signup time, so a
 *   link opened on a different device than the one that signed up still works.
 * - `?code=` / `#access_token=` — auto-parsed by supabase-js on page load.
 *
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
  const email = extractEmail(searchParams);

  const tokenHash = searchParams.get("token_hash");
  const otpType = parseOtpType(searchParams.get("type"));

  // Guards against a second exchange in StrictMode: verification tokens are
  // single-use, so a replayed verifyOtp would fail and show a false "expired".
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (!tokenHash || !otpType || exchangeStarted.current) return;
    exchangeStarted.current = true;

    supabase.auth
      .verifyOtp({ token_hash: tokenHash, type: otpType })
      .then(({ error }) => {
        if (error) {
          setTimedOut(true);
          return;
        }
        if (otpType === "recovery") {
          navigate("/auth/reset-password", { replace: true });
        }
      });
  }, [tokenHash, otpType, navigate]);

  // Defensive guard: if a password-reset link is somehow routed here,
  // forward the user to the dedicated ResetPassword page instead of
  // misrouting them to their dashboard.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        navigate("/auth/reset-password", { replace: true });
      }
    });
    return () => {
      // skipcq: JS-0045 — useEffect cleanup is a valid return value
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    if (!loading && user) {
      if (userType === "charity") {
        navigate("/charity-portal", { replace: true });
      } else if (userType === "donor") {
        navigate("/give-dashboard", { replace: true });
      } else {
        navigate("/browse", { replace: true });
      }
      return undefined;
    }

    const timer = setTimeout(() => {
      setTimedOut(true);
    }, SESSION_TIMEOUT_MS);

    return () => {
      // skipcq: JS-0045 — useEffect cleanup is a valid return value
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
          <div className="bg-amber-100 rounded-full p-4 inline-flex mx-auto mb-6">
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
