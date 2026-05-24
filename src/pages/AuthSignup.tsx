import React, { useState, useEffect, useCallback } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  Building2,
  Wallet,
  Mail,
  Lock,
  User,
  Fingerprint,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useTranslation } from "@/hooks/useTranslation";
import { validateEmail, validatePassword } from "@/utils/validation";
import { Logger } from "@/utils/logger";

/** Radial gradient atmosphere for dark panels */
const ATMOSPHERE_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(ellipse 80% 60% at 10% 100%, rgba(16,185,129,0.18) 0%, transparent 60%), " +
    "radial-gradient(ellipse 50% 50% at 90% 10%, rgba(52,211,153,0.1) 0%, transparent 55%)",
};

/** 48px emerald-tinted grid overlay for dark panels */
const GRID_STYLE: React.CSSProperties = {
  backgroundImage:
    "linear-gradient(rgba(52,211,153,0.04) 1px, transparent 1px), " +
    "linear-gradient(90deg, rgba(52,211,153,0.04) 1px, transparent 1px)",
  backgroundSize: "48px 48px",
};

/** Protocol status banner with pulse indicator. */
const ProtocolStatusBanner: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      className="relative flex items-center gap-4 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(52,211,153,0.2)",
        borderRadius: 12,
        padding: "1rem 1.25rem",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(90deg, rgba(52,211,153,0.06) 0%, transparent 70%)",
        }}
      />
      <div className="relative shrink-0" style={{ width: 10, height: 10 }}>
        <div
          className="rounded-full relative z-10"
          style={{
            width: 10,
            height: 10,
            background: "var(--emerald-400)",
            boxShadow: "0 0 8px var(--emerald-400)",
          }}
        />
        <span
          className="absolute rounded-full animate-ripple"
          style={{ inset: -5, border: "1.5px solid var(--emerald-400)" }}
        />
        <span
          className="absolute rounded-full animate-ripple"
          style={{
            inset: -5,
            border: "1.5px solid var(--emerald-400)",
            animationDelay: "0.8s",
          }}
        />
      </div>
      <div
        className="shrink-0"
        style={{ width: 1, height: 32, background: "rgba(52,211,153,0.2)" }}
      />
      <div className="relative z-10">
        <p
          style={{
            fontSize: "0.67rem",
            fontWeight: 600,
            color: "var(--emerald-400)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "0.2rem",
          }}
        >
          {t("auth.panel.statusLabel")}
        </p>
        <p
          style={{
            fontSize: "0.85rem",
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.4,
          }}
        >
          {t("auth.panel.statusDesc")}
        </p>
      </div>
    </div>
  );
};

/** "Runs on" trust tags row. */
const RunsOnTags: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div
        className="flex items-center gap-2"
        style={{ marginBottom: "0.6rem" }}
      >
        <span
          style={{
            fontSize: "0.68rem",
            color: "rgba(255,255,255,0.7)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {t("auth.panel.runsOn")}
        </span>
        <div
          className="flex-1"
          style={{ height: 1, background: "rgba(255,255,255,0.07)" }}
        />
      </div>
      <div className="flex flex-wrap" style={{ gap: "0.4rem" }}>
        {["Moonbeam", "Base", "Optimism", "Open Source", "501(c)(3)"].map(
          (tag) => (
            <span
              key={tag}
              style={{
                color: "rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "0.25rem 0.6rem",
                fontSize: "0.68rem",
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ),
        )}
      </div>
    </div>
  );
};

/** Dark left panel for the auth signup page. */
const SignupLeftPanel: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      className="hidden lg:flex relative flex-col justify-center overflow-hidden"
      style={{ backgroundColor: "#064e3b", padding: "3.5rem" }}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={ATMOSPHERE_STYLE}
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={GRID_STYLE}
      />
      <div
        className="absolute rounded-full animate-orbDrift pointer-events-none"
        style={{
          width: 200,
          height: 200,
          top: -60,
          right: -40,
          background: "var(--emerald-400)",
          filter: "blur(60px)",
          opacity: 0.25,
        }}
      />
      <div
        className="absolute rounded-full animate-orbDrift pointer-events-none"
        style={{
          width: 160,
          height: 160,
          bottom: 80,
          left: -30,
          background: "var(--emerald-600)",
          filter: "blur(60px)",
          opacity: 0.25,
          animationDelay: "-3s",
        }}
      />
      <div className="relative z-10">
        <h2
          className="font-serif text-white animate-fadeUp"
          style={{
            fontSize: "clamp(2rem, 3.5vw, 2.75rem)",
            lineHeight: 1.12,
            letterSpacing: "-0.02em",
            marginBottom: "1.25rem",
          }}
        >
          {t("auth.signup.panel.headline")}
        </h2>
        <p
          className="animate-fadeUp"
          style={{
            fontSize: "0.9rem",
            color: "rgba(255,255,255,0.75)",
            lineHeight: 1.6,
            maxWidth: 340,
            fontWeight: 300,
            animationDelay: "0.2s",
          }}
        >
          {t("auth.panel.subheadline")}
        </p>
        <div
          className="space-y-4 animate-fadeUp"
          style={{ marginTop: "2.5rem", animationDelay: "0.8s" }}
        >
          <ProtocolStatusBanner />
          <RunsOnTags />
        </div>
      </div>
    </div>
  );
};

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

/** Collapsible "Or set a password" section with traditional form fields. */
const CollapsiblePasswordSection: React.FC<{
  isOpen: boolean;
  password: string;
  confirmPassword: string;
  loading: boolean;
  onToggle: () => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onConfirmPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}> = ({
  isOpen,
  password,
  confirmPassword,
  loading,
  onToggle,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors py-2"
        aria-expanded={isOpen}
      >
        <span className="font-medium">{t("auth.signup.orSetPassword")}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isOpen && (
        <form onSubmit={onSubmit} className="space-y-3 mt-3">
          <FormInput
            icon={<Lock className="h-4 w-4" />}
            type="password"
            value={password}
            onChange={onPasswordChange}
            placeholder={t("auth.signup.passwordPlaceholder")}
            required
            autoComplete="new-password"
          />
          <FormInput
            icon={<Lock className="h-4 w-4" />}
            type="password"
            value={confirmPassword}
            onChange={onConfirmPasswordChange}
            placeholder={t("auth.signup.confirmPasswordPlaceholder")}
            required
            autoComplete="new-password"
          />
          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={loading}
            className="font-semibold"
          >
            {loading ? t("auth.signup.submitting") : t("auth.signup.submit")}
          </Button>
        </form>
      )}
    </div>
  );
};

/** Right panel content with passwordless-first sign-up and auth method buttons. */
const SignupRightPanel: React.FC = () => {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);

  const {
    isAuthenticated,
    role,
    loading,
    signUpWithEmail,
    signInWithWallet,
    registerPasskey,
    signInWithGoogle,
    isPasskeySupported,
  } = useUnifiedAuth();

  // Trigger entrance animation
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  let from: string;
  if (role === "charity") {
    from = "/charity-portal";
  } else if (role === "admin") {
    from = "/admin";
  } else {
    from = "/give-dashboard";
  }

  const handleEmailSignUp = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!validateEmail(email)) {
        setFormError(t("auth.validation.invalidEmail"));
        return;
      }

      if (!validatePassword(password)) {
        setFormError(t("auth.validation.passwordTooShort"));
        return;
      }

      if (password !== confirmPassword) {
        setFormError(t("auth.validation.passwordMismatch"));
        return;
      }

      try {
        const metadata: Record<string, unknown> = {};
        if (displayName.trim()) {
          metadata.name = displayName.trim();
        }
        await signUpWithEmail(email, password, metadata);
        navigate(
          `/auth/registration-success?type=donor&email=${encodeURIComponent(email)}`,
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Registration failed";
        setFormError(msg);
        Logger.error("Email sign-up failed", { error: msg });
      }
    },
    [displayName, email, password, confirmPassword, signUpWithEmail, t],
  );

  const handlePasskeySignUp = useCallback(async () => {
    setFormError(null);
    if (!validateEmail(email)) {
      setFormError(t("auth.validation.emailRequired"));
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
      const msg = err instanceof Error ? err.message : "Passkey sign-up failed";
      if (
        !msg.includes("cancelled") &&
        !msg.includes("AbortError") &&
        !msg.includes("NotAllowedError")
      ) {
        setFormError(msg);
        Logger.error("Passkey sign-up failed", { error: msg });
      }
    }
  }, [email, signUpWithEmail, registerPasskey, t]);

  const handleGoogleSignUp = useCallback(async () => {
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-up failed";
      setFormError(msg);
      Logger.error("Google sign-up failed", { error: msg });
    }
  }, [signInWithGoogle]);

  const handleWalletSignUp = useCallback(async () => {
    setFormError(null);
    try {
      await signInWithWallet();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Wallet sign-up failed";
      setFormError(msg);
      Logger.error("Wallet sign-up failed", { error: msg });
    }
  }, [signInWithWallet]);

  const handleDisplayNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setDisplayName(e.target.value);
    },
    [],
  );

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

  const handleConfirmPasswordChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setConfirmPassword(e.target.value);
    },
    [],
  );

  const handlePasswordToggle = useCallback(() => {
    setIsPasswordOpen((prev) => !prev);
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const animClass = visible ? "animate-fadeUp" : "opacity-0";

  return (
    <div
      className="flex items-center justify-center bg-slate-50 dark:bg-[#050A09]"
      style={{ padding: "3rem 2rem" }}
    >
      <div
        className={`w-full ${animClass}`}
        style={{ maxWidth: 440, animationDelay: "0.1s" }}
      >
        {/* Mobile-only logo */}
        <Link
          to="/"
          className="lg:hidden mb-8 inline-flex items-center gap-3"
          aria-label="Go to homepage"
        >
          <Logo className="h-10 w-10" />
          <span className="text-gray-900 dark:text-white text-lg font-semibold tracking-tight">
            Give Protocol
          </span>
        </Link>

        {/* Heading */}
        <h1
          className="font-serif text-slate-900 dark:text-white"
          style={{
            fontSize: "2rem",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: "0.4rem",
          }}
        >
          {t("auth.signup.heading")}
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--slate-500)",
            marginBottom: "2rem",
          }}
        >
          {t("auth.signup.subtitle")}
        </p>

        {/* Error alert */}
        {formError !== null && (
          <div
            className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
            role="alert"
          >
            {formError}
          </div>
        )}

        {/* Identity fields: displayName + email */}
        <div className="space-y-4 mb-6">
          <FormInput
            icon={<User className="h-4 w-4" />}
            type="text"
            value={displayName}
            onChange={handleDisplayNameChange}
            placeholder={t("auth.signup.displayName")}
            autoComplete="name"
          />
          <FormInput
            icon={<Mail className="h-4 w-4" />}
            type="email"
            value={email}
            onChange={handleEmailChange}
            placeholder={t("auth.signup.emailPlaceholder")}
            required
            autoComplete="email"
          />
        </div>

        {/* Primary CTA: Passkey */}
        {isPasskeySupported && (
          <Button
            type="button"
            onClick={handlePasskeySignUp}
            fullWidth
            size="lg"
            disabled={loading}
            icon={<Fingerprint className="h-4 w-4" />}
            className="font-semibold mb-3"
          >
            {t("auth.signup.withPasskey")}
          </Button>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          <span className="text-xs text-gray-400 font-medium">
            {t("auth.signin.or")}
          </span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Social + wallet buttons */}
        <div className="space-y-3">
          <Button
            type="button"
            onClick={handleGoogleSignUp}
            variant="secondary"
            fullWidth
            size="lg"
            icon={<GoogleIcon />}
            disabled={loading}
            className="font-semibold"
          >
            {t("auth.signup.withGoogle")}
          </Button>

          <Button
            type="button"
            onClick={handleWalletSignUp}
            variant="secondary"
            fullWidth
            size="lg"
            icon={<Wallet className="h-4 w-4" />}
            disabled={loading}
            className="font-semibold"
          >
            {t("auth.signup.connectWallet")}
          </Button>
        </div>

        {/* Collapsible password section */}
        <CollapsiblePasswordSection
          isOpen={isPasswordOpen}
          password={password}
          confirmPassword={confirmPassword}
          loading={loading}
          onToggle={handlePasswordToggle}
          onPasswordChange={handlePasswordChange}
          onConfirmPasswordChange={handleConfirmPasswordChange}
          onSubmit={handleEmailSignUp}
        />

        {/* Sign in prompt */}
        <p className="mt-6 text-center text-sm text-gray-500">
          {t("auth.signup.alreadyHaveAccount")}{" "}
          <Link
            to="/auth"
            className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline decoration-emerald-500 decoration-2 underline-offset-4"
          >
            {t("auth.signup.signInLink")}
          </Link>
        </p>

        {/* Nonprofit button */}
        <Link
          to="/auth/charity"
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 transition-colors duration-200 group border-t border-gray-100 dark:border-gray-800 mt-5"
        >
          <Building2 className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-white">
            {t("auth.signup.manageNonprofit")}
          </span>
        </Link>

        {/* Trust signal */}
        <p
          className="text-center"
          style={{
            marginTop: "1.25rem",
            fontSize: "0.72rem",
            color: "var(--slate-400)",
            lineHeight: 1.5,
          }}
        >
          <ShieldCheck
            aria-hidden="true"
            className="inline h-3 w-3 mr-1 align-text-bottom"
          />
          {t("auth.signup.trustText")}{" "}
          <Link
            to="/legal"
            className="underline"
            style={{ color: "var(--slate-500)", textUnderlineOffset: 2 }}
          >
            {t("auth.signin.terms")}
          </Link>{" "}
          {t("auth.signup.and")}{" "}
          <Link
            to="/privacy"
            className="underline"
            style={{ color: "var(--slate-500)", textUnderlineOffset: 2 }}
          >
            {t("auth.signup.privacyPolicy")}
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

/** Unified sign-up page with passwordless-first auth and wallet registration. */
const AuthSignup: React.FC = () => (
  <div className="min-h-[calc(100vh-60px)] grid grid-cols-1 lg:grid-cols-[5fr_6fr]">
    <SignupLeftPanel />
    <SignupRightPanel />
  </div>
);

export default AuthSignup;
