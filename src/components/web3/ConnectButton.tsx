import React, { useState, useEffect, useCallback } from "react";
import {
  Wallet,
  ChevronDown,
  LogOut,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  User,
  Copy,
  Check,
} from "lucide-react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useUnifiedWallets } from "@/hooks/useWallet";
import { useMultiChainContext } from "@/contexts/MultiChainContext";
import { Button } from "../ui/Button";
import { WalletModal } from "./WalletModal/WalletModal";
import { ChainTypeBadge } from "./AccountBadge";
import { shortenAddress } from "@/utils/web3";
import { Logger } from "@/utils/logger";
import { CHAIN_IDS, CHAIN_CONFIGS, type ChainId } from "@/config/contracts";
import { getEVMChainConfig, type EVMChainId } from "@/config/chains";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import type {
  ChainType,
  UnifiedWalletProvider,
  UnifiedAccount,
} from "@/types/wallet";

/**
 * Account dropdown menu for connected wallet
 */
interface AccountDropdownProps {
  account: UnifiedAccount;
  wallet: UnifiedWalletProvider | null;
  alias: string | null;
  onDisconnect: () => void;
  onManageAlias: () => void;
}

/** Dropdown menu showing connected account details, address copy, explorer link, alias management, and disconnect. */
const AccountDropdown: React.FC<AccountDropdownProps> = ({
  account,
  wallet,
  alias,
  onDisconnect,
  onManageAlias,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyAddress = useCallback(() => {
    navigator.clipboard.writeText(account.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [account.address]);

  const getExplorerUrl = useCallback(() => {
    if (account.chainType === "evm" && typeof account.chainId === "number") {
      const config = getEVMChainConfig(account.chainId as EVMChainId);
      if (config) {
        return `${config.blockExplorerUrls[0]}/address/${account.address}`;
      }
    }
    return "#";
  }, [account]);

  return (
    <div className="absolute right-0 mt-2 w-80 rounded-xl shadow-lg bg-white ring-1 ring-gray-200 divide-y divide-gray-100 z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-sm text-gray-500">
          Connected via {wallet?.name || "Wallet"}
        </span>
        <ChainTypeBadge chainType={account.chainType} size="sm" />
      </div>
      <div className="flex items-center justify-between px-4 pb-4">
        <div className="flex flex-col">
          {alias && (
            <span className="text-sm font-medium text-gray-900">{alias}</span>
          )}
          <span className="font-mono text-sm text-gray-600">
            {shortenAddress(account.address)}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopyAddress}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            aria-label="Copy address"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
          <a
            href={getExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            aria-label="View in explorer"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Chain Info */}
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Network</span>
          <span className="text-sm font-medium text-gray-900">
            {account.chainName}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="p-2">
        <button
          onClick={onManageAlias}
          className="flex w-full items-center px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-lg"
          role="menuitem"
        >
          <User className="h-4 w-4 mr-3 text-gray-400" />
          {alias ? "Change Wallet Alias" : "Set Wallet Alias"}
        </button>
        <button
          onClick={onDisconnect}
          className="flex w-full items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-lg"
          role="menuitem"
        >
          <LogOut className="h-4 w-4 mr-3" />
          Disconnect
        </button>
      </div>
    </div>
  );
};

/**
 * Reports whether the given chain ID is in the application's supported chain list.
 * Currently unused, but retained for upcoming UI gating around unsupported networks.
 * @param chainId - The numeric or hex chain ID to check.
 * @returns `true` if the chain ID maps to a value in {@link CHAIN_IDS}.
 */
function _isSupportedChainId(chainId: number | string): boolean {
  return Object.values(CHAIN_IDS).includes(Number(chainId));
}

/**
 * Primary wallet connection component for the application
 * @function ConnectButton
 * @description Comprehensive Web3 wallet connection button that handles wallet selection, connection states,
 * network switching, error handling, and account management. Supports multiple wallet providers across
 * EVM, Solana, and Polkadot chains.
 * @returns {React.ReactElement} Dynamic button component that shows different states:
 *   - Connect button when no wallet is connected
 *   - Account dropdown with address/alias when connected
 *   - Error state with retry functionality when connection fails
 *   - Loading state during connection attempts
 * @example
 * ```tsx
 * // Basic usage in navigation
 * <ConnectButton />
 *
 * // The button automatically handles all wallet states:
 * // - Shows "Connect" when disconnected
 * // - Shows wallet address or alias when connected
 * // - Provides dropdown menu with account actions
 * // - Handles network switching and error recovery
 * ```
 */
export function ConnectButton() {
  // Multi-chain context for unified wallet management
  const multiChain = useMultiChainContext();

  // Legacy Web3 context for backward compatibility
  const web3 = useWeb3();

  // Get unified wallet providers
  const { wallets: unifiedWallets } = useUnifiedWallets();

  const { logout, user } = useAuth();
  const { alias } = useWalletAlias();
  const navigate = useNavigate();

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Determine connection state from either context
  const isConnected = multiChain.isConnected || web3.isConnected;
  const isConnecting = multiChain.isConnecting || web3.isConnecting;
  const activeAccount = multiChain.activeAccount;
  const address = activeAccount?.address || web3.address;
  const error = multiChain.error || web3.error;

  // Close dropdown when clicking outside
  useEffect(() => {
    /** Closes the account dropdown when clicking outside its container. */
    const handleClickOutside = (event: MouseEvent) => {
      if (showAccountMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest(".wallet-dropdown")) {
          setShowAccountMenu(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showAccountMenu]);

  // Handle opening wallet modal
  const handleOpenModal = useCallback(() => {
    setConnectionError(null);
    setShowWalletModal(true);
  }, []);

  // Handle closing wallet modal
  const handleCloseModal = useCallback(() => {
    setShowWalletModal(false);
  }, []);

  // Handle wallet connection from modal
  const handleConnect = useCallback(
    async (wallet: UnifiedWalletProvider, chainType: ChainType) => {
      try {
        setConnectionError(null);
        await multiChain.connect(wallet, chainType);
        setShowWalletModal(false);

        Logger.info("Wallet connected via modal", {
          wallet: wallet.name,
          chainType,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to connect wallet";
        setConnectionError(message);
        Logger.error("Wallet connection failed", {
          wallet: wallet.name,
          chainType,
          error: err,
        });
        throw err;
      }
    },
    [multiChain],
  );

  // Handle disconnect
  const handleDisconnect = useCallback(async () => {
    try {
      // Disconnect from both contexts
      await multiChain.disconnect();
      await web3.disconnect();

      setShowAccountMenu(false);
      setConnectionError(null);

      // Only try to logout if user is actually logged in
      if (user) {
        try {
          await logout();
        } catch (logoutError) {
          Logger.warn("Logout failed during wallet disconnect", {
            error: logoutError,
          });
        }
        navigate("/auth");
      }
    } catch (err) {
      Logger.error("Wallet disconnection failed", { error: err });
      setShowAccountMenu(false);
      setConnectionError(null);
    }
  }, [multiChain, web3, logout, user, navigate]);

  // Handle manage alias
  const handleManageAlias = useCallback(() => {
    setShowAccountMenu(false);
    navigate("/give-dashboard", { state: { showWalletSettings: true } });
  }, [navigate]);

  // Handle toggle account menu
  const handleToggleAccountMenu = useCallback(() => {
    setShowAccountMenu((prev) => !prev);
  }, []);

  // Connected state — check before error so disconnect is always accessible
  if (isConnected && address) {
    // Create a fallback account if multichain context doesn't have one
    const displayAccount: UnifiedAccount = activeAccount || {
      id: `legacy-evm-${address}`,
      address,
      chainType: "evm" as const,
      chainId: web3.chainId || CHAIN_IDS.BASE,
      chainName: CHAIN_CONFIGS[web3.chainId as ChainId]?.name || "Unknown",
      source: "Legacy",
    };

    return (
      <div className="relative wallet-dropdown">
        <button
          type="button"
          onClick={handleToggleAccountMenu}
          className="flex items-center bg-white/10 hover:bg-white/15 text-white border border-emerald-500/30 hover:border-emerald-400/50 rounded-lg px-4 py-2 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-200"
          aria-expanded={showAccountMenu}
          aria-haspopup="true"
        >
          <Wallet className="h-4 w-4 mr-2 text-emerald-400" />
          <span className="mr-1">{alias || shortenAddress(address)}</span>
          <ChevronDown className="h-4 w-4 text-white/60" />
        </button>

        {showAccountMenu && (
          <AccountDropdown
            account={displayAccount}
            wallet={multiChain.wallet}
            alias={alias}
            onDisconnect={handleDisconnect}
            onManageAlias={handleManageAlias}
          />
        )}
      </div>
    );
  }

  // Error state (only shown when not connected)
  if (connectionError || error) {
    return (
      <button
        type="button"
        onClick={handleOpenModal}
        className="flex items-center text-red-300 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200"
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        <span className="hidden sm:inline max-w-32 truncate">
          {connectionError || error?.message || "Connection Error"}
        </span>
        <span className="sm:hidden">Error</span>
      </button>
    );
  }

  // Disconnected state
  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant="primary"
        size="sm"
        disabled={isConnecting}
        className="flex items-center shadow-sm hover:shadow-md rounded-lg px-4 py-2 transition-all duration-200"
      >
        <Wallet className="h-4 w-4 mr-2" />
        <span>{isConnecting ? "Connecting..." : "Connect"}</span>
        {isConnecting && <RefreshCw className="h-4 w-4 ml-2 animate-spin" />}
      </Button>

      <WalletModal
        isOpen={showWalletModal}
        onClose={handleCloseModal}
        wallets={unifiedWallets}
        onConnect={handleConnect}
        initialChainType="evm"
      />
    </>
  );
}
