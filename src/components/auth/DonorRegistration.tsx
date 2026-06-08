import React, { useState, useCallback } from "react";
import { Fingerprint, ChevronDown, ChevronUp, Wallet } from "lucide-react";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validateEmail, validatePassword } from "@/utils/validation";

/** Google "G" icon for social auth button. */
const GoogleIcon: React.FC = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 14.251 17.64 11.943 17.64 9.2Z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z"
      fill="#EA4335"
    />
  </svg>
);

/**
 * DonorRegistration component with passwordless-first auth options.
 * Displays passkey, Google, and wallet sign-up methods.
 * A collapsible section provides traditional email + password registration.
 * @returns JSX.Element representing the donor registration form.
 */
export const DonorRegistration: React.FC = () => {
  const {
    loading,
    signUpWithEmail,
    registerPasskey,
    signInWithGoogle,
    signInWithWallet,
    isPasskeySupported,
  } = useUnifiedAuth();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      setError("");
    },
    [],
  );

  const handlePasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
      setError("");
    },
    [],
  );

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
      setError("");
    },
    [],
  );

  const handlePasswordToggle = useCallback(() => {
    setIsPasswordOpen((prev) => !prev);
  }, []);

  const handlePasskeySignUp = useCallback(async () => {
    setError("");
    if (!validateEmail(email)) {
      setError(t("auth.validation.emailRequired"));
      return;
    }
    try {
      const randomBytes = new Uint8Array(24);
      crypto.getRandomValues(randomBytes);
      const randomPassword = Array.from(randomBytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      await signUpWithEmail(email, randomPassword);
      await registerPasskey();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Passkey sign-up failed";
      if (
        !message.includes("cancelled") &&
        !message.includes("AbortError") &&
        !message.includes("NotAllowedError")
      ) {
        setError(message);
      }
    }
  }, [email, signUpWithEmail, registerPasskey, t]);

  const handleGoogleSignUp = useCallback(async () => {
    setError("");
    try {
      await signInWithGoogle();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Google sign-up failed";
      setError(message);
    }
  }, [signInWithGoogle]);

  const handleWalletSignUp = useCallback(async () => {
    setError("");
    try {
      await signInWithWallet();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Wallet sign-up failed";
      setError(message);
    }
  }, [signInWithWallet]);

  const handlePasswordSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!validateEmail(email)) {
        setError(t("auth.validation.invalidEmail"));
        return;
      }

      if (!validatePassword(password)) {
        setError(t("auth.validation.passwordTooShort"));
        return;
      }

      if (password !== confirmPassword) {
        setError(t("auth.validation.passwordMismatch"));
        return;
      }

      try {
        await signUpWithEmail(email, password, { type: "donor" });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create account";
        setError(message);
      }
    },
    [email, password, confirmPassword, signUpWithEmail, t],
  );

  return (
    <div className="space-y-4" aria-label="Donor registration form">
      {error !== "" && (
        <div
          className="p-3 bg-red-50 text-red-600 rounded-md"
          role="alert"
          aria-live="assertive"
        >
          {error}
        </div>
      )}

      {/* Email field — shared across all auth paths */}
      <Input
        label={t("common.email")}
        type="email"
        name="email"
        autoComplete="email"
        variant="fintech"
        value={email}
        onChange={handleEmailChange}
        required
        aria-required="true"
      />

      {/* Primary CTA: Passkey */}
      {isPasskeySupported && (
        <Button
          type="button"
          onClick={handlePasskeySignUp}
          className="w-full bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-700 shadow-none hover:from-emerald-600 hover:to-emerald-700 hover:shadow-none"
          disabled={loading}
          aria-busy={loading}
          icon={<Fingerprint className="h-4 w-4" />}
        >
          {loading
            ? t("auth.donorReg.pleaseWait")
            : t("auth.donorReg.signUpPasskey")}
        </Button>
      )}

      {/* Social buttons */}
      <Button
        type="button"
        onClick={handleGoogleSignUp}
        variant="secondary"
        className="w-full"
        disabled={loading}
        icon={<GoogleIcon />}
      >
        {t("auth.donorReg.withGoogle")}
      </Button>

      <Button
        type="button"
        onClick={handleWalletSignUp}
        variant="secondary"
        className="w-full"
        disabled={loading}
        icon={<Wallet className="h-4 w-4" />}
      >
        {t("auth.donorReg.connectWallet")}
      </Button>

      {/* Art. 13 GDPR privacy notice */}
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        {t(
          "auth.donorReg.privacyNotice",
          "By creating an account, you agree to our",
        )}{" "}
        <a
          href="/terms"
          className="underline hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t("auth.donorReg.termsLink", "Terms of Service")}
        </a>{" "}
        {t("auth.donorReg.privacyAnd", "and acknowledge our")}{" "}
        <a
          href="/privacy"
          className="underline hover:text-gray-700 dark:hover:text-gray-300"
        >
          {t("auth.donorReg.privacyLink", "Privacy Policy")}
        </a>
        .
      </p>

      {/* Collapsible password section */}
      <div>
        <button
          type="button"
          onClick={handlePasswordToggle}
          className="w-full flex items-center justify-between text-sm text-gray-500 hover:text-gray-700 transition-colors py-2"
          aria-expanded={isPasswordOpen}
        >
          <span className="font-medium">
            {t("auth.donorReg.orSetPassword")}
          </span>
          {isPasswordOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        {isPasswordOpen && (
          <form
            onSubmit={handlePasswordSubmit}
            className="space-y-4 mt-3"
            aria-label="Password registration form"
          >
            <Input
              label={t("common.password")}
              type="password"
              name="password"
              autoComplete="new-password"
              variant="fintech"
              value={password}
              onChange={handlePasswordChange}
              required
              aria-required="true"
            />

            <Input
              label={t("common.confirmPassword")}
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              variant="fintech"
              value={confirmPassword}
              onChange={handleConfirmPasswordChange}
              required
              aria-required="true"
            />

            <Button
              type="submit"
              className="w-full bg-gradient-to-b from-emerald-500 to-emerald-600 border border-emerald-700 shadow-none hover:from-emerald-600 hover:to-emerald-700 hover:shadow-none"
              disabled={loading}
              aria-busy={loading}
            >
              {loading
                ? t("auth.donorReg.creating")
                : t("auth.donorReg.createAccount")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
