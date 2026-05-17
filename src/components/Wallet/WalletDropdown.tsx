import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  Copy,
  Check,
  ExternalLink,
  Settings,
  Users,
  LogOut,
  Wallet,
} from "lucide-react";
import { Portal } from "@/components/ui/Portal";
import type { WalletDropdownProps } from "./types";
import {
  formatAddress,
  getAddressGradient,
  getExplorerUrl,
  formatBalance,
  formatUsdValue,
  PROVIDER_NAMES,
  NETWORK_TOKENS,
} from "./utils";

/**
 * Wallet avatar component with gradient background
 */
interface WalletAvatarInternalProps {
  address: string;
  size?: number;
}

/** Renders a circular avatar with a deterministic gradient derived from the wallet address. */
const WalletAvatar: React.FC<WalletAvatarInternalProps> = ({
  address,
  size = 40,
}) => {
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

/**
 * Section divider component
 */
const Divider: React.FC = () => (
  <hr className="h-px bg-gray-200 dark:bg-gray-700 my-2 border-0" />
);

/**
 * Dropdown menu item button
 */
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
}

/** Dropdown menu item button with icon, label, and optional danger variant. */
const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onClick,
  variant = "default",
  disabled = false,
}) => {
  const baseClasses =
    "w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors";
  const variantClasses =
    variant === "danger"
      ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
      : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700";
  const disabledClasses = disabled ? "opacity-50 cursor-not-allowed" : "";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses} ${disabledClasses}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

/**
 * WalletDropdown component - Displays wallet info and actions in a dropdown menu
 * Uses Portal to render outside parent overflow constraints
 * @param props - WalletDropdownProps
 * @returns Dropdown menu JSX element
 */
export const WalletDropdown: React.FC<WalletDropdownProps> = ({
  address,
  provider,
  network,
  balances,
  copied,
  onCopy,
  onDisconnect,
  onSwitchAccount,
  onSettings,
  hasMultipleAccounts = false,
  showSettings = true,
  anchorRef,
}) => {
  const tokenSymbol = NETWORK_TOKENS[network] || "DEV";
  const providerName = PROVIDER_NAMES[provider] || provider;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  // Calculate position based on anchor element
  useEffect(() => {
    /** Recalculates dropdown position based on the anchor element's bounding rect. */
    const updatePosition = () => {
      if (anchorRef?.current) {
        const rect = anchorRef.current.getBoundingClientRect();
        setPosition({
          top: rect.bottom + 8, // 8px gap below button
          right: window.innerWidth - rect.right,
        });
      }
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  const handleViewOnExplorer = useCallback(() => {
    const url = getExplorerUrl(network, address);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [network, address]);

  const dropdownContent = (
    <div
      ref={dropdownRef}
      data-wallet-menu
      className="w-80 bg-white dark:bg-[#0E1514] rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
      style={
        anchorRef
          ? {
              position: "fixed",
              top: position.top,
              right: position.right,
            }
          : {
              position: "absolute",
              right: 0,
              top: "100%",
              marginTop: 8,
            }
      }
      role="menu"
      aria-orientation="vertical"
      aria-label="Wallet menu"
    >
      {/* Account Info Section */}
      <div className="p-4 bg-gradient-to-r from-emerald-50 to-emerald-50 dark:from-emerald-900/20 dark:to-emerald-900/20 flex items-center gap-3">
        <WalletAvatar address={address} size={48} />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
            {providerName}
          </p>
          <p
            className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate"
            title={address}
          >
            {formatAddress(address, "medium")}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-3 flex gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          aria-label={copied ? "Address copied" : "Copy address"}
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span className="text-emerald-600 dark:text-emerald-400">
                Copied!
              </span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              <span>Copy</span>
            </>
          )}
        </button>
        <button
          type="button"
          onClick={handleViewOnExplorer}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          aria-label="View on block explorer"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Explorer</span>
        </button>
      </div>

      <Divider />

      {/* Balance Display */}
      <div className="px-4 py-3">
        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-2">
          Balances
        </p>
        {balances.isLoading ? (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-emerald-500 rounded-full animate-spin" />
            <span className="text-sm">Loading...</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {tokenSymbol}
                </span>
              </div>
              <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                {formatBalance(balances.native)}
              </span>
            </div>
            {network === "moonbeam" && balances.glmr !== undefined && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    GLMR
                  </span>
                </div>
                <span className="text-sm font-mono text-gray-900 dark:text-gray-100">
                  {formatBalance(balances.glmr)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Total Value
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {formatUsdValue(balances.usdValue)}
              </span>
            </div>
          </div>
        )}
      </div>

      <Divider />

      {/* Wallet Management Section */}
      <div className="p-2">
        {showSettings && (
          <MenuItem
            icon={<Settings className="h-4 w-4" />}
            label="Account Settings"
            onClick={onSettings}
          />
        )}
        {hasMultipleAccounts && (
          <MenuItem
            icon={<Users className="h-4 w-4" />}
            label="Switch Account"
            onClick={onSwitchAccount}
          />
        )}
        <MenuItem
          icon={<LogOut className="h-4 w-4" />}
          label="Disconnect"
          onClick={onDisconnect}
          variant="danger"
        />
      </div>
    </div>
  );

  // Use Portal when anchorRef is provided to escape parent overflow constraints
  if (anchorRef) {
    return <Portal>{dropdownContent}</Portal>;
  }

  return dropdownContent;
};

export default WalletDropdown;
