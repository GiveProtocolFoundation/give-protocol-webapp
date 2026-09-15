import React, { useState, useEffect, useCallback } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { usePageTitle } from "@/hooks/usePageTitle";
import {
  ShieldCheck,
  Wallet,
  Mail,
  Lock,
  Fingerprint,
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { FormInput } from "@/components/ui/FormInput";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ForgotPassword } from "@/components/auth/ForgotPassword";
import { WalletModal } from "@/components/web3/WalletModal/WalletModal";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import type { WalletAuthStep } from "@/hooks/useUnifiedAuth";
import { useUnifiedWallets } from "@/hooks/useWallet";
import { useMultiChainContext } from "@/contexts/MultiChainContext";
import type { UnifiedWalletProvider, ChainType } from "@/types/wallet";
import { Logger } from "@/utils/logger";

type View = "signin" | "forgotPassword";

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
        {["Arbitrum", "Base", "Optimism", "Open Source", "501(c)(3)"].map(
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

/** Value propositions displayed on the left panel. */
const AuthValueProps: React.FC = () => (
  <div className="space-y-3 mb-8">
    <div className="flex items-center gap-3 text-white/85 text-xs sm:text-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>100% on-chain transparency & direct funding</span>
    </div>
    <div className="flex items-center gap-3 text-white/85 text-xs sm:text-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>Donate seamlessly via credit card or Web3 wallet</span>
    </div>
    <div className="flex items-center gap-3 text-white/85 text-xs sm:text-sm">
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span>Automated instant tax receipts for all donors</span>
    </div>
  </div>
);

/** Dark left panel for the auth page. */
const AuthLeftPanel: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div
      className="hidden lg:flex relative flex-col justify-between overflow-hidden"
      style={{ backgroundColor: "#064e3b", padding: "3rem 3.5rem" }}
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
          width: 240,
          height: 240,
          top: -60,
          right: -40,
          background: "var(--emerald-400)",
          filter: "blur(70px)",
          opacity: 0.2,
        }}
      />
      <div
        className="absolute rounded-full animate-orbDrift pointer-events-none"
        style={{
          width: 200,
          height: 200,
          bottom: 60,
          left: -40,
          background: "var(--emerald-600)",
          filter: "blur(70px)",
          opacity: 0.25,
          animationDelay: "-3s",
        }}
      />

      {/* Brand anchor at top */}
      <div className="relative z-10">
        <Link
          to="/"
          className="inline-flex items-center gap-3 group"
          aria-label="Go to homepage"
        >
          <Logo className="h-9 w-9 transition-transform group-hover:scale-105" />
          <span className="text-white text-xl font-bold tracking-tight">
            Give Protocol
          </span>
        </Link>
      </div>

      {/* Hero content in center */}
      <div className="relative z-10 max-w-md my-auto py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/20 text-emerald-300 text-xs font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Web3 Philanthropy Reimagined</span>
        </div>
        <h2
          className="font-serif text-white animate-fadeUp"
          style={{
            fontSize: "clamp(2rem, 3.2vw, 2.75rem)",
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            marginBottom: "1rem",
          }}
        >
          {t("auth.panel.headline")}
        </h2>
        <p
          className="animate-fadeUp"
          style={{
            fontSize: "0.95rem",
            color: "rgba(255,255,255,0.78)",
            lineHeight: 1.6,
            maxWidth: 380,
            fontWeight: 300,
            animationDelay: "0.2s",
            marginBottom: "1.75rem",
          }}
        >
          {t("auth.panel.subheadline")}
        </p>

        {/* Value props list */}
        <AuthValueProps />

        <div
          className="space-y-4 animate-fadeUp"
          style={{ animationDelay: "0.4s" }}
        >
          <ProtocolStatusBanner />
        </div>
      </div>

      {/* Bottom tags */}
      <div className="relative z-10 pt-4">
        <RunsOnTags />
      </div>
    </div>
  );
};

/** Show/hide toggle button for password fields. */
const PasswordToggle: React.FC<{
  showPassword: boolean;
  onToggle: () => void;
}> = ({ showPassword, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    aria-label={showPassword ? "Hide password" : "Show password"}
    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none p-1 transition-colors"
  >
    {showPassword ? (
      <EyeOff className="h-4 w-4" />
    ) : (
      <Eye className="h-4 w-4" />
    )}
  </button>
);

/** Sign-in form fields extracted to reduce JSX nesting depth. */
const SignInFormFields: React.FC<{
  email: string;
  password: string;
  loading: boolean;
  hasError: boolean;
  onEmailChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onPasswordChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onForgotPassword: () => void;
  onSubmit: (_e: React.FormEvent) => void;
}> = ({
  email,
  password,
  loading,
  hasError,
  onEmailChange,
  onPasswordChange,
  onForgotPassword,
  onSubmit,
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="signin-email"
          className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5"
        >
          {t("auth.signin.emailPlaceholder")}
        </label>
        <FormInput
          id="signin-email"
          icon={<Mail className="h-4 w-4" />}
          type="email"
          value={email}
          onChange={onEmailChange}
          placeholder={t("auth.signin.emailPlaceholder")}
          required
          autoComplete="email"
          aria-describedby={hasError ? "signin-form-error" : undefined}
          aria-invalid={hasError}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label
            htmlFor="signin-password"
            className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider"
          >
            {t("auth.signin.passwordPlaceholder")}
          </label>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline transition-colors"
          >
            {t("auth.signin.forgotPasswordLink")}
          </button>
        </div>
        <FormInput
          id="signin-password"
          icon={<Lock className="h-4 w-4" />}
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={onPasswordChange}
          placeholder={t("auth.signin.passwordPlaceholder")}
          required
          autoComplete="current-password"
          aria-describedby={hasError ? "signin-form-error" : undefined}
          aria-invalid={hasError}
          rightElement={
            <PasswordToggle
              showPassword={showPassword}
              onToggle={() => setShowPassword((prev) => !prev)}
            />
          }
        />
      </div>

      <Button
        type="submit"
        fullWidth
        size="lg"
        disabled={loading}
        className="font-semibold shadow-sm hover:shadow transition-all mt-2"
      >
        {loading ? t("auth.signin.submitting") : t("auth.login")}
      </Button>
    </form>
  );
};

/** Returns the i18n key for each wallet auth step. */
function walletStepKey(step: WalletAuthStep): string {
  switch (step) {
    case "connecting":
      return "auth.wallet.connecting";
    case "signing":
      return "auth.wallet.signing";
    case "verifying":
      return "auth.wallet.verifying";
    case "session":
      return "auth.wallet.openingSession";
    default:
      return "auth.wallet.connect";
  }
}

/** Heading and optional error banner for the sign-in card. */
const SignInCardHeader: React.FC<{
  formError: string | null;
}> = ({ formError }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="mb-6">
        <h1
          className="font-serif text-slate-900 dark:text-white"
          style={{
            fontSize: "1.875rem",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: "0.35rem",
          }}
        >
          {t("auth.signin.welcomeBack")}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t("auth.signin.subtitle")}
        </p>
      </div>

      {formError && (
        <div
          id="signin-form-error"
          className="flex items-center gap-2 p-3 mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm"
          role="alert"
        >
          {formError}
        </div>
      )}
    </>
  );
};

/** 1-Click Fast Auth buttons for Google and Passkey. */
const FastAuthButtons: React.FC<{
  isPasskeySupported: boolean;
  loading: boolean;
  onGoogleSignIn: () => void;
  onPasskeySignIn: () => void;
}> = ({ isPasskeySupported, loading, onGoogleSignIn, onPasskeySignIn }) => {
  const { t } = useTranslation();
  return (
    <div
      className={`grid gap-3 mb-5 ${
        isPasskeySupported ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
      }`}
    >
      <Button
        type="button"
        onClick={onGoogleSignIn}
        variant="secondary"
        fullWidth
        size="md"
        disabled={loading}
        icon={<GoogleIcon />}
        className="font-medium text-xs sm:text-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {t("auth.signin.withGoogle")}
      </Button>

      {isPasskeySupported && (
        <Button
          type="button"
          onClick={onPasskeySignIn}
          variant="secondary"
          fullWidth
          size="md"
          disabled={loading}
          icon={
            <Fingerprint className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          }
          className="font-medium text-xs sm:text-sm border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {t("auth.signin.withPasskey")}
        </Button>
      )}
    </div>
  );
};

/** Visual separator between auth options. */
const AuthDivider: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-3 my-5">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
      <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
        {t("auth.signin.or")}
      </span>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
    </div>
  );
};

/** Web3 wallet sign-in button. */
const WalletSignInButton: React.FC<{
  loading: boolean;
  walletAuthStep: WalletAuthStep;
  onClick: () => void;
}> = ({ loading, walletAuthStep, onClick }) => {
  const { t } = useTranslation();
  return (
    <Button
      onClick={onClick}
      variant="secondary"
      fullWidth
      size="lg"
      icon={
        walletAuthStep !== null ? (
          <LoadingSpinner size="sm" color="secondary" />
        ) : (
          <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        )
      }
      disabled={loading}
      className="font-semibold border-emerald-200/80 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 transition-colors"
    >
      {t(walletStepKey(walletAuthStep))}
    </Button>
  );
};

/** Sign-up prompt linking to the registration page. */
const SignUpPrompt: React.FC = () => {
  const { t } = useTranslation();
  return (
    <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
      {t("auth.signin.newToProtocol")}{" "}
      <Link
        to="/auth/signup"
        className="font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:underline decoration-emerald-500 decoration-2 underline-offset-4"
      >
        {t("auth.signin.createAccount")}
      </Link>
    </p>
  );
};

/** Trust signal footer with SSL notice and terms/privacy links. */
const AuthTrustFooter: React.FC = () => {
  const { t } = useTranslation();
  return (
    <p
      className="text-center mt-5"
      style={{
        fontSize: "0.75rem",
        color: "var(--slate-400)",
        lineHeight: 1.5,
      }}
    >
      <ShieldCheck
        aria-hidden="true"
        className="inline h-3.5 w-3.5 mr-1 align-text-bottom text-emerald-600 dark:text-emerald-400"
      />
      {t("auth.signin.sslEncrypted")} &middot;{" "}
      <Link
        to="/legal"
        className="underline hover:text-gray-700 dark:hover:text-gray-300"
        style={{ color: "var(--slate-500)", textUnderlineOffset: 2 }}
      >
        {t("auth.signin.terms")}
      </Link>{" "}
      &middot;{" "}
      <Link
        to="/privacy"
        className="underline hover:text-gray-700 dark:hover:text-gray-300"
        style={{ color: "var(--slate-500)", textUnderlineOffset: 2 }}
      >
        {t("auth.signin.privacy")}
      </Link>
    </p>
  );
};

/** Right panel content with sign-in form and wallet authentication. */
const AuthRightPanel: React.FC = () => {
  const [view, setView] = useState<View>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const {
    isAuthenticated,
    role,
    loading,
    walletAuthStep,
    signInWithEmail,
    signInWithWallet,
    signInWithPasskey,
    signInWithGoogle,
    isPasskeySupported,
    isWalletConnected: _isWalletConnected,
  } = useUnifiedAuth();

  const { wallets } = useUnifiedWallets();
  const multiChain = useMultiChainContext();

  const location = useLocation();

  // Trigger entrance animation
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  let defaultPath: string;
  if (role === "charity") {
    defaultPath = "/charity-portal";
  } else if (role === "admin") {
    defaultPath = "/admin";
  } else {
    defaultPath = "/give-dashboard";
  }
  const from = location.state?.from?.pathname ?? defaultPath;

  const handleEmailSignIn = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);
      try {
        await signInWithEmail(email, password);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Sign in failed";
        setFormError(msg);
        Logger.error("Email sign-in failed", { error: msg });
      }
    },
    [email, password, signInWithEmail],
  );

  const handlePasskeySignIn = useCallback(async () => {
    setFormError(null);
    try {
      await signInWithPasskey();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed";
      if (
        !msg.includes("cancelled") &&
        !msg.includes("AbortError") &&
        !msg.includes("NotAllowedError")
      ) {
        setFormError(msg);
        Logger.error("Passkey sign-in failed", { error: msg });
      }
    }
  }, [signInWithPasskey]);

  const handleGoogleSignIn = useCallback(async () => {
    setFormError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed";
      setFormError(msg);
      Logger.error("Google sign-in failed", { error: msg });
    }
  }, [signInWithGoogle]);

  const handleWalletButtonClick = useCallback(() => {
    setFormError(null);
    setShowWalletModal(true);
  }, []);

  const handleWalletModalClose = useCallback(() => {
    setShowWalletModal(false);
  }, []);

  const handleWalletModalConnect = useCallback(
    async (wallet: UnifiedWalletProvider, chainType: ChainType) => {
      try {
        await multiChain.connect(wallet, chainType);
        setShowWalletModal(false);

        // Always pass wallet info so signInWithWallet uses the correct provider
        // (prevents Phantom from intercepting MetaMask requests via window.ethereum)
        const accounts = await wallet.getAccounts(chainType);
        const address = accounts[0]?.address;
        if (!address) {
          throw new Error("No account found after wallet connection");
        }
        await signInWithWallet("donor", { wallet, chainType, address });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Wallet sign-in failed";
        setFormError(msg);
        Logger.error("Wallet sign-in via modal failed", { error: msg });
        throw err;
      }
    },
    [multiChain, signInWithWallet],
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

  const handleShowForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, []);

  const handleBackToSignIn = useCallback(() => {
    setView("signin");
  }, []);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  if (view === "forgotPassword") {
    return (
      <div className="flex items-center justify-center bg-slate-50/70 dark:bg-[#050A09] px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xl shadow-emerald-950/5 p-6 sm:p-8">
          <ForgotPassword onBack={handleBackToSignIn} />
        </div>
      </div>
    );
  }

  const animClass = visible ? "animate-fadeUp" : "opacity-0";

  return (
    <div className="flex items-center justify-center bg-slate-50/70 dark:bg-[#050A09] px-4 py-8 sm:px-6 lg:px-8">
      <div
        className={`w-full max-w-md ${animClass}`}
        style={{ animationDelay: "0.1s" }}
      >
        {/* Mobile-only logo */}
        <Link
          to="/"
          className="lg:hidden mb-6 inline-flex items-center gap-3"
          aria-label="Go to homepage"
        >
          <Logo className="h-9 w-9" />
          <span className="text-gray-900 dark:text-white text-lg font-bold tracking-tight">
            Give Protocol
          </span>
        </Link>

        {/* Elevated Form Card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-xl shadow-emerald-950/5 p-6 sm:p-8">
          <SignInCardHeader formError={formError} />

          <FastAuthButtons
            isPasskeySupported={isPasskeySupported}
            loading={loading}
            onGoogleSignIn={handleGoogleSignIn}
            onPasskeySignIn={handlePasskeySignIn}
          />

          {/* Email/Password form with integrated forgot password and show/hide toggle */}
          <SignInFormFields
            email={email}
            password={password}
            loading={loading}
            hasError={formError !== null}
            onEmailChange={handleEmailChange}
            onPasswordChange={handlePasswordChange}
            onForgotPassword={handleShowForgotPassword}
            onSubmit={handleEmailSignIn}
          />

          <AuthDivider />

          <WalletSignInButton
            loading={loading}
            walletAuthStep={walletAuthStep}
            onClick={handleWalletButtonClick}
          />

          <WalletModal
            isOpen={showWalletModal}
            onClose={handleWalletModalClose}
            wallets={wallets}
            onConnect={handleWalletModalConnect}
            initialChainType="evm"
          />

          <SignUpPrompt />
        </div>

        <AuthTrustFooter />
      </div>
    </div>
  );
};

/** Unified sign-in page with email and wallet authentication. */
const Auth: React.FC = () => {
  usePageTitle("Sign In");
  return (
    <div className="min-h-[calc(100vh-60px)] grid grid-cols-1 lg:grid-cols-[5fr_6fr]">
      <AuthLeftPanel />
      <AuthRightPanel />
    </div>
  );
};

export default Auth;
