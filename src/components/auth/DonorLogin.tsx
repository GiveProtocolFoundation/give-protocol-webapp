import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useWeb3 } from "@/contexts/Web3Context";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle } from "lucide-react";

/** Login form component for donor accounts with email and password authentication. */
export const DonorLogin: React.FC = () => {
  const { login, loading } = useAuth();
  const { disconnect } = useWeb3();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null,
  );
  const redirectTarget = useRef<string | null>(null);

  const _from = location.state?.from?.pathname || "/give-dashboard";

  useEffect(() => {
    if (redirectCountdown === null) return undefined;
    if (redirectCountdown === 0) {
      if (redirectTarget.current) {
        navigate(redirectTarget.current);
      }
      return undefined;
    }
    const id = setTimeout(
      () => setRedirectCountdown((c) => (c !== null ? c - 1 : null)),
      1000,
    );
    return () => clearTimeout(id);
  }, [redirectCountdown, navigate]);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
    },
    [],
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    },
    [],
  );

  const handleEmailLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      try {
        await login(email, password, "donor");
        // The login function will handle the redirect to give-dashboard
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sign in";

        // Check for account type mismatch
        if (message.includes("registered as a charity account")) {
          setError(t("auth.donorLogin.mismatch"));

          // Disconnect wallet and start countdown redirect
          await disconnect();
          redirectTarget.current = "/login?type=charity";
          setRedirectCountdown(3);
        } else {
          setError(message);
        }
      }
    },
    [email, password, login, disconnect, t],
  );

  return (
    <form
      onSubmit={handleEmailLogin}
      className="space-y-4"
      aria-label="Donor login form"
    >
      {error && (
        <div
          className="p-3 bg-red-50 text-red-600 rounded-md flex items-start"
          role="alert"
          aria-live="assertive"
        >
          <AlertCircle
            className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0"
            aria-hidden="true"
          />
          <span>
            {error}
            {redirectCountdown !== null && redirectCountdown > 0 && (
              <>
                {" "}
                {t(
                  "auth.donorLogin.redirecting",
                  "Redirecting in {{count}}...",
                  { count: redirectCountdown },
                )}
              </>
            )}
          </span>
        </div>
      )}
      <Input
        label={t("common.email")}
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={handleEmailChange}
        variant="enhanced"
        required
        aria-required="true"
      />
      <Input
        label={t("common.password")}
        type="password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={handlePasswordChange}
        variant="enhanced"
        required
        aria-required="true"
      />
      <Button
        type="submit"
        className="w-full min-h-[48px]"
        disabled={loading}
        aria-busy={loading}
      >
        {loading
          ? t("auth.donorLogin.signingIn", "Signing in...")
          : t("auth.login", "Sign In")}
      </Button>
    </form>
  );
};
