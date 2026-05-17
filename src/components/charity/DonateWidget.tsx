import React, { useState, useCallback, useMemo } from "react";
import { Heart, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWeb3 } from "@/contexts/Web3Context";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { CHAIN_CONFIGS, type ChainId } from "@/config/contracts";
import { getTokensForChain, SUPPORTED_CURRENCIES } from "@/config/tokens";
import { DonationModal } from "@/components/web3/donation/DonationModal";

type PaymentTab = "crypto" | "fiat";

/**
 * Look up the CoinGecko ID for a chain's native token so we can display a fiat
 * equivalent. Returns undefined for chains whose native token isn't priced.
 * @param chainId - EVM chain ID.
 * @returns CoinGecko ID for the native token, or undefined when unavailable.
 */
function getNativeCoingeckoId(chainId: number): string | undefined {
  const symbol = CHAIN_CONFIGS[chainId as ChainId]?.nativeCurrency.symbol;
  if (!symbol) return undefined;
  return getTokensForChain(chainId).find(
    (t) => t.isNative && t.symbol === symbol,
  )?.coingeckoId;
}

interface DonateWidgetProps {
  ein: string;
  charityName: string;
  walletAddress: string | null | undefined;
  charityId: string;
  mode: "sidebar" | "modal";
  isVerified?: boolean;
  onClose?: () => void;
}

const FIAT_PRESETS = [25, 50, 100, 250];
const CRYPTO_PRESETS = [0.01, 0.05, 0.1, 0.5];
const MAX_FIAT_DONATION = 10_000;
const MAX_CRYPTO_DONATION = 10;

/**
 * Donation widget with crypto/fiat toggle. Appears in the sidebar or as a modal.
 * @param props - Component props
 * @returns The rendered donate widget
 */
export const DonateWidget: React.FC<DonateWidgetProps> = ({
  ein: _ein,
  charityName,
  walletAddress,
  charityId,
  mode,
  isVerified = false,
  onClose,
}) => {
  const [tab, setTab] = useState<PaymentTab>("crypto");
  const [amount, setAmount] = useState(0);
  const [customAmount, setCustomAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  const { isConnected, connect, chainId } = useWeb3();
  const { selectedCurrency, setSelectedCurrency, tokenPrices } =
    useCurrencyContext();

  // Crypto symbol comes from the connected wallet's chain; null when the user
  // hasn't connected yet so we don't imply a default network.
  const cryptoSymbol = useMemo(() => {
    if (!isConnected || !chainId) return null;
    return CHAIN_CONFIGS[chainId as ChainId]?.nativeCurrency.symbol ?? null;
  }, [isConnected, chainId]);

  const fiatSymbol = selectedCurrency.symbol;
  const fiatCode = selectedCurrency.code;

  const nativePrice = useMemo(() => {
    if (!chainId) return undefined;
    const coingeckoId = getNativeCoingeckoId(chainId);
    return coingeckoId ? tokenPrices[coingeckoId] : undefined;
  }, [chainId, tokenPrices]);

  const handleCurrencySelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const code = e.target.value;
      const next = SUPPORTED_CURRENCIES.find((c) => c.code === code);
      if (next) setSelectedCurrency(next);
    },
    [setSelectedCurrency],
  );

  const handleTabChange = useCallback(
    (newTab: PaymentTab) => () => {
      setTab(newTab);
      setAmount(0);
      setCustomAmount("");
      setAmountError(null);
    },
    [],
  );

  const handlePresetClick = useCallback(
    (preset: number) => () => {
      setAmount(preset);
      setCustomAmount("");
    },
    [],
  );

  const handleCustomFocus = useCallback(() => {
    setAmount(0);
  }, []);

  const handleCustomChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setCustomAmount(val);
      const parsed = Number.parseFloat(val);
      if (Number.isNaN(parsed)) {
        setAmountError(null);
        setAmount(0);
        return;
      }
      const max = tab === "crypto" ? MAX_CRYPTO_DONATION : MAX_FIAT_DONATION;
      if (parsed > max) {
        const errorText =
          tab === "crypto"
            ? `Maximum donation is ${max}${cryptoSymbol ? ` ${cryptoSymbol}` : ""}`
            : `Maximum donation is ${fiatSymbol}${max}`;
        setAmountError(errorText);
        setAmount(0);
      } else {
        setAmountError(null);
        setAmount(parsed);
      }
    },
    [tab, cryptoSymbol, fiatSymbol],
  );

  const handleDonate = useCallback(() => {
    if (tab === "crypto" && !isConnected) {
      connect();
      return;
    }
    setShowDonationModal(true);
  }, [tab, isConnected, connect]);

  const handleCloseDonationModal = useCallback(() => {
    setShowDonationModal(false);
    onClose?.();
  }, [onClose]);

  const resolvedAddress = walletAddress ?? "";
  const hasWallet = Boolean(walletAddress);

  const presetGridClass = mode === "sidebar" ? "grid-cols-2" : "grid-cols-4";

  const content = useMemo(() => {
    const isCrypto = tab === "crypto";
    const presets = isCrypto ? CRYPTO_PRESETS : FIAT_PRESETS;
    const maxDonation = isCrypto ? MAX_CRYPTO_DONATION : MAX_FIAT_DONATION;
    const cryptoLabel = cryptoSymbol ? `Crypto (${cryptoSymbol})` : "Crypto";
    const cryptoGated = isCrypto && !isConnected;
    /**
     * Format a donation amount with the active currency symbol.
     * @param value - Numeric or string amount to format.
     * @returns The amount with the crypto token symbol suffixed or the fiat symbol prefixed.
     */
    const formatAmount = (value: number | string): string => {
      if (isCrypto) {
        return cryptoSymbol ? `${value} ${cryptoSymbol}` : `${value}`;
      }
      return `${fiatSymbol}${value}`;
    };
    /**
     * Format a crypto preset's fiat equivalent for display under the preset button.
     * @param cryptoAmount - The crypto preset amount.
     * @returns A localized fiat string like "≈ $150.00", or null when prices aren't loaded.
     */
    const formatFiatEquivalent = (cryptoAmount: number): string | null => {
      if (nativePrice === undefined || nativePrice === 0) return null;
      const fiat = cryptoAmount * nativePrice;
      const decimals = fiat >= 100 ? 0 : 2;
      return `≈ ${fiatSymbol}${fiat.toFixed(decimals)}`;
    };
    const inputPrefix = isCrypto ? "" : fiatSymbol;
    const inputSuffix = isCrypto ? (cryptoSymbol ?? "") : "";
    return (
      <div className="space-y-4">
        {/* Crypto / Fiat toggle — hidden for verified charities */}
        {!isVerified && (
          <div className="flex rounded-lg bg-gray-100 p-0.5">
            <button
              type="button"
              onClick={handleTabChange("crypto")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === "crypto"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {cryptoLabel}
            </button>
            <button
              type="button"
              onClick={handleTabChange("fiat")}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                tab === "fiat"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Fiat ({fiatCode})
            </button>
          </div>
        )}

        {/* Crypto tab gate: must connect wallet before choosing an amount */}
        {cryptoGated && (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <p className="text-xs text-gray-500">
              Connect your wallet to choose an amount and donate in crypto.
            </p>
            {!hasWallet && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg w-full">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 text-left">
                  This charity hasn&apos;t set up a wallet yet — your donation
                  will be held by Give Protocol Foundation until claimed.
                </p>
              </div>
            )}
            <Button
              fullWidth
              onClick={handleDonate}
              icon={<Heart className="h-4 w-4" />}
            >
              Donate
            </Button>
            <p className="text-xs text-gray-400">
              0% platform fee on direct donations. Network gas fees apply.
            </p>
          </div>
        )}

        {!cryptoGated && (
          <>
            {/* Fiat-only currency selector */}
            {!isCrypto && (
              <label className="flex items-center justify-between gap-2 text-xs text-gray-500">
                <span>Currency</span>
                <select
                  value={selectedCurrency.code}
                  onChange={handleCurrencySelect}
                  aria-label="Display currency"
                  className="flex-1 max-w-[60%] bg-white border border-gray-200 rounded-md px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                >
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.symbol} {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {/* Amount presets */}
            <div className={`grid ${presetGridClass} gap-2`}>
              {presets.map((preset) => {
                const fiatEq = isCrypto ? formatFiatEquivalent(preset) : null;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={handlePresetClick(preset)}
                    className={`py-2 px-1 rounded-lg text-sm font-medium transition-all border flex flex-col items-center justify-center ${
                      amount === preset && !customAmount
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
                    }`}
                  >
                    <span>{formatAmount(preset)}</span>
                    {fiatEq && (
                      <span
                        className={`text-[10px] mt-0.5 ${
                          amount === preset && !customAmount
                            ? "text-emerald-100"
                            : "text-gray-400"
                        }`}
                      >
                        {fiatEq}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom input */}
            <div className="relative">
              {inputPrefix && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {inputPrefix}
                </span>
              )}
              <input
                type="number"
                value={customAmount}
                onChange={handleCustomChange}
                onFocus={handleCustomFocus}
                placeholder="Custom amount"
                min="1"
                max={maxDonation}
                className={`w-full ${inputPrefix ? "pl-7" : "pl-3"} ${
                  inputSuffix ? "pr-16" : "pr-3"
                } py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500`}
              />
              {inputSuffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                  {inputSuffix}
                </span>
              )}
            </div>
            {amountError && (
              <p className="text-xs text-red-600 -mt-2">{amountError}</p>
            )}

            {/* Wallet warning for crypto (only relevant once connected) */}
            {isCrypto && !hasWallet && (
              <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  This charity hasn&apos;t set up a wallet yet — your donation
                  will be held by Give Protocol Foundation until claimed.
                </p>
              </div>
            )}

            {/* Donate button */}
            <Button
              fullWidth
              onClick={handleDonate}
              disabled={amount <= 0}
              icon={<Heart className="h-4 w-4" />}
            >
              {(() => {
                if (!isCrypto) return "Donate with card";
                if (amount <= 0) return "Donate";
                return `Donate ${formatAmount(amount)}`;
              })()}
            </Button>

            {/* Fee disclosure */}
            <p className="text-xs text-gray-400 text-center">
              {isCrypto
                ? "0% platform fee on direct donations. Network gas fees apply."
                : "Secure checkout · Helcim (USD) / PayPal (International)"}
            </p>
          </>
        )}
      </div>
    );
  }, [
    tab,
    amount,
    amountError,
    customAmount,
    presetGridClass,
    isConnected,
    isVerified,
    hasWallet,
    cryptoSymbol,
    fiatSymbol,
    fiatCode,
    nativePrice,
    selectedCurrency.code,
    handleTabChange,
    handlePresetClick,
    handleCustomChange,
    handleCustomFocus,
    handleDonate,
    handleCurrencySelect,
  ]);

  return (
    <>
      {mode === "sidebar" ? (
        <Card hover={false} className="p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Support {charityName}
          </h3>
          {content}
        </Card>
      ) : (
        content
      )}

      {showDonationModal && (
        <DonationModal
          charityName={charityName}
          charityAddress={resolvedAddress}
          charityId={charityId}
          frequency="once"
          onClose={handleCloseDonationModal}
        />
      )}
    </>
  );
};
