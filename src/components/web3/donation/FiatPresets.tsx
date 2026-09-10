import React, { useCallback, useMemo, useState, useRef } from "react";
import { TokenConfig } from "@/config/tokens";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { getDonationAmountError } from "@/utils/validation";
import { formatFiat } from "@/utils/formatters";
import { cn } from "@/utils/cn";

interface FiatPresetsProps {
  selectedToken: TokenConfig;
  onAmountSelect: (_amount: number) => void;
  /** When true, pass fiat amounts directly without crypto conversion */
  directFiat?: boolean;
  /** Override default preset amounts (e.g., for non-USD currencies) */
  presets?: number[];
  /** Currency symbol to display (defaults to $ via selectedCurrency) */
  currencySymbol?: string;
  /** Whether amounts are zero-decimal (no cents, e.g., JPY, KRW) */
  zeroDecimal?: boolean;
}

const PRESET_AMOUNTS = [10, 50, 100, 500];

/**
 * Quick fiat amount preset buttons with custom amount input
 * @component FiatPresets
 * @description Provides quick selection buttons for common donation amounts in fiat currency,
 * plus a custom amount input. In crypto mode, converts to crypto based on live prices.
 * In directFiat mode, passes fiat amounts as-is (for card payments).
 * @param {FiatPresetsProps} props - Component props
 * @returns {React.ReactElement} Fiat presets component
 */
export function FiatPresets({
  selectedToken,
  onAmountSelect,
  directFiat = false,
  presets,
  currencySymbol,
  zeroDecimal = false,
}: FiatPresetsProps): React.ReactElement {
  const { selectedCurrency, tokenPrices, convertFromFiat } =
    useCurrencyContext();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customValue, setCustomValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const tokenPrice = tokenPrices[selectedToken.coingeckoId];
  const hasPrice = tokenPrice !== undefined && tokenPrice > 0;

  const emitAmount = useCallback(
    (fiatAmount: number) => {
      if (directFiat) {
        onAmountSelect(fiatAmount);
      } else {
        const cryptoAmount = convertFromFiat(
          fiatAmount,
          selectedToken.coingeckoId,
        );
        onAmountSelect(cryptoAmount);
      }
    },
    [directFiat, convertFromFiat, selectedToken.coingeckoId, onAmountSelect],
  );

  const handlePresetClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const fiatAmount = Number.parseFloat(
        e.currentTarget.dataset.amount || "0",
      );
      if (fiatAmount <= 0) return;

      if (!directFiat && !hasPrice) return;

      setSelectedAmount(fiatAmount);
      setCustomValue("");
      emitAmount(fiatAmount);
    },
    [directFiat, hasPrice, emitAmount],
  );

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;

      // Validate based on currency decimal rules. A leading "-" is allowed
      // through (GIV-984) so negative input renders an explicit inline
      // error instead of being silently swallowed.
      const pattern = zeroDecimal ? /^-?\d*$/ : /^-?\d*\.?\d{0,2}$/;
      if (raw !== "" && !pattern.test(raw)) return;

      setCustomValue(raw);
      setSelectedAmount(null);

      const parsed = Number.parseFloat(raw);
      if (!Number.isNaN(parsed) && parsed > 0) {
        emitAmount(parsed);
      } else {
        // Reset to 0 when input is empty or invalid
        onAmountSelect(0);
      }
    },
    [emitAmount, onAmountSelect, zeroDecimal],
  );

  const symbol = currencySymbol ?? "$";

  // GIV-984: live inline error for the fiat (card) path — same
  // 0 < amount <= 1,000,000 bound as the crypto path. In crypto mode the
  // converted crypto amount is validated by DualAmountInput instead.
  const customAmountError = useMemo(() => {
    if (!directFiat || customValue.trim() === "") return null;
    return getDonationAmountError(Number.parseFloat(customValue));
  }, [directFiat, customValue]);
  const hasCustomAmountError = customAmountError !== null;

  /** Format a preset amount for display */
  const formatPreset = useCallback(
    (value: number) => {
      if (currencySymbol !== undefined) {
        const formatted = zeroDecimal
          ? value.toLocaleString()
          : value.toFixed(0);
        return `${symbol}${formatted}`;
      }
      return formatFiat(value, selectedCurrency, { decimals: 0 });
    },
    [currencySymbol, zeroDecimal, symbol, selectedCurrency],
  );

  if (!directFiat && !hasPrice) {
    return (
      <div className="text-sm text-amber-600">
        Quick amounts unavailable without price data
      </div>
    );
  }

  const isCustomActive = selectedAmount === null && customValue !== "";
  const activePresets = presets ?? PRESET_AMOUNTS;

  return (
    <div className="space-y-3">
      <h3 className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        Quick Amounts
      </h3>
      <div className="grid grid-cols-4 gap-3">
        {activePresets.map((amount) => {
          const isSelected = selectedAmount === amount;
          return (
            <button
              key={amount}
              type="button"
              data-amount={amount}
              onClick={handlePresetClick}
              className={cn(
                "px-5 py-3 text-sm font-semibold rounded-xl",
                "border-2 transition-all duration-200 ease-in-out",
                "focus:outline-none focus:ring-3 focus:ring-offset-2",
                "active:scale-95 transform",
                isSelected
                  ? "bg-gradient-to-r from-emerald-600 to-emerald-600 border-emerald-600 text-white shadow-lg"
                  : "bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:border-emerald-500 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-50 dark:hover:from-emerald-900/30 dark:hover:to-emerald-900/30 hover:shadow-md focus:ring-emerald-500",
              )}
            >
              {formatPreset(amount)}
            </button>
          );
        })}
      </div>

      {/* Custom amount input */}
      <div className="relative">
        <span
          className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none",
            isCustomActive
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-gray-400 dark:text-gray-500",
          )}
        >
          {symbol}
        </span>
        <input
          ref={inputRef}
          type="text"
          inputMode={zeroDecimal ? "numeric" : "decimal"}
          placeholder="Custom amount"
          value={customValue}
          onChange={handleCustomChange}
          aria-label={`Custom donation amount in ${symbol}`}
          aria-invalid={hasCustomAmountError}
          className={cn(
            "w-full pl-7 pr-4 py-3 text-sm font-medium rounded-xl",
            "border-2 transition-all duration-200",
            "focus:outline-none focus:ring-3 focus:ring-offset-2",
            hasCustomAmountError
              ? "focus:ring-red-500 border-red-400"
              : "focus:ring-emerald-500",
            "bg-white dark:bg-slate-800",
            "placeholder:text-gray-400 dark:placeholder:text-gray-500",
            isCustomActive && !hasCustomAmountError
              ? "border-emerald-500 dark:border-emerald-400 text-gray-900 dark:text-white"
              : "border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300",
          )}
        />
      </div>

      {customAmountError && (
        <div
          className="text-sm text-red-600 font-medium"
          role="alert"
          data-testid="donation-amount-error"
        >
          {customAmountError}
        </div>
      )}
    </div>
  );
}
