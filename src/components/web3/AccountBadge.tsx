/**
 * AccountBadge - Chain-type account badge component
 * Displays account address with chain type indicator
 */

import React, { useCallback, useRef, useState } from "react";
import { Copy, ExternalLink, Check } from "lucide-react";
import type { ChainType, UnifiedAccount } from "@/types/wallet";
import { shortenAddress } from "@/utils/web3";

/**
 * Chain type colors and icons
 */
const CHAIN_STYLES: Record<
  ChainType,
  { bgColor: string; textColor: string; borderColor: string; icon: string }
> = {
  evm: {
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
    icon: "/chains/ethereum.svg",
  },
  solana: {
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    icon: "/chains/solana.svg",
  },
};

interface AccountBadgeProps {
  account: UnifiedAccount;
  isActive?: boolean;
  showChainIcon?: boolean;
  showCopyButton?: boolean;
  showExplorerLink?: boolean;
  explorerUrl?: string;
  onSelect?: (_account: UnifiedAccount) => void;
  className?: string;
}

/**
 * AccountBadge Component
 * Displays an account with chain-type styling and optional actions
 * @param account - Account to display
 * @param isActive - Whether this is the active account
 * @param showChainIcon - Show chain icon
 * @param showCopyButton - Show copy address button
 * @param showExplorerLink - Show explorer link
 * @param explorerUrl - URL for block explorer
 * @param onSelect - Callback when account is clicked
 * @param className - Additional CSS classes
 */
export const AccountBadge: React.FC<AccountBadgeProps> = ({
  account,
  isActive = false,
  showChainIcon = true,
  showCopyButton = false,
  showExplorerLink = false,
  explorerUrl,
  onSelect,
  className = "",
}) => {
  const [copied, setCopied] = React.useState(false);
  const [iconHidden, setIconHidden] = useState(false);
  const iconRef = useRef<HTMLImageElement>(null);
  const styles = CHAIN_STYLES[account.chainType];

  // Attach error listener imperatively to avoid onError on non-interactive element (JS-0760)
  React.useEffect(() => {
    const img = iconRef.current;
    if (!img) return undefined;
    /** Hide icon on load error */
    const handler = () => setIconHidden(true);
    img.addEventListener("error", handler);
    return () => img.removeEventListener("error", handler);
  }, []);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    },
    [account.address]
  );

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(account);
    }
  }, [account, onSelect]);

  const handleExplorerClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    // Link handles navigation
  }, []);

  const sharedClassName = `
    inline-flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors
    ${styles.bgColor} ${styles.borderColor}
    ${onSelect ? "cursor-pointer hover:opacity-80" : ""}
    ${isActive ? "ring-2 ring-emerald-500 ring-offset-1" : ""}
    ${className}
  `;

  const content = (
    <>
      {/* Chain Icon */}
      {showChainIcon && !iconHidden && (
        <img
          ref={iconRef}
          src={styles.icon}
          alt={account.chainType}
          className="w-5 h-5"
        />
      )}

      {/* Account Info */}
      <div className="flex flex-col min-w-0">
        {account.name && (
          <span className={`text-xs font-medium ${styles.textColor} truncate`}>
            {account.name}
          </span>
        )}
        <span className="text-sm font-mono text-gray-700 truncate">
          {shortenAddress(account.address)}
        </span>
      </div>

      {/* Chain Name Badge */}
      <span
        className={`text-xs font-medium px-1.5 py-0.5 rounded ${styles.bgColor} ${styles.textColor}`}
      >
        {account.chainName}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-1 ml-auto">
        {showCopyButton && (
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Copy address"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        )}

        {showExplorerLink && explorerUrl && (
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleExplorerClick}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="View in explorer"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </>
  );

  if (onSelect) {
    return (
      <button type="button" onClick={handleClick} className={sharedClassName}>
        {content}
      </button>
    );
  }

  return (
    <div className={sharedClassName}>
      {content}
    </div>
  );
};

/**
 * Compact account badge for inline display
 */
interface CompactAccountBadgeProps {
  account: UnifiedAccount;
  className?: string;
}

/**
 * Compact account badge showing shortened address with chain color
 * @param account - Account to display
 * @param className - Additional CSS classes
 */
export const CompactAccountBadge: React.FC<CompactAccountBadgeProps> = ({
  account,
  className = "",
}) => {
  const styles = CHAIN_STYLES[account.chainType];

  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded text-sm
        ${styles.bgColor} ${styles.textColor}
        ${className}
      `}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {shortenAddress(account.address, 4)}
    </span>
  );
};

/**
 * Chain type indicator (no account)
 */
interface ChainTypeBadgeProps {
  chainType: ChainType;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Chain type badge showing the chain name in uppercase with styled colors
 * @param chainType - Chain type to display (evm, solana)
 * @param size - Badge size variant
 * @param className - Additional CSS classes
 */
export const ChainTypeBadge: React.FC<ChainTypeBadgeProps> = ({
  chainType,
  size = "md",
  className = "",
}) => {
  const styles = CHAIN_STYLES[chainType];
  const sizeClasses = size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1";

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded font-medium
        ${styles.bgColor} ${styles.textColor}
        ${sizeClasses}
        ${className}
      `}
    >
      {chainType.toUpperCase()}
    </span>
  );
};

export default AccountBadge;
