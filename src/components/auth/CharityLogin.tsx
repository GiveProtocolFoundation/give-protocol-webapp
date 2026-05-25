import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useWeb3 } from "@/contexts/Web3Context";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { AlertCircle, Wallet } from "lucide-react";

/** Login form component for charity accounts with email/password and wallet authentication. */
export const CharityLogin: React.FC = () => {
  const { login, loading: emailLoading } = useAuth();
  const { signInWithWallet } = useUnifiedAuth();
  const { disconnect } = useWeb3();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(
    null,
  );
  const [walletLoading, setWalletLoading] = useState(false);
  const redirectTarget = useRef<string | null>(null);

  const _from = location.state?.from?.pathname || "/charity-portal";

  const loading = emailLoading || walletLoading;

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
      setFieldErrors((prev) => ({ ...prev, email: "" }));
      setError("");
    },
    [],
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      setFieldErrors((prev) => ({ ...prev, password: "" }));
      setError("");
    },
    [],
  );

  const handleEmailLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      try {
        await login(email, password, "charity");
        // The login function will handle the redirect to charity-portal
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to sign in";

        // Check for account type mismatch
        if (message.includes("registered as a donor account")) {
          setError(
            t(
              "auth.charityLogin.mismatch",
              "This email is registered as a donor account. Please sign in at the donor portal.",
            ),
          );

          // Disconnect wallet and start countdown redirect
          await disconnect();
          redirectTarget.current = "/login?type=donor";
          setRedirectCountdown(3);
        } else {
          setError(message);
        }
      }
    },
    [email, password, login, disconnect, t],
  );

  const handleWalletLogin = useCallback(async () => {
    setError("");
    setWalletLoading(true);
    try {
      await signInWithWallet("charity");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect wallet";
      setError(message);
    } finally {
      setWalletLoading(false);
    }
  }, [signInWithWallet]);

  return (
    <div>
      {error && (
        <div
          className="p-3 mb-4 bg-red-50 text-red-600 rounded-md flex items-start"
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
      <form
        onSubmit={handleEmailLogin}
        className="space-y-4"
        aria-label="Charity login form"
      >
        <Input
          label={t("common.email")}
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          error={fieldErrors.email}
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
          error={fieldErrors.password}
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
          {emailLoading
            ? t("auth.charityLogin.signingIn", "Signing in...")
            : t("auth.login", "Sign In")}
        </Button>
      </form>
      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">
          {t("auth.charityLogin.or")}
        </span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full min-h-[48px]"
        disabled={loading}
        onClick={handleWalletLogin}
        icon={<Wallet className="h-4 w-4" />}
      >
        {walletLoading
          ? t("auth.charityLogin.connecting", "Connecting...")
          : t("auth.charityLogin.connectWallet", "Connect Wallet")}
      </Button>
    </div>
  );
};
