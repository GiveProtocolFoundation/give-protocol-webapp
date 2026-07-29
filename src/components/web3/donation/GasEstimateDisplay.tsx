import { useMemo } from "react";
import { Fuel, AlertTriangle, ArrowRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { GasEstimate } from "@/hooks/web3/useGasEstimate";

interface GasEstimateDisplayProps {
  gasEstimate: GasEstimate | null;
  isLoading: boolean;
  gasRatio: number | null;
  isHighGasRatio: boolean;
  isHighGasChain: boolean;
}

const L2_ALTERNATIVES = ["Base", "Optimism", "Arbitrum"];

/**
 * @param props - Gas estimate data and display flags
 * @returns Gas estimate display with optional high-gas warning
 */
export function GasEstimateDisplay({
  gasEstimate,
  isLoading,
  gasRatio,
  isHighGasRatio,
  isHighGasChain,
}: GasEstimateDisplayProps) {
  const { t } = useTranslation();

  const formattedGas = useMemo(() => {
    if (!gasEstimate) return null;
    const usd =
      gasEstimate.gasEstimateUsd < 0.01
        ? "<$0.01"
        : `~$${gasEstimate.gasEstimateUsd.toFixed(2)}`;
    const gwei = gasEstimate.gasPriceGwei.toFixed(1);
    const pct = gasRatio !== null ? `${Math.round(gasRatio * 100)}%` : null;
    return { usd, gwei, pct };
  }, [gasEstimate, gasRatio]);

  if (isLoading && !gasEstimate) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span>{t("donation.gas.estimating", "Estimating network fee…")}</span>
      </div>
    );
  }

  if (!gasEstimate || !formattedGas) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2">
        <span className="flex items-center gap-1.5">
          <Fuel className="w-4 h-4" />
          {t("donation.gas.label", "Est. network fee")}
        </span>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          {formattedGas.usd}
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            ({formattedGas.gwei} gwei)
          </span>
        </span>
      </div>

      {isHighGasRatio && formattedGas.pct && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-amber-800 dark:text-amber-200">
            <p className="font-medium">
              {t(
                "donation.gas.highGasWarning",
                "High gas alert: estimated fee is {{usd}}, which is {{pct}} of your donation.",
                {
                  usd: formattedGas.usd,
                  pct: formattedGas.pct,
                },
              )}
            </p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              {t(
                "donation.gas.highGasSuggestion",
                "Consider a larger donation or switching to a lower-fee chain.",
              )}
            </p>
          </div>
        </div>
      )}

      {isHighGasChain && !isHighGasRatio && (
        <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 px-3 py-1.5">
          <ArrowRight className="w-3 h-3" />
          <span>
            {t("donation.gas.l2Hint", "For lower fees, try {{chains}}.", {
              chains: L2_ALTERNATIVES.join(", "),
            })}
          </span>
        </div>
      )}
    </div>
  );
}
