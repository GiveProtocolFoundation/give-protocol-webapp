import { useState, useEffect, useCallback, useRef } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "@/contexts/Web3Context";
import { CHAIN_IDS, CHAIN_CONFIGS, type ChainId } from "@/config/contracts";
import { chainlinkPriceFeedService } from "@/services/chainlinkPriceFeed";
import { Logger } from "@/utils/logger";

const REFRESH_INTERVAL_MS = 15000;
const ERC20_TRANSFER_GAS = 65000n;
const APPROVAL_GAS = 46000n;
const DONATION_CONTRACT_GAS = 80000n;
const ESTIMATED_DONATION_GAS =
  ERC20_TRANSFER_GAS + APPROVAL_GAS + DONATION_CONTRACT_GAS;

export interface GasEstimate {
  gasEstimateUsd: number;
  gasPriceGwei: number;
  gasUnits: bigint;
  nativeCurrencySymbol: string;
  gasEstimateNative: number;
  isHighGasChain: boolean;
}

interface UseGasEstimateReturn {
  gasEstimate: GasEstimate | null;
  isLoading: boolean;
  error: string | null;
  gasRatio: number | null;
  isHighGasRatio: boolean;
  refresh: () => void;
}

const HIGH_GAS_RATIO_THRESHOLD = 0.2;

/**
 * @param donationAmountUsd - Current donation amount in USD (for gas ratio calculation)
 * @returns Gas estimate data, loading state, and whether gas ratio is high
 */
export function useGasEstimate(
  donationAmountUsd: number | null,
): UseGasEstimateReturn {
  const { provider, chainId } = useWeb3();
  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const fetchGasEstimate = useCallback(async () => {
    if (!provider || !chainId) return;

    const chainConfig = CHAIN_CONFIGS[chainId as ChainId];
    if (!chainConfig || chainConfig.chainType !== "evm") return;

    setIsLoading(true);
    setError(null);

    try {
      const feeData = await provider.getFeeData();
      const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;
      if (!gasPrice) {
        setError("Could not fetch gas price");
        setIsLoading(false);
        return;
      }

      const gasCostWei = gasPrice * ESTIMATED_DONATION_GAS;
      const gasCostNative = Number(ethers.formatEther(gasCostWei));
      const gasPriceGwei = Number(ethers.formatUnits(gasPrice, "gwei"));

      const nativeSymbol = chainConfig.nativeCurrency.symbol;
      let nativePriceUsd = 0;

      try {
        const priceData = await chainlinkPriceFeedService.getPrice(
          chainId as ChainId,
          nativeSymbol,
        );
        if (priceData.isValid) {
          nativePriceUsd = priceData.price;
        }
      } catch {
        Logger.warn("Failed to fetch native token price for gas estimate", {
          chainId,
          symbol: nativeSymbol,
        });
      }

      const gasEstimateUsd = gasCostNative * nativePriceUsd;
      const isHighGasChain = chainId === CHAIN_IDS.ETHEREUM;

      if (!mountedRef.current) return;

      setGasEstimate({
        gasEstimateUsd,
        gasPriceGwei,
        gasUnits: ESTIMATED_DONATION_GAS,
        nativeCurrencySymbol: nativeSymbol,
        gasEstimateNative: gasCostNative,
        isHighGasChain,
      });
    } catch (err) {
      if (!mountedRef.current) return;
      const message =
        err instanceof Error ? err.message : "Failed to estimate gas";
      setError(message);
      Logger.error("Gas estimation failed", { chainId, error: err });
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [provider, chainId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setGasEstimate(null);
    setError(null);
    fetchGasEstimate();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(fetchGasEstimate, REFRESH_INTERVAL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchGasEstimate]);

  const gasRatio =
    gasEstimate && donationAmountUsd && donationAmountUsd > 0
      ? gasEstimate.gasEstimateUsd / donationAmountUsd
      : null;

  const isHighGasRatio =
    gasRatio !== null && gasRatio > HIGH_GAS_RATIO_THRESHOLD;

  return {
    gasEstimate,
    isLoading,
    error,
    gasRatio,
    isHighGasRatio,
    refresh: fetchGasEstimate,
  };
}
