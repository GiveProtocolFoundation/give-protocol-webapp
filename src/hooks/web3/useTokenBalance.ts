import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { TokenConfig } from "@/config/tokens";
import { Logger } from "@/utils/logger";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

interface UseTokenBalanceResult {
  balance: number | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and monitor token balance for the connected wallet
 * @param token - The token configuration to check balance for
 * @returns Object containing balance, loading state, error, and refetch function
 */
export function useTokenBalance(
  token: TokenConfig | null,
): UseTokenBalanceResult {
  const { provider, address, isConnected } = useWeb3();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!provider || !address || !token || !isConnected) {
      setBalance(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      let fetchedBalance: number;
      if (token.isNative) {
        // Fetch native token (GLMR/DEV) balance
        const balanceWei = await provider.getBalance(address);
        fetchedBalance = Number.parseFloat(ethers.formatEther(balanceWei));
        setBalance(fetchedBalance);
      } else {
        // Fetch ERC20 token balance and decimals in parallel
        const contract = new ethers.Contract(
          token.address,
          ERC20_ABI,
          provider,
        );
        const [balanceRaw, decimals] = await Promise.all([
          contract.balanceOf(address),
          contract.decimals(),
        ]);
        fetchedBalance = Number.parseFloat(
          ethers.formatUnits(balanceRaw, decimals),
        );
        setBalance(fetchedBalance);
      }

      Logger.info("Token balance fetched", {
        token: token.symbol,
        address,
        balance: fetchedBalance,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch balance";
      Logger.error("Failed to fetch token balance", {
        token: token.symbol,
        error: errorMessage,
      });
      setError(
        err instanceof Error ? err : new Error("Failed to fetch balance"),
      );
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [provider, address, token, isConnected]);

  // Fetch balance on mount and when dependencies change
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
}
