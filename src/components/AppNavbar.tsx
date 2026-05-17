import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "./Logo";
import { ConnectButton } from "./web3/ConnectButton";
import { ClientOnly } from "./ClientOnly";
import { SettingsMenu } from "./SettingsMenu";
import { WalletButton, NetworkSelector } from "./Wallet";
import type { NetworkType, WalletProviderType } from "./Wallet";
import {
  switchEvmNetwork,
  switchSolanaNetwork,
  switchPolkadotNetwork,
} from "./appNavbarHelpers";
import { Menu, X, LogOut } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useMultiChainContext } from "@/contexts/MultiChainContext";
import { DOCS_CONFIG } from "@/config/docs";
import { NETWORKS } from "./Wallet/types";

// Desktop navigation links component
const DesktopNavLinks: React.FC<{
  isLimitedNavPage: boolean;
  isActive: (_path: string) => string;
  isAuthenticated: boolean;
  handleDashboardClick: () => void;
  t: (_key: string) => string;
}> = ({
  isLimitedNavPage,
  isActive,
  isAuthenticated,
  handleDashboardClick,
  t,
}) => {
  if (isLimitedNavPage) {
    return (
      <>
        <Link
          to="/about"
          className={`flex items-center justify-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 ${isActive("/about")}`}
        >
          {t("nav.about")}
        </Link>
        <a
          href={DOCS_CONFIG.url}
          className="flex items-center justify-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 text-[rgba(255,255,255,0.75)] hover:text-emerald-300"
        >
          {t("nav.docs")}
        </a>
        <Link
          to="/legal"
          className={`flex items-center justify-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 ${isActive("/legal")}`}
        >
          {t("nav.legal")}
        </Link>
        <Link
          to="/privacy"
          className={`flex items-center justify-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 ${isActive("/privacy")}`}
        >
          Privacy
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        to="/browse"
        className={`flex items-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 ${isActive("/browse")}`}
      >
        {t("nav.browse")}
      </Link>
      <Link
        to="/opportunities"
        className={`flex items-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 ${isActive("/opportunities")}`}
      >
        {t("nav.opportunities")}
      </Link>
      {isAuthenticated && (
        <>
          <Link
            to="/contributions"
            className={`flex items-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 ${isActive("/contributions")}`}
          >
            {t("nav.contributions")}
          </Link>
          <button
            onClick={handleDashboardClick}
            className={`flex items-center px-3 py-2 rounded-md text-[0.82rem] font-medium transition-colors duration-200 ${
              isActive("/give-dashboard") || isActive("/charity-portal")
            }`}
          >
            {t("nav.dashboard")}
          </button>
        </>
      )}
    </>
  );
};

// Mobile navigation links component
const MobileNavLinks: React.FC<{
  isLimitedNavPage: boolean;
  isActive: (_path: string) => string;
  isAuthenticated: boolean;
  handleDashboardClick: () => void;
  handleLinkClick: () => void;
  t: (_key: string) => string;
}> = ({
  isLimitedNavPage,
  isActive,
  isAuthenticated,
  handleDashboardClick,
  handleLinkClick,
  t,
}) => {
  const handleDashboardAndClose = useCallback(() => {
    handleLinkClick();
    handleDashboardClick();
  }, [handleLinkClick, handleDashboardClick]);

  if (isLimitedNavPage) {
    return (
      <>
        <Link
          to="/about"
          className={`block px-3 py-3 rounded-md text-[0.82rem] font-medium ${isActive("/about")}`}
          onClick={handleLinkClick}
        >
          {t("nav.about")}
        </Link>
        <a
          href={DOCS_CONFIG.url}
          className="block px-3 py-3 rounded-md text-[0.82rem] font-medium text-[rgba(255,255,255,0.75)] hover:text-emerald-300"
          onClick={handleLinkClick}
        >
          {t("nav.docs")}
        </a>
        <Link
          to="/legal"
          className={`block px-3 py-3 rounded-md text-[0.82rem] font-medium ${isActive("/legal")}`}
          onClick={handleLinkClick}
        >
          {t("nav.legal")}
        </Link>
        <Link
          to="/privacy"
          className={`block px-3 py-3 rounded-md text-[0.82rem] font-medium ${isActive("/privacy")}`}
          onClick={handleLinkClick}
        >
          Privacy
        </Link>
      </>
    );
  }

  return (
    <>
      <Link
        to="/browse"
        className={`block px-3 py-3 rounded-md text-[0.82rem] font-medium ${isActive("/browse")}`}
        onClick={handleLinkClick}
      >
        {t("nav.browse")}
      </Link>
      <Link
        to="/opportunities"
        className={`block px-3 py-3 rounded-md text-[0.82rem] font-medium ${isActive("/opportunities")}`}
        onClick={handleLinkClick}
      >
        {t("nav.opportunities")}
      </Link>
      {isAuthenticated && (
        <>
          <Link
            to="/contributions"
            className={`block px-3 py-3 rounded-md text-[0.82rem] font-medium ${isActive("/contributions")}`}
            onClick={handleLinkClick}
          >
            {t("nav.contributions")}
          </Link>
          <button
            onClick={handleDashboardAndClose}
            className={`block w-full text-left px-3 py-3 rounded-md text-[0.82rem] font-medium ${
              isActive("/give-dashboard") || isActive("/charity-portal")
            }`}
          >
            {t("nav.dashboard")}
          </button>
        </>
      )}
    </>
  );
};

// Mobile menu wrapper to reduce nesting
const MobileMenu: React.FC<{
  isMenuOpen: boolean;
  children: React.ReactNode;
}> = ({ isMenuOpen, children }) => {
  if (!isMenuOpen) return null;

  return (
    <nav className="md:hidden" id="mobile-menu" aria-label="Mobile navigation">
      <div
        className="px-2 pt-2 pb-3 space-y-1 shadow-lg"
        style={{ background: "rgba(6, 78, 59, 0.95)" }}
      >
        {children}
      </div>
    </nav>
  );
};

// Mobile menu button component
const MobileMenuButton: React.FC<{
  isMenuOpen: boolean;
  toggleMenu: () => void;
  menuButtonRef: React.RefObject<HTMLButtonElement>;
}> = ({ isMenuOpen, toggleMenu, menuButtonRef }) => (
  <button
    ref={menuButtonRef}
    type="button"
    className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
    aria-controls="mobile-menu"
    aria-expanded={isMenuOpen}
    aria-label={isMenuOpen ? "Close menu" : "Open menu"}
    onClick={toggleMenu}
  >
    {isMenuOpen ? (
      <X className="block h-6 w-6" aria-hidden="true" />
    ) : (
      <Menu className="block h-6 w-6" aria-hidden="true" />
    )}
  </button>
);

// Nav header component to reduce nesting
const NavHeader: React.FC = () => (
  <Link
    to="/"
    className="flex items-center gap-2.5"
    aria-label="Give Protocol home"
  >
    <Logo className="h-7 w-7" />
    <span
      className="font-inter text-white"
      style={{ fontSize: "1.1rem", letterSpacing: "-0.01em" }}
    >
      Give Protocol
    </span>
  </Link>
);

// Nav actions component
const NavActions: React.FC<{
  isMenuOpen: boolean;
  toggleMenu: () => void;
  menuButtonRef: React.RefObject<HTMLButtonElement>;
  isAuthenticated: boolean;
  isConnected: boolean;
  address: string | null;
  network: NetworkType;
  visibleNetworks: typeof NETWORKS;
  onNetworkChange: (_network: NetworkType) => void;
  onDisconnect: () => void;
  onSignOut: () => void;
}> = ({
  isMenuOpen,
  toggleMenu,
  menuButtonRef,
  isAuthenticated,
  isConnected,
  address,
  network,
  visibleNetworks,
  onNetworkChange,
  onDisconnect,
  onSignOut,
}) => {
  // Determine wallet provider from globalThis.ethereum
  const getWalletProvider = useCallback((): WalletProviderType => {
    const browserGlobal = globalThis as typeof globalThis & Window;
    if (typeof browserGlobal.window === "undefined" || !browserGlobal.ethereum)
      return "metamask";
    if (browserGlobal.ethereum.isMetaMask) return "metamask";
    if (browserGlobal.ethereum.isTalisman) return "talisman";
    if (browserGlobal.ethereum.isSubWallet) return "subwallet";
    return "metamask";
  }, []);

  const handleSwitchAccount = useCallback(() => {
    onDisconnect();
  }, [onDisconnect]);

  return (
    <div className="flex items-center space-x-2">
      <SettingsMenu />
      <ClientOnly>
        {isConnected && address && (
          <>
            <NetworkSelector
              currentNetwork={network}
              onNetworkChange={onNetworkChange}
              networks={visibleNetworks}
              className="hidden sm:block"
            />
            <WalletButton
              address={address}
              provider={getWalletProvider()}
              network={network}
              onDisconnect={onDisconnect}
              onSwitchAccount={handleSwitchAccount}
              onNetworkChange={onNetworkChange}
              isGuest={!isAuthenticated}
            />
          </>
        )}
        {!isConnected && !isAuthenticated && (
          <>
            <ConnectButton />
            <Link
              to="/auth"
              className="hidden sm:inline-flex items-center px-4 py-1.5 rounded-lg text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors duration-200"
            >
              Sign In
            </Link>
          </>
        )}
        {!isConnected && isAuthenticated && (
          <>
            <ConnectButton />
            <button
              onClick={onSignOut}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white/75 hover:text-white hover:bg-white/10 transition-colors duration-200"
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </>
        )}
      </ClientOnly>
      <MobileMenuButton
        isMenuOpen={isMenuOpen}
        toggleMenu={toggleMenu}
        menuButtonRef={menuButtonRef}
      />
    </div>
  );
};

/** Main application navigation bar with responsive desktop/mobile menus, wallet connection, and network selection. */
export const AppNavbar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [network, setNetwork] = useState<NetworkType>("base");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { t } = useTranslation();
  const { userType, logout, user } = useAuth();
  const { isConnected, address, disconnect, chainId, switchChain } = useWeb3();
  const multiChain = useMultiChainContext();

  // EVM chain ID to NetworkType mapping
  const chainIdToNetwork: Record<number, NetworkType> = useMemo(
    () => ({
      8453: "base",
      10: "optimism",
      1284: "moonbeam",
      84532: "base-sepolia",
      11155420: "optimism-sepolia",
      1287: "moonbase",
    }),
    [],
  );

  // Sync network state with chainId from Web3 context (EVM)
  useEffect(() => {
    const networkType = chainIdToNetwork[chainId ?? 0];
    if (networkType) {
      setNetwork(networkType);
    }
  }, [chainId, chainIdToNetwork]);

  // Sync network state when MultiChainContext switches to non-EVM chain
  useEffect(() => {
    if (multiChain.activeChainType === "solana") {
      setNetwork("solana-mainnet");
    } else if (multiChain.activeChainType === "polkadot") {
      const chainName = multiChain.activeAccount?.chainName?.toLowerCase();
      if (chainName === "kusama") {
        setNetwork("kusama");
      } else {
        setNetwork("polkadot");
      }
    }
  }, [multiChain.activeChainType, multiChain.activeAccount?.chainName]);

  // Filter visible networks based on connected wallet's supported chain types
  const visibleNetworks = useMemo(() => {
    const supportedTypes = multiChain.wallet?.supportedChainTypes;
    if (!supportedTypes || supportedTypes.length === 0) {
      // No wallet connected or unknown — show only EVM
      return NETWORKS.filter((n) => n.chainType === "evm");
    }

    // Map wallet ChainType values to NetworkConfig chainType values
    const chainTypeMap: Record<string, string> = {
      evm: "evm",
      solana: "solana",
      polkadot: "polkadot",
    };

    const allowedTypes = new Set(
      supportedTypes.map((ct) => chainTypeMap[ct] || ct),
    );

    return NETWORKS.filter((n) => allowedTypes.has(n.chainType));
  }, [multiChain.wallet?.supportedChainTypes]);

  // EVM NetworkType to chain ID mapping
  const evmChainIds: Partial<Record<NetworkType, number>> = useMemo(
    () => ({
      base: 8453,
      optimism: 10,
      moonbeam: 1284,
      "base-sepolia": 84532,
      "optimism-sepolia": 11155420,
      moonbase: 1287,
    }),
    [],
  );

  const handleNetworkChange = useCallback(
    async (_network: NetworkType) => {
      const networkConfig = NETWORKS.find((n) => n.id === _network);
      if (!networkConfig) {
        setNetwork(_network);
        return;
      }
      const deps = {
        evmChainIds,
        isConnected,
        setNetwork,
        switchChain,
        multiChain,
      };
      if (networkConfig.chainType === "evm") {
        await switchEvmNetwork(_network, deps);
      } else if (networkConfig.chainType === "solana") {
        switchSolanaNetwork(_network, deps);
      } else if (networkConfig.chainType === "polkadot") {
        await switchPolkadotNetwork(_network, deps);
      }
    },
    [isConnected, switchChain, multiChain, evmChainIds],
  );

  const handleDisconnect = useCallback(async () => {
    try {
      // Disconnect wallet first
      await disconnect();

      // If user is logged in, also log them out
      if (user) {
        try {
          await logout();
        } catch (logoutError) {
          // Log but don't block - we still want to redirect
          console.warn("Logout failed during disconnect:", logoutError);
        }
        navigate("/auth");
      }
    } catch (err) {
      console.error("Disconnect failed:", err);
    }
  }, [disconnect, logout, user, navigate]);

  const handleSignOut = useCallback(async () => {
    try {
      await logout();
    } catch (err) {
      console.warn("Logout failed:", err);
    }
    navigate("/auth");
  }, [logout, navigate]);

  // Check if current page should only show limited navigation
  const isLimitedNavPage = useMemo(
    () => ["/about", "/legal", "/privacy"].includes(location.pathname),
    [location.pathname],
  );

  const isActive = useCallback(
    (path: string) =>
      location.pathname === path
        ? "bg-white/15 text-white font-semibold"
        : "text-[rgba(255,255,255,0.75)] hover:text-emerald-300",
    [location.pathname],
  );

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const handleLinkClick = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Focus first menu item when mobile menu opens (WCAG 2.4.3)
  useEffect(() => {
    if (!isMenuOpen) return;
    const mobileMenu = document.getElementById("mobile-menu");
    const firstFocusable = mobileMenu?.querySelector<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    firstFocusable?.focus();
  }, [isMenuOpen]);

  // Close mobile menu on Escape key and return focus to toggle button
  useEffect(() => {
    /** Closes the mobile menu when the Escape key is pressed and returns focus to the menu button. */
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle dashboard navigation based on user type
  const handleDashboardClick = useCallback(() => {
    if (userType === "admin") {
      navigate("/admin");
    } else if (userType === "charity") {
      navigate("/charity-portal");
    } else {
      navigate("/give-dashboard");
    }
  }, [userType, navigate]);

  return (
    <nav
      className="relative z-30 border-b shadow-lg"
      style={{
        background: "rgba(6, 78, 59, 0.92)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderColor: "rgba(52, 211, 153, 0.15)",
      }}
      aria-label="Application navigation"
    >
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-[60px]">
        <div className="flex items-center">
          <NavHeader />
          <div className="hidden md:ml-6 md:flex md:gap-6">
            <DesktopNavLinks
              isLimitedNavPage={isLimitedNavPage}
              isActive={isActive}
              isAuthenticated={Boolean(user)}
              handleDashboardClick={handleDashboardClick}
              t={t}
            />
          </div>
        </div>
        <NavActions
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          menuButtonRef={menuButtonRef}
          isAuthenticated={Boolean(user)}
          isConnected={isConnected}
          address={address}
          network={network}
          visibleNetworks={visibleNetworks}
          onNetworkChange={handleNetworkChange}
          onDisconnect={handleDisconnect}
          onSignOut={handleSignOut}
        />
      </div>

      {/* Mobile menu */}
      <MobileMenu isMenuOpen={isMenuOpen}>
        <MobileNavLinks
          isLimitedNavPage={isLimitedNavPage}
          isActive={isActive}
          isAuthenticated={Boolean(user)}
          handleDashboardClick={handleDashboardClick}
          handleLinkClick={handleLinkClick}
          t={t}
        />
        {Boolean(user) && !isConnected && (
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 w-full px-3 py-3 rounded-md text-[0.82rem] font-medium text-[rgba(255,255,255,0.75)] hover:text-emerald-300"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        )}
      </MobileMenu>
    </nav>
  );
};
