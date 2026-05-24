import React, { useState, useEffect, useCallback } from "react";
import {
  Link,
  Navigate,
  useLocation,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { Building2, Wallet, Plus } from "lucide-react";
import { DonorLogin } from "../components/auth/DonorLogin";
import { CharityLogin } from "../components/auth/CharityLogin";
import { ForgotPassword } from "../components/auth/ForgotPassword";
import { ForgotUsername } from "../components/auth/ForgotUsername";
import { Button } from "../components/ui/Button";
import { Logo } from "../components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useTranslation } from "@/hooks/useTranslation";

type View =
  | "select"
  | "donor"
  | "charity"
  | "forgotPassword"
  | "forgotUsername";

/** Tray below the nonprofit login form linking to charity registration. */
function NonprofitOnboardingTray() {
  const { t } = useTranslation();
  return (
    <div className="mt-8 rounded-xl bg-emerald-50/60 border border-emerald-100 px-5 py-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 h-px bg-emerald-200" />
        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
          {t("auth.login.nonprofitTrayTitle")}
        </span>
        <div className="flex-1 h-px bg-emerald-200" />
      </div>

      <Link
        to="/register?type=charity"
        className="flex items-center gap-3 rounded-xl bg-white border border-emerald-200 p-4 hover:border-emerald-400 hover:shadow-md transition-all duration-200 group"
      >
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition-colors flex-shrink-0">
          <Plus className="h-5 w-5 text-emerald-700" />
        </div>
        <div>
          <span className="text-sm font-bold text-gray-900 block">
            {t("auth.login.createNonprofitAccount")}
          </span>
          <span className="text-xs text-emerald-700">
            {t("auth.login.registerOrg")}
          </span>
        </div>
      </Link>
    </div>
  );
}

interface LoginHelpersProps {
  onForgotUsername: () => void;
  onForgotPassword: () => void;
}

/** Help links below the login form for recovering username or password */
function LoginHelpers({ onForgotUsername, onForgotPassword }: LoginHelpersProps) {
  const { t } = useTranslation();
  return (
    <nav className="mt-6 space-y-4" aria-label="Login help options">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-base">
          <span className="px-2 bg-white text-gray-700">{t("auth.login.needHelp")}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={onForgotUsername}
          className="text-base text-emerald-700 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md px-3 py-2 min-h-[48px] transition-colors duration-200"
          aria-label="Recover forgotten username"
        >
          {t("auth.login.forgotUsernameBtn")}
        </button>
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-base text-emerald-700 hover:text-emerald-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md px-3 py-2 min-h-[48px] transition-colors duration-200"
          aria-label="Recover forgotten password"
        >
          {t("auth.login.forgotPasswordBtn")}
        </button>
      </div>
    </nav>
  );
}

/** Login page component that handles account type selection, donor/charity login, and password recovery flows. */
const Login: React.FC = () => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  const [view, setView] = useState<View>(
    typeParam === "charity" ? "charity" : "select",
  );
  const { user, userType } = useAuth();
  const { connect, isConnecting, address: _address } = useWeb3();
  const _navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Trigger .visible class after mount for staggered entrance animation
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Get the intended destination from location state, or default to dashboard
  const from =
    location.state?.from?.pathname ||
    (userType === "charity" ? "/charity-portal" : "/give-dashboard");

  // Memoized handlers
  const handleForgotUsername = useCallback(() => {
    setView("forgotUsername");
  }, []);

  const handleForgotPassword = useCallback(() => {
    setView("forgotPassword");
  }, []);

  const handleDonorView = useCallback(() => {
    setView("donor");
  }, []);

  const handleCharityView = useCallback(() => {
    setView("charity");
  }, []);

  const handleSelectView = useCallback(() => {
    setView("select");
  }, []);

  const handleWalletConnect = useCallback(() => {
    connect();
  }, [connect]);

  // Set view based on URL parameter on mount and when it changes
  useEffect(() => {
    if (typeParam === "charity") {
      setView("charity");
    }
  }, [typeParam]);

  // Redirect only if user is fully authenticated
  if (user) {
    return <Navigate to={from} replace />;
  }

  const visibleClass = visible ? "visible" : "";

  /** Renders the appropriate login view based on the current view state. */
  const renderView = () => {
    switch (view) {
      case "select":
        return (
          <div className="space-y-6">
            {/* Primary CTA — email/password login */}
            <Button
              onClick={handleDonorView}
              fullWidth
              size="lg"
              className="font-semibold"
            >
              {t("auth.login.continueDonor")}
            </Button>

            {/* Secondary CTA — wallet connect */}
            <Button
              onClick={handleWalletConnect}
              variant="secondary"
              fullWidth
              size="lg"
              icon={<Wallet className="h-5 w-5" />}
              disabled={isConnecting}
              className="font-semibold"
            >
              {isConnecting ? t("auth.login.connecting") : t("auth.login.connectWalletSignIn")}
            </Button>

            {/* Sign up prompt */}
            <div className="text-center space-y-1 pt-2">
              <p className="text-sm text-gray-500">{t("auth.login.newToPlatform")}</p>
              <Link
                to="/register"
                className="inline-block text-sm text-emerald-700 hover:text-emerald-800 font-semibold hover:underline decoration-emerald-500 decoration-2 underline-offset-4 transition-all duration-200 py-1 px-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                {t("auth.login.newDonorSignUp")}
              </Link>
            </div>

            {/* Nonprofit footer section */}
            <div className="border-t border-gray-100 pt-5 mt-2">
              <button
                type="button"
                onClick={handleCharityView}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors duration-200 group"
              >
                <Building2 className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                <span className="text-sm font-medium text-gray-600 group-hover:text-gray-800">
                  {t("auth.login.manageNonprofit")}
                </span>
              </button>
            </div>
          </div>
        );
      case "donor":
        return (
          <>
            <div className="mb-6">
              <button
                onClick={handleSelectView}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md px-2 py-2 min-h-[44px] transition-colors duration-200"
                aria-label="Go back to sign in options"
              >
                {t("auth.login.back")}
              </button>
              <h2 className="mt-3 text-xl font-semibold text-center text-gray-900">
                {t("auth.login.donorTitle")}
              </h2>
              <p className="text-center text-sm text-gray-500 mt-1">
                {t("auth.login.donorSubtitle")}
              </p>
            </div>
            <DonorLogin />
            <LoginHelpers
              onForgotUsername={handleForgotUsername}
              onForgotPassword={handleForgotPassword}
            />
          </>
        );
      case "forgotPassword":
        return <ForgotPassword onBack={handleSelectView} />;
      case "forgotUsername":
        return <ForgotUsername onBack={handleSelectView} />;
      case "charity":
        return (
          <>
            <div className="mb-6">
              <button
                onClick={handleSelectView}
                className="text-sm text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-md px-2 py-2 min-h-[44px] transition-colors duration-200"
                aria-label="Go back to sign in options"
              >
                {t("auth.login.back")}
              </button>
              <h2 className="mt-3 text-xl font-semibold text-center text-gray-900">
                {t("auth.login.charityTitle")}
              </h2>
              <p className="text-center text-sm text-gray-500 mt-1">
                {t("auth.login.charitySubtitle")}
              </p>
            </div>
            <CharityLogin />
            <LoginHelpers
              onForgotUsername={handleForgotUsername}
              onForgotPassword={handleForgotPassword}
            />
            <NonprofitOnboardingTray />
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center bg-gray-50 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Skip-to-content link for screen readers */}
      <a
        href="#login-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-emerald-700 focus:ring-2 focus:ring-emerald-500"
      >
        {t("auth.login.skipToContent")}
      </a>

      {/* Page heading */}
      <h1
        className={`frame-reveal ${visibleClass} text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-8 tracking-tight`}
        style={{ "--reveal-delay": "0.03s" } as React.CSSProperties}
      >
        {t("auth.login.welcomeHeading")}
      </h1>

      <section
        id="login-content"
        aria-label="Login"
        className="max-w-md w-full bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-100"
      >
        {/* Logo + card header */}
        <div
          className={`frame-reveal ${visibleClass} flex flex-col items-center mb-6`}
          style={{ "--reveal-delay": "0.05s" } as React.CSSProperties}
        >
          <Link
            to="/"
            className="flex items-center mb-4"
            aria-label="Go to homepage"
          >
            <Logo className="h-12 w-12" />
          </Link>
          <h2 className="text-xl font-semibold text-gray-900">
            {t("auth.login.signInOrConnect")}
          </h2>
        </div>

        {/* View content */}
        <div
          className={`frame-reveal ${visibleClass}`}
          style={{ "--reveal-delay": "0.1s" } as React.CSSProperties}
        >
          {renderView()}
        </div>
      </section>
    </div>
  );
};

export default Login;
