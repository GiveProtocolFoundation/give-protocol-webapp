/**
 * useMultiChain Hook
 * Provides convenient access to multi-chain wallet functionality
 */

import { useCallback, useMemo } from "react";
import {
  useMultiChainContext,
  useMultiChainEVM,
  useMultiChainSigner,
} from "@/contexts/MultiChainContext";
import type {
  ChainType,
  UnifiedAccount,
  UnifiedWalletProvider,
} from "@/types/wallet";
import {
  getEVMChainConfig,
  getSolanaClusterConfig,
} from "@/config/chains";

/**
 * Multi-chain wallet hook
 * Provides unified access to wallet state and operations across all supported chains
 * @returns Multi-chain wallet state and operations
 */
export function useMultiChain() {
  const context = useMultiChainContext();
  const signer = useMultiChainSigner();

  /**
   * Get accounts filtered by chain type
   * @param chainType - Chain type to filter by
   * @returns Array of accounts for the chain type
   */
  const getAccountsByChainType = useCallback(
    (chainType: ChainType): UnifiedAccount[] => {
      return context.accounts.filter((a) => a.chainType === chainType);
    },
    [context.accounts]
  );

  /**
   * Check if wallet supports a specific chain type
   * @param chainType - Chain type to check
   * @returns True if wallet supports the chain type
   */
  const supportsChainType = useCallback(
    (chainType: ChainType): boolean => {
      return context.wallet?.supportedChainTypes.includes(chainType) ?? false;
    },
    [context.wallet]
  );

  /**
   * Get chain config for the active account
   * @returns Chain config or null
   */
  const activeChainConfig = useMemo(() => {
    if (!context.activeAccount) return null;

    const { chainType, chainId } = context.activeAccount;

    switch (chainType) {
      case "evm":
        return getEVMChainConfig(chainId as number);
      case "solana":
        return getSolanaClusterConfig(chainId as string);
      default:
        return null;
    }
  }, [context.activeAccount]);

  /**
   * Get explorer URL for an address or transaction
   * @param type - Type of entity ("address" or "tx")
   * @param value - Address or transaction hash
   * @returns Explorer URL
   */
  const getExplorerUrl = useCallback(
    (type: "address" | "tx", value: string): string => {
      if (!context.activeAccount || !activeChainConfig) return "#";

      const { chainType } = context.activeAccount;

      switch (chainType) {
        case "evm": {
          const config = activeChainConfig as { blockExplorerUrls?: string[] };
          const baseUrl = config.blockExplorerUrls?.[0] ?? "";
          return `${baseUrl}/${type}/${value}`;
        }
        case "solana": {
          const config = activeChainConfig as {
            explorerUrl?: string;
            id?: string;
          };
          const baseUrl = "https://explorer.solana.com";
          const cluster = config.id === "mainnet-beta" ? "" : `?cluster=${config.id}`;
          return `${baseUrl}/${type}/${value}${cluster}`;
        }
        default:
          return "#";
      }
    },
    [context.activeAccount, activeChainConfig]
  );

  /**
   * Connect to a wallet, optionally switching chain type
   * @param wallet - Wallet provider to connect
   * @param chainType - Chain type to connect to
   */
  const connect = useCallback(
    async (wallet: UnifiedWalletProvider, chainType?: ChainType) => {
      await context.connect(wallet, chainType);
    },
    [context]
  );

  return {
    // State
    wallet: context.wallet,
    accounts: context.accounts,
    activeAccount: context.activeAccount,
    activeChainType: context.activeChainType,
    activeChainConfig,
    isConnected: context.isConnected,
    isConnecting: context.isConnecting,
    error: context.error,

    // Actions
    connect,
    disconnect: context.disconnect,
    switchAccount: context.switchAccount,
    switchChainType: context.switchChainType,
    switchChain: context.switchChain,
    clearError: context.clearError,

    // Signing
    signTransaction: signer.signTransaction,
    signMessage: signer.signMessage,

    // Utilities
    getAccountsByChainType,
    supportsChainType,
    getExplorerUrl,
  };
}

/**
 * Legacy EVM-only hook for backward compatibility
 * Wraps useMultiChainEVM with the same interface as the old useWeb3
 * @returns EVM wallet state compatible with existing code
 */
export function useMultiChainLegacyEVM() {
  return useMultiChainEVM();
}

export { useMultiChainEVM, useMultiChainSigner } from "@/contexts/MultiChainContext";
