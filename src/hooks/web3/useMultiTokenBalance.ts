import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { CHAIN_TOKENS, type TokenConfig } from "@/config/tokens";
import type { ChainId } from "@/config/contracts";
import { Logger } from "@/utils/logger";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
];

/**
 * Filter tokens to only include those valid for the connected chain.
 * Prevents calling balanceOf on addresses that don't exist on the current network.
 */
function filterTokensForChain(
  tokens: TokenConfig[],
  chainId: number | null,
): TokenConfig[] {
  if (!chainId) return [];

  const chainTokens = CHAIN_TOKENS[chainId as ChainId];
  if (!chainTokens) return [];

  const validAddresses = new Set(
    chainTokens.map((t) => t.address.toLowerCase()),
  );

  return tokens.filter(
    (token) =>
      token.isNative || validAddresses.has(token.address.toLowerCase()),
  );
}

/**
 * Hook for fetching balances of multiple tokens simultaneously
 * @param tokens Array of token configurations to fetch balances for
 * @returns Object containing balances map, loading state, error, and refetch function
 */
export function useMultiTokenBalance(tokens: TokenConfig[]) {
  const { provider, address, isConnected, chainId } = useWeb3();
  const [balances, setBalances] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!provider || !address || !tokens.length || !isConnected) {
      setBalances({});
      return;
    }

    // Only query tokens that belong to the connected chain
    const validTokens = filterTokensForChain(tokens, chainId);
    if (validTokens.length === 0) {
      setBalances({});
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const balancePromises = validTokens.map(async (token) => {
        try {
          if (token.isNative) {
            const balanceWei = await provider.getBalance(address);
            const balanceFormatted = Number.parseFloat(
              ethers.formatEther(balanceWei),
            );
            return { symbol: token.symbol, balance: balanceFormatted };
          }
          const contract = new ethers.Contract(
            token.address,
            ERC20_ABI,
            provider,
          );
          const balanceRaw = await contract.balanceOf(address);
          const balanceFormatted = Number.parseFloat(
            ethers.formatUnits(balanceRaw, token.decimals),
          );
          return { symbol: token.symbol, balance: balanceFormatted };
        } catch (_tokenError) {
          Logger.warn("Failed to fetch balance for token", {
            token: token.symbol,
            address: token.address,
            chainId,
          });
          return { symbol: token.symbol, balance: 0 };
        }
      });

      const results = await Promise.all(balancePromises);
      const balanceMap: Record<string, number> = {};

      for (const result of results) {
        balanceMap[result.symbol] = result.balance;
      }

      setBalances(balanceMap);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch balances"),
      );
      setBalances({});
      Logger.error("Failed to fetch multi-token balances", { error: err });
    } finally {
      setIsLoading(false);
    }
  }, [provider, address, tokens, isConnected, chainId]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, isLoading, error, refetch: fetchBalances };
}
