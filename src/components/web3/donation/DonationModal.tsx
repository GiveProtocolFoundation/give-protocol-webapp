import React, {
  useCallback,
  useReducer,
  useMemo,
  useState,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import {
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

// Components
import { PostDonationShare } from "@/components/social/PostDonationShare";
import { DonationForm } from "./DonationForm";
import { ScheduledDonationForm } from "./ScheduledDonationForm";
import { FiatDonationForm } from "./FiatDonationForm";
import { PaymentMethodToggle } from "./PaymentMethodToggle";
import { DonationFrequencyToggle } from "./DonationFrequencyToggle";
import { FiatPresets } from "./FiatPresets";
import { FiatCurrencySelector } from "./FiatCurrencySelector";
import { TrustSignals } from "./TrustSignals";

// Types
import type {
  PaymentMethod,
  DonationFrequency,
  DonationResult,
  DonationModalState,
  DonationModalAction,
  HelcimPaymentResult,
} from "./types/donation";
import { calculateFeeOffset } from "./types/donation";
import { getERC20TokensForChain, type TokenConfig } from "@/config/tokens";
import { getContractAddress, CHAIN_IDS } from "@/config/contracts";
import { useWeb3 } from "@/contexts/Web3Context";
import { useAuth } from "@/contexts/AuthContext";
import {
  type FiatCurrencyConfig,
  getFiatCurrencyByCode,
  formatCurrencyAmount,
  isZeroDecimalCurrency,
} from "@/config/fiatCurrencies";

/** Shared modal overlay + card shell with close button */
function ModalShell({
  onClose,
  children,
  dark,
}: {
  onClose: () => void;
  children: React.ReactNode;
  dark?: boolean;
}): React.ReactElement {
  const content = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
      <Card
        className={cn(
          "w-full max-w-md relative shadow-2xl rounded-2xl animate-slideIn my-8",
          dark && "dark:bg-slate-900",
        )}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors z-10 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-full p-1 hover:bg-white dark:hover:bg-slate-700"
          aria-label="Close"
        >
          <X className="h-6 w-6" />
        </button>
        {children}
      </Card>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(content, document.body) as React.ReactElement;
  }
  return content;
}

/** Format the donation amount for display in the success message */
function formatSuccessAmount(result: DonationResult): string {
  if (result.paymentMethod === "card") {
    const currencyConfig = getFiatCurrencyByCode(result.currency);
    if (currencyConfig) {
      return formatCurrencyAmount(result.amount, currencyConfig);
    }
    return `$${result.amount.toFixed(2)}`;
  }
  return `${result.amount} ${result.currency}`;
}

/** Success confirmation content */
function SuccessContent({
  result,
  charityName,
  onClose,
}: {
  result: DonationResult;
  charityName: string;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        Thank You!
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Your {result.isRecurring ? "monthly " : ""}donation of{" "}
        {formatSuccessAmount(result)} to {charityName} has been processed.
      </p>
      {result.isRecurring && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-4">
          You&apos;ll be charged monthly until you cancel.
        </p>
      )}
      {result.paymentMethod === "card" && (
        <p className="text-sm text-gray-500 dark:text-gray-500">
          A receipt has been sent to your email.
        </p>
      )}
      <PostDonationShare charityName={charityName} />
      <Button onClick={onClose} className="mt-6" fullWidth>
        Done
      </Button>
    </div>
  );
}

/** Amount display shown when an amount is selected in card mode */
function AmountDisplay({
  amount,
  isMonthly,
  formattedAmount,
}: {
  amount: number;
  isMonthly: boolean;
  formattedAmount: string;
}): React.ReactElement | null {
  if (amount <= 0) return null;
  return (
    <div className="text-center p-4 bg-gray-50 dark:bg-slate-800 rounded-xl">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Donation Amount
      </p>
      <p className="text-3xl font-bold text-gray-900 dark:text-white">
        {formattedAmount}
      </p>
      {isMonthly && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">
          per month
        </p>
      )}
    </div>
  );
}

/** Error state content */
function ErrorContent({
  error,
  onReset,
  onClose,
}: {
  error: string | null;
  onReset: () => void;
  onClose: () => void;
}): React.ReactElement {
  return (
    <div className="p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
        <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        Something Went Wrong
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        {error || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <Button onClick={onReset} variant="secondary" fullWidth>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Try Again
        </Button>
        <Button onClick={onClose} fullWidth>
          Close
        </Button>
      </div>
    </div>
  );
}

interface DonationModalProps {
  /** Display name of the charity */
  charityName: string;
  /** Blockchain address of the charity */
  charityAddress: string;
  /** Unique ID for the charity (for Helcim metadata) */
  charityId: string;
  /** Donation frequency - determines modal mode */
  frequency: DonationFrequency;
  /** Callback when modal is closed */
  onClose: () => void;
  /** Optional callback after successful donation */
  onSuccess?: (_result: DonationResult) => void;
}

/** Creates the initial reducer state for the donation modal based on the selected frequency. */
function createInitialState(frequency: DonationFrequency): DonationModalState {
  return {
    paymentMethod: "card",
    frequency,
    step: "input",
    amount: 0,
    fiatCurrencyCode: "USD",
    coverFees: false,
    error: null,
    result: null,
  };
}

/** Reducer that manages donation modal state transitions for payment method, amount, and processing status. */
function donationReducer(
  state: DonationModalState,
  action: DonationModalAction,
): DonationModalState {
  switch (action.type) {
    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.payload, error: null };
    case "SET_FREQUENCY":
      return { ...state, frequency: action.payload, error: null };
    case "SET_AMOUNT":
      return { ...state, amount: action.payload, error: null };
    case "SET_FIAT_CURRENCY":
      // Reset amount when currency changes (presets differ)
      return {
        ...state,
        fiatCurrencyCode: action.payload,
        amount: 0,
        error: null,
      };
    case "SET_COVER_FEES":
      return { ...state, coverFees: action.payload };
    case "START_PROCESSING":
      return { ...state, step: "processing", error: null };
    case "SET_SUCCESS":
      return { ...state, step: "success", result: action.payload, error: null };
    case "SET_ERROR":
      return { ...state, step: "error", error: action.payload };
    case "RESET":
      return {
        ...createInitialState(state.frequency),
        paymentMethod: state.paymentMethod,
        fiatCurrencyCode: state.fiatCurrencyCode,
      };
    default:
      return state;
  }
}

/**
 * Unified donation modal supporting both crypto and card payments
 * @component DonationModal
 * @description Full-featured donation gateway with payment method (card/crypto)
 * and frequency (once/monthly) toggles. The `frequency` prop seeds the initial
 * selection; the user can switch inside the modal.
 * @param {Object} props - Component props
 * @param {string} props.charityName - Display name of the charity
 * @param {string} props.charityAddress - Blockchain address
 * @param {string} props.charityId - Unique identifier for fiat payments
 * @param {DonationFrequency} props.frequency - Initial frequency ('once' or 'monthly'); the user can toggle inside the modal.
 * @param {function} props.onClose - Close callback
 * @param {function} [props.onSuccess] - Success callback
 * @returns {React.ReactElement} Donation modal
 */
export const DonationModal: React.FC<DonationModalProps> = ({
  charityName,
  charityAddress,
  charityId,
  frequency,
  onClose,
  onSuccess,
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const { chainId, isConnected: _isConnected, address } = useWeb3();
  const { user } = useAuth();
  const [state, dispatch] = useReducer(
    donationReducer,
    frequency,
    createInitialState,
  );

  // Get token for fiat presets
  const availableTokens = useMemo(() => {
    return getERC20TokensForChain(chainId ?? CHAIN_IDS.BASE);
  }, [chainId]);

  const [selectedToken, setSelectedToken] = useState<TokenConfig>(
    availableTokens[0],
  );

  // Get donation contract address for trust signals
  const contractAddress = useMemo(() => {
    return getContractAddress("DONATION", chainId ?? CHAIN_IDS.BASE);
  }, [chainId]);

  // Update selected token when chain changes
  useEffect(() => {
    if (
      availableTokens.length > 0 &&
      !availableTokens.includes(selectedToken)
    ) {
      setSelectedToken(availableTokens[0]);
    }
  }, [availableTokens, selectedToken]);

  // Resolve fiat currency config from state
  const selectedFiatCurrency = useMemo<FiatCurrencyConfig>(() => {
    return (
      getFiatCurrencyByCode(state.fiatCurrencyCode) ?? {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        processor: "helcim" as const,
        presets: [25, 50, 100, 250],
        enabled: true,
      }
    );
  }, [state.fiatCurrencyCode]);

  /** Format an amount in the selected fiat currency */
  const fmtFiat = useCallback(
    (value: number) => formatCurrencyAmount(value, selectedFiatCurrency),
    [selectedFiatCurrency],
  );

  // Action handlers
  const handlePaymentMethodChange = useCallback((method: PaymentMethod) => {
    dispatch({ type: "SET_PAYMENT_METHOD", payload: method });
  }, []);

  const handleFrequencyChange = useCallback((next: DonationFrequency) => {
    dispatch({ type: "SET_FREQUENCY", payload: next });
  }, []);

  const handleAmountChange = useCallback((amount: number) => {
    dispatch({ type: "SET_AMOUNT", payload: amount });
  }, []);

  const handleCoverFeesChange = useCallback((cover: boolean) => {
    dispatch({ type: "SET_COVER_FEES", payload: cover });
  }, []);

  const handleCurrencyChange = useCallback((currency: FiatCurrencyConfig) => {
    dispatch({ type: "SET_FIAT_CURRENCY", payload: currency.code });
  }, []);

  // Success handlers
  const handleCryptoSuccess = useCallback(() => {
    const result: DonationResult = {
      transactionId: "crypto-tx", // Actual hash handled by form
      amount: state.amount,
      currency: selectedToken.symbol,
      paymentMethod: "crypto",
      isRecurring: state.frequency === "monthly",
      timestamp: new Date(),
    };
    dispatch({ type: "SET_SUCCESS", payload: result });
    onSuccess?.(result);
  }, [state.amount, state.frequency, selectedToken.symbol, onSuccess]);

  const handleFiatSuccess = useCallback(
    (paymentResult: HelcimPaymentResult) => {
      const { total } = calculateFeeOffset(state.coverFees ? state.amount : 0);
      const chargeAmount = state.coverFees ? total : state.amount;

      const result: DonationResult = {
        transactionId: paymentResult.transactionId,
        amount: chargeAmount,
        currency: state.fiatCurrencyCode,
        paymentMethod: "card",
        isRecurring: state.frequency === "monthly",
        timestamp: new Date(),
      };
      dispatch({ type: "SET_SUCCESS", payload: result });
      onSuccess?.(result);
    },
    [
      state.amount,
      state.coverFees,
      state.fiatCurrencyCode,
      state.frequency,
      onSuccess,
    ],
  );

  const handleFiatError = useCallback((error: Error) => {
    dispatch({ type: "SET_ERROR", payload: error.message });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // Modal title based on state and frequency
  const modalTitle = useMemo(() => {
    if (state.step === "success") {
      return "Thank You!";
    }
    if (state.step === "error") {
      return "Something Went Wrong";
    }
    return state.frequency === "monthly"
      ? `Support ${charityName} Monthly`
      : `Donate to ${charityName}`;
  }, [state.step, state.frequency, charityName]);

  // Frequency badge component
  const FrequencyBadge = useMemo(() => {
    if (state.frequency === "monthly") {
      return (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-semibold">
          <Calendar className="w-3 h-3" />
          Monthly
        </div>
      );
    }
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-semibold">
        <Zap className="w-3 h-3" />
        One-Time
      </div>
    );
  }, [state.frequency]);

  // Render success state
  if (state.step === "success" && state.result) {
    return (
      <ModalShell onClose={onClose}>
        <SuccessContent
          result={state.result}
          charityName={charityName}
          onClose={onClose}
        />
      </ModalShell>
    );
  }

  // Render error state
  if (state.step === "error") {
    return (
      <ModalShell onClose={onClose}>
        <ErrorContent
          error={state.error}
          onReset={handleReset}
          onClose={onClose}
        />
      </ModalShell>
    );
  }

  // Main input state
  return (
    <ModalShell onClose={onClose} dark>
      <div className="p-8 max-h-[calc(100vh-4rem)] overflow-y-auto">
        {/* Header with title and frequency badge */}
        <div className="mb-6 pr-8">
          <h2 className="flex items-center gap-3 mb-2 text-2xl font-semibold text-gray-900 dark:text-white">
            {modalTitle}
          </h2>
          {FrequencyBadge}
        </div>

        {/* Frequency Toggle (one-time vs monthly) */}
        <div className="mb-4">
          <DonationFrequencyToggle
            value={state.frequency}
            onChange={handleFrequencyChange}
            disabled={state.step === "processing"}
          />
        </div>

        {/* Payment Method Toggle */}
        <div className="mb-6">
          <PaymentMethodToggle
            value={state.paymentMethod}
            onChange={handlePaymentMethodChange}
            disabled={state.step === "processing"}
          />
        </div>

        {/* Content based on payment method */}
        <div
          className={cn(
            "transition-opacity duration-200 ease-out",
            state.step === "processing" && "opacity-50 pointer-events-none",
          )}
        >
          {state.paymentMethod === "crypto" && state.frequency === "once" && (
            <DonationForm
              charityAddress={charityAddress}
              onSuccess={handleCryptoSuccess}
            />
          )}
          {state.paymentMethod === "crypto" && state.frequency !== "once" && (
            <ScheduledDonationForm
              charityAddress={charityAddress}
              charityName={charityName}
              onSuccess={handleCryptoSuccess}
              onClose={onClose}
            />
          )}
          {state.paymentMethod !== "crypto" && !isMounted && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent mb-3" />
              <p className="text-sm">Loading payment form...</p>
            </div>
          )}
          {state.paymentMethod !== "crypto" && isMounted && (
            <div className="space-y-6">
              <FiatCurrencySelector
                value={state.fiatCurrencyCode}
                onChange={handleCurrencyChange}
                disabled={state.step === "processing"}
              />

              <FiatPresets
                selectedToken={selectedToken}
                onAmountSelect={handleAmountChange}
                directFiat
                presets={selectedFiatCurrency.presets}
                currencySymbol={selectedFiatCurrency.symbol}
                zeroDecimal={isZeroDecimalCurrency(selectedFiatCurrency.code)}
              />

              <AmountDisplay
                amount={state.amount}
                isMonthly={state.frequency === "monthly"}
                formattedAmount={fmtFiat(state.amount)}
              />

              <FiatDonationForm
                charityId={charityId}
                charityName={charityName}
                amount={state.amount}
                frequency={state.frequency}
                coverFees={state.coverFees}
                onCoverFeesChange={handleCoverFeesChange}
                onSuccess={handleFiatSuccess}
                onError={handleFiatError}
                donorId={user?.id}
                donorAddress={address ?? undefined}
                currency={selectedFiatCurrency}
              />
            </div>
          )}
        </div>

        {/* Trust signals */}
        <div className="mt-6">
          <TrustSignals
            paymentMethod={state.paymentMethod}
            contractAddress={contractAddress}
          />
        </div>
      </div>
    </ModalShell>
  );
};
