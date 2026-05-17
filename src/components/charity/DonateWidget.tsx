import React, { useState, useCallback, useMemo } from "react";
import { Heart, AlertTriangle } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useWeb3 } from "@/contexts/Web3Context";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { CHAIN_CONFIGS, DEFAULT_CHAIN_ID } from "@/config/contracts";
import { DonationModal } from "@/components/web3/donation/DonationModal";

type PaymentTab = "crypto" | "fiat";

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
  const { selectedCurrency } = useCurrencyContext();

  const cryptoSymbol = useMemo(() => {
    const config = chainId ? CHAIN_CONFIGS[chainId] : undefined;
    return (
      config?.nativeCurrency.symbol ??
      CHAIN_CONFIGS[DEFAULT_CHAIN_ID]?.nativeCurrency.symbol ??
      "ETH"
    );
  }, [chainId]);

  const fiatSymbol = selectedCurrency.symbol;
  const fiatCode = selectedCurrency.code;

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
            ? `Maximum donation is ${max} ${cryptoSymbol}`
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
    /**
     * Format a donation amount with the active currency symbol.
     * @param value - Numeric or string amount to format.
     * @returns The amount with the crypto token symbol suffixed or the fiat symbol prefixed.
     */
    const formatAmount = (value: number | string): string =>
      isCrypto ? `${value} ${cryptoSymbol}` : `${fiatSymbol}${value}`;
    const inputPrefix = isCrypto ? "" : fiatSymbol;
    const inputSuffix = isCrypto ? cryptoSymbol : "";
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
              Crypto ({cryptoSymbol})
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

        {/* Amount presets */}
        <div className={`grid ${presetGridClass} gap-2`}>
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={handlePresetClick(preset)}
              className={`py-2 rounded-lg text-sm font-medium transition-all border ${
                amount === preset && !customAmount
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-gray-200 hover:border-emerald-300"
              }`}
            >
              {formatAmount(preset)}
            </button>
          ))}
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

        {/* Wallet warning for crypto */}
        {tab === "crypto" && !hasWallet && (
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This charity hasn&apos;t set up a wallet yet — your donation will
              be held by Give Protocol Foundation until claimed.
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
            if (tab === "crypto" && !isConnected) return "Connect wallet";
            if (tab === "fiat") return "Donate with card";
            if (amount <= 0) return `Donate ${cryptoSymbol}`;
            return `Donate ${formatAmount(amount)}`;
          })()}
        </Button>

        {/* Fee disclosure */}
        <p className="text-xs text-gray-400 text-center">
          {tab === "crypto"
            ? "0% platform fee on direct donations. Network gas fees apply."
            : "Secure checkout · Helcim (USD) / PayPal (International)"}
        </p>
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
    handleTabChange,
    handlePresetClick,
    handleCustomChange,
    handleCustomFocus,
    handleDonate,
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
