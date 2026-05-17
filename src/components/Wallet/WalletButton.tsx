import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { WalletButtonProps, WalletBalances } from "./types";
import { WalletDropdown } from "./WalletDropdown";
import { formatAddress, getAddressGradient, copyToClipboard } from "./utils";
import { useWalletBalance } from "@/hooks/useWalletBalance";

interface WalletAvatarProps {
  address: string;
  size?: number;
}

/**
 * Renders a wallet avatar with a gradient background derived from the address.
 *
 * @param address - The wallet address string.
 * @param size - The pixel size of the avatar (width & height). Defaults to 32.
 * @returns A JSX element representing the wallet avatar.
 */
const WalletAvatar: React.FC<WalletAvatarProps> = ({ address, size = 32 }) => {
  const gradient = getAddressGradient(address);

  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: gradient,
      }}
      aria-hidden="true"
    />
  );
};

interface ConnectionStatusProps {
  isConnected: boolean;
}

/**
 * Renders a pulsing green dot indicator when connected.
 *
 * @param isConnected - Indicates if the connection is active.
 * @returns A JSX element when connected, otherwise null.
 */
const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ isConnected }) => {
  if (!isConnected) return null;

  return (
    <div className="absolute bottom-0 right-0 transform translate-x-0.5 translate-y-0.5">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white" />
      </span>
    </div>
  );
};

interface TxBadgeProps {
  count: number;
}

/**
 * Renders a badge displaying the number of pending transactions.
 *
 * @param count - The number of pending transactions.
 * @returns A JSX element when count > 0, otherwise null.
 */
const TxBadge: React.FC<TxBadgeProps> = ({ count }) => {
  if (count <= 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full animate-bounce">
      {count > 9 ? "9+" : count}
    </span>
  );
};

/**
 * WalletButton component - Main wallet connection button for Give Protocol
 *
 * Features:
 * - Gradient avatar based on address
 * - Truncated address display
 * - Active connection status indicator
 * - Dropdown with wallet info, balances, and actions
 * - Pending transaction badge
 * - Keyboard and accessibility support
 *
 * @param props - WalletButtonProps
 * @returns Wallet button JSX element
 */
export const WalletButton: React.FC<WalletButtonProps> = ({
  address,
  provider,
  network,
  onDisconnect,
  onSwitchAccount,
  onNetworkChange: _onNetworkChange,
  pendingTxCount = 0,
  balances: externalBalances,
  className = "",
  hasMultipleAccounts = false,
  showSettings = true,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const wasDropdownOpenRef = useRef(false);
  const navigate = useNavigate();

  // Fetch real wallet balance using hook
  const {
    native: fetchedNative,
    usdValue: fetchedUsdValue,
    isLoading: balanceLoading,
  } = useWalletBalance(network);

  // Combine external balances with fetched balances
  const balances: WalletBalances = useMemo(() => {
    // If external balances provided, use those
    if (externalBalances) {
      return externalBalances;
    }

    // Otherwise use fetched balances
    return {
      native: fetchedNative,
      usdValue: fetchedUsdValue,
      isLoading: balanceLoading,
    };
  }, [externalBalances, fetchedNative, fetchedUsdValue, balanceLoading]);

  // Close dropdown when clicking outside
  // Must check both the button container and portal-rendered dropdown
  useEffect(() => {
    /**
     * Handles clicks outside the dropdown container and portal menu, closing the dropdown if a click occurs outside.
     *
     * @param event - The mouse event triggered by a click.
     * @returns void
     */
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const isInsideContainer = containerRef.current?.contains(target);
      const isInsidePortalMenu = target.closest("[data-wallet-menu]");

      if (!isInsideContainer && !isInsidePortalMenu) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    /**
     * Handles key down events to close the dropdown when Escape is pressed.
     *
     * @param event The keyboard event triggered on key down.
     * @returns void
     */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isDropdownOpen) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDropdownOpen]);

  // Manage focus when dropdown opens/closes (WCAG 2.4.3)
  useEffect(() => {
    if (isDropdownOpen) {
      // Focus first focusable item in the portal-rendered dropdown
      const menu = document.querySelector<HTMLElement>("[data-wallet-menu]");
      const firstFocusable = menu?.querySelector<HTMLElement>(
        "button:not([disabled])",
      );
      firstFocusable?.focus();
    } else if (wasDropdownOpenRef.current) {
      // Return focus to trigger button when dropdown closes
      buttonRef.current?.focus();
    }
    wasDropdownOpenRef.current = isDropdownOpen;
  }, [isDropdownOpen]);

  const handleToggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const handleCopyAddress = useCallback(async () => {
    const success = await copyToClipboard(address);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [address]);

  const handleDisconnect = useCallback(() => {
    setIsDropdownOpen(false);
    onDisconnect();
  }, [onDisconnect]);

  const handleSwitchAccount = useCallback(() => {
    setIsDropdownOpen(false);
    onSwitchAccount();
  }, [onSwitchAccount]);

  const handleSettings = useCallback(() => {
    setIsDropdownOpen(false);
    navigate("/give-dashboard", { state: { showWalletSettings: true } });
  }, [navigate]);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main Wallet Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggleDropdown}
        className={`
          relative flex items-center gap-3 px-3 py-2
          bg-white hover:bg-gray-50
          border border-gray-200
          rounded-xl shadow-sm
          transition-all duration-200
          hover:shadow-md
          ${isDropdownOpen ? "ring-2 ring-emerald-500 ring-offset-1" : ""}
        `}
        aria-expanded={isDropdownOpen}
        aria-haspopup="true"
        aria-label="Wallet menu"
      >
        {/* Avatar with connection status */}
        <div className="relative">
          <WalletAvatar address={address} size={32} />
          <ConnectionStatus isConnected={Boolean(address)} />
        </div>

        {/* Wallet Info */}
        <div className="hidden sm:flex flex-col items-start">
          <span className="text-xs text-gray-500 font-medium">Main Wallet</span>
          <span className="text-sm font-mono text-gray-900">
            {formatAddress(address, "short")}
          </span>
        </div>

        {/* Mobile: Just show short address */}
        <span className="sm:hidden text-sm font-mono text-gray-900">
          {formatAddress(address, "short")}
        </span>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isDropdownOpen ? "rotate-180" : ""
          }`}
        />

        {/* Pending Transaction Badge */}
        <TxBadge count={pendingTxCount} />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <WalletDropdown
          address={address}
          provider={provider}
          network={network}
          balances={balances}
          copied={copied}
          onCopy={handleCopyAddress}
          onDisconnect={handleDisconnect}
          onSwitchAccount={handleSwitchAccount}
          onSettings={handleSettings}
          hasMultipleAccounts={hasMultipleAccounts}
          showSettings={showSettings}
          anchorRef={buttonRef}
        />
      )}
    </div>
  );
};

export default WalletButton;
