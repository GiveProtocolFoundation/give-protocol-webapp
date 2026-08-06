/**
 * WalletOption - Individual wallet row in the connect wallet modal.
 * Streamlined design: no chain badges, de-prioritized install state.
 */

import React, { useCallback, useMemo } from "react";
import { Loader2, Download, Clock } from "lucide-react";
import type { ChainType, UnifiedWalletProvider } from "@/types/wallet";

/**
 * Wallets with "Coming Soon" support for specific chains.
 * Maps wallet name to chain types not yet fully implemented.
 */
const COMING_SOON_CHAINS: Record<string, ChainType[]> = {
  Ledger: ["solana"],
};

/** Install URLs for supported wallets. */
const WALLET_INSTALL_URLS: Record<string, string> = {
  MetaMask: "https://metamask.io/download/",
  Rabby: "https://rabby.io/",
  Phantom: "https://phantom.app/download",
  "Coinbase Wallet": "https://www.coinbase.com/wallet/downloads",
  Ledger: "https://www.ledger.com/start",
};

interface WalletOptionProps {
  wallet: UnifiedWalletProvider;
  selectedChainType: ChainType;
  isConnecting: boolean;
  connectingWallet: string | null;
  onSelect: (_wallet: UnifiedWalletProvider) => void;
}

/**
 * Displays a single wallet row with icon, name, and status indicator.
 * Installed wallets are the primary click target; uninstalled wallets
 * show a subtle "Not installed" label with an optional download icon.
 * @param wallet - Wallet provider to display
 * @param selectedChainType - Currently selected chain filter
 * @param isConnecting - Whether any connection is in progress
 * @param connectingWallet - Name of wallet currently connecting
 * @param onSelect - Callback when wallet is selected
 */
export const WalletOption: React.FC<WalletOptionProps> = ({
  wallet,
  selectedChainType,
  isConnecting,
  connectingWallet,
  onSelect,
}) => {
  const isThisConnecting = connectingWallet === wallet.name;
  const isInstalled = wallet.isInstalled();
  const installUrl = WALLET_INSTALL_URLS[wallet.name];

  const isComingSoon = useMemo(() => {
    const comingSoonChains = COMING_SOON_CHAINS[wallet.name];
    return comingSoonChains?.includes(selectedChainType) ?? false;
  }, [wallet.name, selectedChainType]);

  const isDisabled = (isConnecting && !isThisConnecting) || isComingSoon;

  const handleClick = useCallback(() => {
    if (isInstalled && !isDisabled && !isThisConnecting) {
      onSelect(wallet);
    }
  }, [wallet, onSelect, isDisabled, isThisConnecting, isInstalled]);

  const handleInstallClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (installUrl) {
      window.open(installUrl, "_blank", "noopener,noreferrer");
    }
  }, [installUrl]);

  const handleIconError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = "/icons/wallet.svg";
  }, []);

  return (
    <button
      onClick={isInstalled ? handleClick : handleInstallClick}
      disabled={isDisabled}
      className={`
        flex items-center w-full px-4 py-3 text-left rounded-lg transition-all duration-150
        border border-transparent
        ${isDisabled ? "opacity-50 cursor-not-allowed" : ""}
        ${!isInstalled && !isDisabled ? "opacity-60" : ""}
        ${!isDisabled && isInstalled ? "hover:bg-gray-50 dark:hover:bg-white/5 hover:border-gray-200 dark:hover:border-white/10 cursor-pointer" : ""}
        ${!isDisabled && !isInstalled ? "hover:bg-gray-50/50 dark:hover:bg-white/[0.03] cursor-pointer" : ""}
        ${isThisConnecting ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700/40" : ""}
      `}
      role="menuitem"
    >
      {/* Wallet Icon — fixed 40px */}
      <img
        src={`/icons/${wallet.icon}.svg`}
        alt=""
        className={`w-10 h-10 shrink-0 object-contain mr-3 ${!isInstalled || isComingSoon ? "grayscale" : ""}`}
        aria-hidden="true"
        onError={handleIconError}
      />

      {/* Wallet Name */}
      <span className={`flex-1 min-w-0 font-medium truncate ${isInstalled ? "text-gray-900 dark:text-white" : "text-gray-400 dark:text-gray-500"}`}>
        {wallet.name}
      </span>

      {/* Status indicator */}
      {isThisConnecting && (
        <Loader2 className="w-4 h-4 text-emerald-600 animate-spin shrink-0 ml-2" />
      )}
      {isComingSoon && !isThisConnecting && (
        <span className="inline-flex items-center gap-1 text-xs text-amber-500 dark:text-amber-400 shrink-0 ml-2">
          <Clock className="w-3 h-3" />
          Soon
        </span>
      )}
      {!isInstalled && !isComingSoon && !isThisConnecting && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
          {installUrl ? (
            <>
              <Download className="w-3 h-3" />
              Install
            </>
          ) : (
            "Not installed"
          )}
        </span>
      )}
    </button>
  );
};

export default WalletOption;
