import React, { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { DonorRegistration } from "../components/auth/DonorRegistration";
import { CharityVettingForm } from "../components/auth/CharityVettingForm";
import { CharityOrganizationSearch } from "../components/auth/CharityOrganizationSearch";
import { CharityClaimForm } from "../components/auth/CharityClaimForm";
import { ShieldCheck, Link as LinkIcon } from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { formatAddress } from "@/components/Wallet/utils";
import { Logo } from "@/components/Logo";
import type { CharityOrganization } from "@/types/charityOrganization";

type CharityStep = "search" | "claim-form" | "manual-form";

/**
 * Returns the heading text for the charity registration sub-step.
 * @param step - The current charity registration step
 * @returns The heading string
 */
function getCharityHeading(step: CharityStep): string {
  switch (step) {
    case "search":
      return "Find Your Organization";
    case "claim-form":
      return "Claim Your Organization";
    case "manual-form":
      return "Register Charity Organization";
    default:
      return "Register Charity Organization";
  }
}

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

/** Wallet notice on dark panel */
const WALLET_NOTICE_STYLE: React.CSSProperties = {
  background: "rgba(52, 211, 153, 0.08)",
  border: "1px solid rgba(52, 211, 153, 0.2)",
  borderRadius: 12,
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
};

/** Protocol status banner with pulse indicator on the dark left panel. */
const ProtocolStatusBanner: React.FC = () => (
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
        Protocol Status &middot; Genesis Phase
      </p>
      <p
        style={{
          fontSize: "0.85rem",
          color: "rgba(255,255,255,0.75)",
          lineHeight: 1.4,
        }}
      >
        Building the{" "}
        <strong className="text-white font-semibold">
          foundation of transparent giving
        </strong>
      </p>
    </div>
  </div>
);

/** Wallet notice shown when a wallet is connected on the registration left panel. */
const RegisterWalletNotice: React.FC<{ truncatedAddress: string }> = ({
  truncatedAddress,
}) => (
  <div
    className="flex items-start gap-3 animate-fadeUp"
    style={{
      ...WALLET_NOTICE_STYLE,
      padding: "1rem 1.25rem",
      marginTop: "2.5rem",
      animationDelay: "0.3s",
    }}
  >
    <div
      className="shrink-0 flex items-center justify-center"
      style={{
        width: 32,
        height: 32,
        borderRadius: 8,
        background: "rgba(52,211,153,0.15)",
        fontSize: "0.9rem",
      }}
    >
      <LinkIcon className="h-4 w-4" style={{ color: "var(--emerald-400)" }} />
    </div>
    <div
      style={{
        fontSize: "0.8rem",
        color: "rgba(255,255,255,0.7)",
        lineHeight: 1.5,
      }}
    >
      <strong
        style={{
          display: "block",
          color: "var(--emerald-300)",
          fontWeight: 600,
          fontSize: "0.82rem",
          marginBottom: "0.15rem",
        }}
      >
        Wallet detected: {truncatedAddress}
      </strong>{" "}
      Create an account to link this wallet and access your donation history,
      CEF portfolio, and SBT credentials across sessions.
      <a
        href="/about"
        className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
        style={{
          display: "block",
          color: "var(--emerald-400)",
          fontSize: "0.78rem",
          fontWeight: 500,
          marginTop: "0.4rem",
        }}
      >
        Why do I need an account? &rarr;
      </a>
    </div>
  </div>
);

/** "Runs on" trust tags row on the dark left panel. */
const RunsOnTags: React.FC = () => (
  <div>
    <div className="flex items-center gap-2" style={{ marginBottom: "0.6rem" }}>
      <span
        style={{
          fontSize: "0.68rem",
          color: "rgba(255,255,255,0.3)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          fontWeight: 500,
          whiteSpace: "nowrap",
        }}
      >
        Runs on
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
              color: "rgba(255,255,255,0.45)",
              background: "rgba(255,255,255,0.05)",
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

/** Donor/Charity role toggle for the registration form. */
const RoleToggle: React.FC<{
  userType: "donor" | "charity";
  onDonorClick: () => void;
  onCharityClick: () => void;
}> = ({ userType, onDonorClick, onCharityClick }) => (
  <div
    className="grid grid-cols-2 bg-white dark:bg-gray-800 rounded-[12px] p-1"
    style={{
      border: "1.5px solid var(--slate-300)",
      gap: 4,
      marginBottom: "1.75rem",
    }}
    role="radiogroup"
    aria-label="Account type"
  >
    <button
      type="button"
      role="radio"
      aria-checked={userType === "donor"}
      onClick={onDonorClick}
      className={`flex items-center justify-center gap-1.5 rounded-[9px] transition-all duration-200 ${
        userType === "donor"
          ? "bg-emerald-700 text-white shadow-[0_2px_8px_rgba(4,120,87,0.3)]"
          : "text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-700"
      }`}
      style={{ padding: "0.65rem", fontSize: "0.875rem", fontWeight: 500 }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="7"
          cy="4.5"
          r="2.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M2 11.5c0-2.485 2.239-4.5 5-4.5s5 2.015 5 4.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      Donor
    </button>
    <button
      type="button"
      role="radio"
      aria-checked={userType === "charity"}
      onClick={onCharityClick}
      className={`flex items-center justify-center gap-1.5 rounded-[9px] transition-all duration-200 ${
        userType === "charity"
          ? "bg-emerald-700 text-white shadow-[0_2px_8px_rgba(4,120,87,0.3)]"
          : "text-slate-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-700 hover:text-slate-700"
      }`}
      style={{ padding: "0.65rem", fontSize: "0.875rem", fontWeight: 500 }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 14 14"
        fill="none"
        aria-hidden="true"
      >
        <rect
          x="1.5"
          y="2.5"
          width="11"
          height="9"
          rx="1.5"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path
          d="M5 5.5h4M5 8h2.5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      Charity
    </button>
  </div>
);

/** Dark left panel content for the registration page with branding and protocol status. */
const RegisterLeftPanel: React.FC<{
  isConnected: boolean;
  address: string | null;
  truncatedAddress: string;
}> = ({ isConnected, address, truncatedAddress }) => (
  <div
    className="hidden lg:flex relative flex-col justify-center overflow-hidden"
    style={{ backgroundColor: "#064e3b", padding: "3.5rem" }}
  >
    <div
      className="absolute inset-0 pointer-events-none"
      style={ATMOSPHERE_STYLE}
    />
    <div className="absolute inset-0 pointer-events-none" style={GRID_STYLE} />
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
        Smart giving,
        <br />
        <span style={{ color: "var(--emerald-300)" }} className="italic">
          transparent
        </span>{" "}
        impact.
      </h2>
      <p
        className="animate-fadeUp"
        style={{
          fontSize: "0.9rem",
          color: "rgba(255,255,255,0.55)",
          lineHeight: 1.6,
          maxWidth: 320,
          fontWeight: 300,
          animationDelay: "0.2s",
        }}
      >
        Blockchain-powered charitable giving with full transparency,
        accountability, and real-time impact tracking.
      </p>

      {isConnected && address && (
        <RegisterWalletNotice truncatedAddress={truncatedAddress} />
      )}

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

/** Wallet link toggle notice for connected donor wallets. */
const WalletLinkToggle: React.FC<{
  truncatedAddress: string;
  linkWallet: boolean;
  onToggle: () => void;
}> = ({ truncatedAddress, linkWallet, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className="w-full flex items-center justify-between cursor-pointer transition-all duration-200 hover:border-emerald-300"
    style={{
      background: "var(--emerald-50)",
      border: "1.5px solid var(--emerald-100)",
      borderRadius: 10,
      padding: "0.75rem 1rem",
      marginBottom: "1.25rem",
    }}
    role="switch"
    aria-checked={linkWallet}
  >
    <div className="flex items-center gap-2.5">
      <LinkIcon
        className="h-4 w-4 text-emerald-600 shrink-0 p-1 box-content"
        style={{ borderRadius: 8, background: "var(--emerald-100)" }}
      />
      <div
        className="text-left"
        style={{
          fontSize: "0.82rem",
          color: "var(--slate-700)",
          lineHeight: 1.35,
        }}
      >
        <strong
          style={{
            display: "block",
            fontSize: "0.85rem",
            color: "var(--emerald-800)",
            fontWeight: 600,
          }}
        >
          Link wallet {truncatedAddress}
        </strong>{" "}
        Auto-link your connected wallet to this account
      </div>
    </div>
    <div
      className="shrink-0 relative"
      style={{
        width: 36,
        height: 20,
        background: linkWallet ? "var(--emerald-600)" : "#d1d5db",
        borderRadius: 10,
      }}
    >
      <span
        className="absolute bg-white rounded-full shadow-sm transition-all duration-200"
        style={{
          width: 14,
          height: 14,
          top: 3,
          right: linkWallet ? 3 : "auto",
          left: linkWallet ? "auto" : 3,
        }}
      />
    </div>
  </button>
);

/** Notice shown when no wallet is connected during donor registration. */
const WalletDisconnectedNotice: React.FC = () => (
  <div
    className="flex items-center gap-2.5"
    style={{
      background: "var(--slate-50)",
      border: "1.5px solid var(--slate-300)",
      borderRadius: 10,
      padding: "0.75rem 1rem",
      marginBottom: "1.25rem",
    }}
  >
    <LinkIcon
      className="h-4 w-4 text-slate-400 shrink-0 p-1 box-content"
      style={{ borderRadius: 8, background: "var(--slate-100)" }}
    />
    <p style={{ fontSize: "0.82rem", color: "var(--slate-500)" }}>
      You can connect a wallet from your dashboard after signup.
    </p>
  </div>
);

/** Notice about charity wallet setup during charity registration. */
const CharityWalletNotice: React.FC = () => (
  <div className="rounded-[10px] p-4 mb-6 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 border-l-[3px] border-l-emerald-600 flex items-start gap-3.5">
    <div
      className="shrink-0 flex items-center justify-center bg-emerald-50 dark:bg-emerald-900/30"
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
      }}
    >
      <ShieldCheck className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
    </div>
    <div>
      <p
        className="text-slate-500 dark:text-slate-400"
        style={{
          fontSize: "0.65rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        Post-signup step
      </p>
      <p
        className="text-slate-900 dark:text-slate-100 mt-0.5"
        style={{ fontWeight: 600, fontSize: "0.9rem" }}
      >
        Organization wallet setup
      </p>
      <p
        className="text-slate-600 dark:text-slate-300 mt-1"
        style={{ fontSize: "0.8rem", lineHeight: 1.55 }}
      >
        Your charity&apos;s digital asset wallet is configured after account
        creation by an authorized admin, using your organization&apos;s
        dedicated wallet — kept separate from any personal wallets.
      </p>
    </div>
  </div>
);

/** Right panel content for the registration page with role toggle and forms. */
const RegisterRightPanel: React.FC = () => {
  const [searchParams] = useSearchParams();
  const typeParam = searchParams.get("type");
  const [userType, setUserType] = useState<"donor" | "charity">(
    typeParam === "charity" ? "charity" : "donor",
  );
  const [charityStep, setCharityStep] = useState<CharityStep>("search");
  const [selectedOrg, setSelectedOrg] = useState<CharityOrganization | null>(
    null,
  );
  const [linkWallet, setLinkWallet] = useState(true);

  const { address, isConnected } = useWeb3();
  const truncatedAddress = address ? formatAddress(address, "short") : "";

  useEffect(() => {
    if (typeParam === "charity") {
      setUserType("charity");
    } else if (typeParam === "donor") {
      setUserType("donor");
    }
  }, [typeParam]);

  const handleDonorClick = useCallback(() => {
    setUserType("donor");
    setCharityStep("search");
    setSelectedOrg(null);
  }, []);

  const handleCharityClick = useCallback(() => {
    setUserType("charity");
  }, []);

  const handleOrganizationSelect = useCallback((org: CharityOrganization) => {
    setSelectedOrg(org);
    setCharityStep("claim-form");
  }, []);

  const handleSkipSearch = useCallback(() => {
    setCharityStep("manual-form");
  }, []);

  const handleBackToSearch = useCallback(() => {
    setSelectedOrg(null);
    setCharityStep("search");
  }, []);

  const handleLinkWalletToggle = useCallback(() => {
    setLinkWallet((prev) => !prev);
  }, []);

  /** Renders the charity sub-step content based on the current step state. */
  const renderCharityContent = () => {
    switch (charityStep) {
      case "search":
        return (
          <CharityOrganizationSearch
            onOrganizationSelect={handleOrganizationSelect}
            onSkip={handleSkipSearch}
          />
        );
      case "claim-form":
        if (!selectedOrg) return null;
        return (
          <CharityClaimForm
            organization={selectedOrg}
            onBack={handleBackToSearch}
          />
        );
      case "manual-form":
        return <CharityVettingForm />;
      default:
        return null;
    }
  };

  return (
    <div
      className="flex items-center justify-center bg-slate-50 dark:bg-[#050A09]"
      style={{ padding: "3rem 2rem" }}
    >
      <div
        className="w-full animate-fadeUp"
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

        <h1
          className="font-serif text-slate-900 dark:text-white"
          style={{
            fontSize: "2rem",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            marginBottom: "0.4rem",
          }}
        >
          Create your account
        </h1>
        <p
          style={{
            fontSize: "0.875rem",
            color: "var(--slate-500)",
            marginBottom: "2rem",
          }}
        >
          Already have an account?{" "}
          <Link
            to="/auth"
            className="font-medium text-emerald-700 hover:underline"
          >
            Sign in
          </Link>
        </p>

        <RoleToggle
          userType={userType}
          onDonorClick={handleDonorClick}
          onCharityClick={handleCharityClick}
        />

        {/* Context notices */}
        {userType === "donor" && isConnected && (
          <WalletLinkToggle
            truncatedAddress={truncatedAddress}
            linkWallet={linkWallet}
            onToggle={handleLinkWalletToggle}
          />
        )}
        {userType === "donor" && !isConnected && <WalletDisconnectedNotice />}
        {userType === "charity" && <CharityWalletNotice />}

        {/* Form content */}
        {userType !== "donor" && (
          <h2 className="font-serif text-xl font-semibold mb-6 text-gray-900 dark:text-white">
            {getCharityHeading(charityStep)}
          </h2>
        )}
        {userType === "donor" ? <DonorRegistration /> : renderCharityContent()}

        {/* Terms / trust signal */}
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
          256-bit SSL encrypted. By creating an account you agree to our{" "}
          <Link
            to="/legal"
            className="underline"
            style={{ color: "var(--slate-500)", textUnderlineOffset: 2 }}
          >
            Terms
          </Link>{" "}
          and{" "}
          <Link
            to="/privacy"
            className="underline"
            style={{ color: "var(--slate-500)", textUnderlineOffset: 2 }}
          >
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
};

/**
 * Account registration page for donors and charities
 * @returns Register page element
 */
export const Register: React.FC = () => {
  const { address, isConnected } = useWeb3();
  const truncatedAddress = address ? formatAddress(address, "short") : "";

  return (
    <div className="min-h-[calc(100vh-60px)] grid grid-cols-1 lg:grid-cols-[5fr_6fr]">
      <RegisterLeftPanel
        isConnected={isConnected}
        address={address}
        truncatedAddress={truncatedAddress}
      />
      <RegisterRightPanel />
    </div>
  );
};

export default Register;
