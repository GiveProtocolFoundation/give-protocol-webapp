/**
 * Hook for fetching wallet balance and USD value
 * Provides real-time balance data for the wallet dropdown display
 * Uses Chainlink price feeds for decentralized, rate-limit-free pricing
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { Logger } from "@/utils/logger";
import { chainlinkPriceFeedService } from "@/services/chainlinkPriceFeed";
import { CHAIN_IDS } from "@/config/contracts";
import type { NetworkType } from "@/components/Wallet/types";

interface WalletBalanceResult {
  /** Native token balance formatted as string */
  native: string | undefined;
  /** Native token symbol */
  nativeSymbol: string;
  /** USD value of native balance */
  usdValue: string | undefined;
  /** Whether balances are currently loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: Error | null;
  /** Function to manually refetch balances */
  refetch: () => Promise<void>;
}

/**
 * Network configuration for balance fetching
 */
const NETWORK_CONFIG: Record<
  NetworkType,
  { symbol: string; chainId: number; decimals: number }
> = {
  base: { symbol: "ETH", chainId: CHAIN_IDS.BASE, decimals: 18 },
  optimism: { symbol: "ETH", chainId: CHAIN_IDS.OPTIMISM, decimals: 18 },
  moonbeam: { symbol: "GLMR", chainId: CHAIN_IDS.MOONBEAM, decimals: 18 },
  "base-sepolia": {
    symbol: "ETH",
    chainId: CHAIN_IDS.BASE_SEPOLIA,
    decimals: 18,
  },
  "optimism-sepolia": {
    symbol: "ETH",
    chainId: CHAIN_IDS.OPTIMISM_SEPOLIA,
    decimals: 18,
  },
  moonbase: { symbol: "DEV", chainId: CHAIN_IDS.MOONBASE, decimals: 18 },
};

/** Cache for token prices */
const priceCache: Record<string, { price: number; timestamp: number }> = {};
const PRICE_CACHE_TTL = 60000; // 60 second cache

/**
 * Fetch token price from Chainlink (primary) or cache
 * @param symbol - Token symbol (e.g., "ETH", "GLMR")
 * @param chainId - Chain ID for the price feed
 * @returns USD price or null if fetch fails
 */
async function fetchTokenPrice(
  symbol: string,
  chainId: number,
): Promise<number | null> {
  const cacheKey = `${chainId}_${symbol}`;

  // Check cache first
  const cached = priceCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
    return cached.price;
  }

  try {
    const priceData = await chainlinkPriceFeedService.getPrice(chainId, symbol);

    if (priceData?.price) {
      // Cache the price
      priceCache[cacheKey] = { price: priceData.price, timestamp: Date.now() };
      return priceData.price;
    }

    return null;
  } catch (error) {
    Logger.warn("Failed to fetch token price from Chainlink", {
      symbol,
      chainId,
      error,
    });
    return null;
  }
}

/**
 * Format balance for display
 * @param balance - Balance as number
 * @returns Formatted balance string
 */
function formatBalance(balance: number): string {
  if (balance === 0) return "0";
  if (balance < 0.0001) return "< 0.0001";
  if (balance < 1) return balance.toFixed(4);
  if (balance < 1000) return balance.toFixed(4);
  if (balance < 1000000)
    return balance.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return balance.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/**
 * Format USD value for display
 * @param value - USD value as number
 * @returns Formatted USD string
 */
function formatUsdValue(value: number): string {
  if (value === 0) return "$0.00";
  if (value < 0.01) return "< $0.01";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Hook to fetch and monitor wallet balance
 * @param network - Current network type
 * @returns Wallet balance data and utilities
 */
export function useWalletBalance(network: NetworkType): WalletBalanceResult {
  const { provider, address, isConnected, chainId } = useWeb3();
  const [native, setNative] = useState<string | undefined>();
  const [usdValue, setUsdValue] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Get network config
  const config = NETWORK_CONFIG[network] || NETWORK_CONFIG.moonbase;

  const fetchBalance = useCallback(async () => {
    if (!provider || !address || !isConnected) {
      setNative(() => undefined);
      setUsdValue(() => undefined);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch native balance
      const balanceWei = await provider.getBalance(address);
      const balanceFormatted = Number.parseFloat(
        ethers.formatUnits(balanceWei, config.decimals),
      );

      if (!isMountedRef.current) return;

      setNative(formatBalance(balanceFormatted));

      // Fetch price for USD value from Chainlink (don't block on this)
      fetchTokenPrice(config.symbol, config.chainId).then((price) => {
        if (!isMountedRef.current) return;

        if (price !== null) {
          const usd = balanceFormatted * price;
          setUsdValue(formatUsdValue(usd));
        } else {
          setUsdValue(() => undefined);
        }
      });

      Logger.info("Wallet balance fetched", {
        address,
        network,
        balance: formatBalance(balanceFormatted),
      });
    } catch (err) {
      if (!isMountedRef.current) return;

      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch balance";
      Logger.error("Failed to fetch wallet balance", {
        address,
        network,
        error: errorMessage,
      });
      setError(err instanceof Error ? err : new Error(errorMessage));
      setNative(() => undefined);
      setUsdValue(() => undefined);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [
    provider,
    address,
    isConnected,
    network,
    config.decimals,
    config.symbol,
    config.chainId,
  ]);

  // Fetch balance on mount and when dependencies change
  useEffect(() => {
    isMountedRef.current = true;
    fetchBalance();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchBalance]);

  // Refetch when chain changes
  useEffect(() => {
    if (chainId) {
      fetchBalance();
    }
  }, [chainId, fetchBalance]);

  // Set up polling for balance updates (every 30 seconds)
  useEffect(() => {
    if (!isConnected) return undefined;

    const intervalId = setInterval(() => {
      fetchBalance();
    }, 30000);

    return () => clearInterval(intervalId);
  }, [isConnected, fetchBalance]);

  // Listen for block updates to refresh balance after transactions
  // Debounce to avoid hammering RPC on every block (~2s on Base/Optimism)
  useEffect(() => {
    if (!provider || !isConnected) return undefined;

    /** Refetches the wallet balance on each new block event. */
    const handleBlock = () => {
      fetchBalance();
    };

    provider.on("block", handleBlock);

    return () => {
      provider.off("block", handleBlock);
    };
  }, [provider, isConnected, fetchBalance]);

  return {
    native,
    nativeSymbol: config.symbol,
    usdValue,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}

export default useWalletBalance;
