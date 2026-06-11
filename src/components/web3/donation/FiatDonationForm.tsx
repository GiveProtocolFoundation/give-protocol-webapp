import React, { useState, useCallback, useEffect } from "react";
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Mail,
  User,
  RefreshCw,
  CreditCard,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { useFiatDonation } from "@/hooks/web3/useFiatDonation";
import { usePayPalPayment } from "@/hooks/web3/usePayPalPayment";
import { useToast } from "@/contexts/ToastContext";
import { PremiumInput } from "./PremiumInput";
import { FeeOffsetCheckbox } from "./FeeOffsetCheckbox";
import { calculateFeeOffset } from "./types/donation";
import type { DonationFrequency, HelcimPaymentResult } from "./types/donation";
import {
  type FiatCurrencyConfig,
  formatCurrencyAmount,
  getFiatCurrencyByCode,
} from "@/config/fiatCurrencies";

interface FiatDonationFormProps {
  /** Unique ID for the charity */
  charityId: string;
  /** Display name of the charity */
  charityName: string;
  /** Amount to donate in the selected currency */
  amount: number;
  /** Donation frequency */
  frequency: DonationFrequency;
  /** Whether to cover processing fees */
  coverFees: boolean;
  /** Callback when cover fees changes */
  onCoverFeesChange: (_cover: boolean) => void;
  /** Callback on successful payment */
  onSuccess: (_result: HelcimPaymentResult) => void;
  /** Callback on error */
  onError: (_error: Error) => void;
  /** Authenticated user's profile ID for server-side validation */
  donorId?: string;
  /** Connected wallet address for on-chain association */
  donorAddress?: string;
  /** Selected fiat currency (defaults to USD) */
  currency?: FiatCurrencyConfig;
}

/** Props for the script status display */
interface ScriptStatusProps {
  scriptReady: boolean;
  mounted: boolean;
  paymentError: string | null;
  retryCount: number;
  onRetry: () => void;
}

/**
 * Script loading/error state display
 * @param {ScriptStatusProps} props - Component props
 * @returns {React.ReactElement | null} Status display or null when ready
 */
function ScriptStatus({
  scriptReady,
  mounted,
  paymentError,
  retryCount,
  onRetry,
}: ScriptStatusProps): React.ReactElement | null {
  if (scriptReady) return null;

  if (mounted && paymentError) {
    return (
      <div className="flex flex-col items-center gap-3 text-red-600 dark:text-red-400 py-2">
        <AlertCircle className="w-6 h-6" />
        <span className="text-sm font-medium text-center">
          Payment System Offline
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Please try again or use crypto payment
        </span>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={onRetry}
          icon={<RefreshCw className="w-4 h-4" />}
          className="mt-1"
        >
          Retry Payment Setup
        </Button>
      </div>
    );
  }

  let statusText = "Loading secure payment form...";
  if (retryCount > 0) {
    statusText = `Retrying payment setup (attempt ${retryCount + 1}/${3})...`;
  }

  return (
    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm font-medium">{statusText}</span>
    </div>
  );
}

/**
 * Disclaimer shown at the bottom of the form
 * @param {Object} props - Component props
 * @param {boolean} props.isMonthly - Whether this is a monthly donation
 * @param {string} props.formattedAmount - Pre-formatted charge amount with currency symbol
 * @returns {React.ReactElement} Disclaimer section
 */
function PaymentDisclaimer({
  isMonthly,
  formattedAmount,
}: {
  isMonthly: boolean;
  formattedAmount: string;
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex items-start gap-2 p-3 rounded-lg",
        isMonthly
          ? "bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
          : "bg-gray-50 dark:bg-slate-800/50",
      )}
    >
      {isMonthly ? (
        <>
          <RefreshCw
            className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            <span className="font-semibold">Recurring charge:</span> Your card
            will be billed {formattedAmount} monthly. You can cancel anytime via
            the link in your receipt email.
          </p>
        </>
      ) : (
        <>
          <CreditCard
            className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0 mt-0.5"
            aria-hidden="true"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            This is a one-time charge. Your card will not be saved.
          </p>
        </>
      )}
    </div>
  );
}

/** Default USD currency config used when no currency prop is provided */
const DEFAULT_CURRENCY: FiatCurrencyConfig = getFiatCurrencyByCode("USD") ?? {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  processor: "helcim",
  presets: [25, 50, 100, 250],
  enabled: true,
};

/**
 * Card payment form supporting Helcim (USD) and PayPal (non-USD) processors.
 * @component FiatDonationForm
 * @description For Helcim (USD): opens a secure Helcim-hosted iframe for card entry.
 * For PayPal (non-USD): opens a PayPal popup for secure international payment.
 * @param {FiatDonationFormProps} props - Component props
 * @returns {React.ReactElement} Fiat donation form
 */
export function FiatDonationForm({
  charityId,
  charityName,
  amount,
  frequency,
  coverFees,
  onCoverFeesChange,
  onSuccess,
  onError,
  donorId,
  donorAddress,
  currency = DEFAULT_CURRENCY,
}: FiatDonationFormProps): React.ReactElement {
  const isMonthly = frequency === "monthly";
  const isPayPal = currency.processor === "paypal";
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helcim hook (USD only)
  const {
    processFiatPayment,
    loading: helcimLoading,
    error: helcimError,
    scriptReady,
    retryInitialization,
    retryCount,
  } = useFiatDonation();

  // PayPal hook (non-USD currencies)
  const {
    processPayPalPayment,
    loading: paypalLoading,
    error: paypalError,
  } = usePayPalPayment();

  // Calculate final amount
  const { total: finalAmount } = calculateFeeOffset(coverFees ? amount : 0);
  const chargeAmount = coverFees ? finalAmount : amount;

  /** Format amount with the correct currency symbol */
  const fmtAmount = useCallback(
    (value: number) => formatCurrencyAmount(value, currency),
    [currency],
  );

  const validateForm = useCallback((): boolean => {
    let isValid = true;

    if (!name.trim()) {
      setNameError("Name is required");
      isValid = false;
    } else if (name.trim().length < 2) {
      setNameError("Please enter your full name");
      isValid = false;
    } else {
      setNameError("");
    }

    const emailRegex = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;
    if (!email.trim()) {
      setEmailError("Email is required for your receipt");
      isValid = false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      isValid = false;
    } else {
      setEmailError("");
    }

    if (amount <= 0) {
      setFormError("Please enter a donation amount");
      isValid = false;
    } else {
      setFormError("");
    }

    return isValid;
  }, [name, email, amount]);

  const handleNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setName(e.target.value);
      if (nameError) setNameError("");
    },
    [nameError],
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEmail(e.target.value);
      if (emailError) setEmailError("");
    },
    [emailError],
  );

  const handleRetryPayment = useCallback(() => {
    retryInitialization();
  }, [retryInitialization]);

  /** Handle Helcim (USD) submit */
  const handleHelcimSubmit = useCallback(async () => {
    if (!scriptReady) {
      setFormError("Payment processor is loading. Please wait.");
      return;
    }

    const result = await processFiatPayment({
      name: name.trim(),
      email: email.trim(),
      amount: chargeAmount,
      coverFees,
      charityId,
      charityName,
      frequency,
      donorId,
      donorAddress,
    });

    onSuccess(result);
  }, [
    scriptReady,
    processFiatPayment,
    name,
    email,
    chargeAmount,
    coverFees,
    charityId,
    charityName,
    frequency,
    donorId,
    donorAddress,
    onSuccess,
  ]);

  /** Handle PayPal (non-USD) submit — opens PayPal popup */
  const handlePayPalSubmit = useCallback(async () => {
    const result = await processPayPalPayment({
      amount: chargeAmount,
      currency: currency.code,
      charityId,
      donationType: isMonthly ? "subscription" : "one-time",
      donorEmail: email.trim(),
      donorName: name.trim(),
      donorId,
    });

    onSuccess({
      transactionId: result.transactionId,
      approvalCode: "",
      amountCents: Math.round(result.amount * 100),
    });
  }, [
    processPayPalPayment,
    chargeAmount,
    currency.code,
    charityId,
    isMonthly,
    email,
    name,
    donorId,
    onSuccess,
  ]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      setIsSubmitting(true);
      setFormError("");

      try {
        if (isPayPal) {
          await handlePayPalSubmit();
        } else {
          await handleHelcimSubmit();
        }
        showToast({
          type: "success",
          title: "Donation received",
          message: "Thank you — your tax receipt is on the way.",
        });
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Payment failed");
        // Don't show "Payment cancelled" as a form error
        if (error.message !== "Payment cancelled") {
          setFormError(error.message);
          onError(error);
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      validateForm,
      isPayPal,
      handlePayPalSubmit,
      handleHelcimSubmit,
      onError,
      showToast,
    ],
  );

  const loading = isPayPal ? paypalLoading : helcimLoading;
  const paymentError = isPayPal ? paypalError : helcimError;
  const displayError = formError || paymentError;
  const isBusy = loading || isSubmitting;
  const isReady = isPayPal || scriptReady;

  /** Returns the submit button label based on loading state and donation frequency */
  const getButtonText = (): string => {
    if (isBusy) {
      if (isPayPal) return "Processing with PayPal...";
      return isMonthly ? "Setting up subscription..." : "Processing...";
    }
    if (isMonthly) {
      return `Start Monthly Gift – ${fmtAmount(chargeAmount)}/mo`;
    }
    return `Donate ${fmtAmount(chargeAmount)}`;
  };

  /** Returns the appropriate icon for the submit button based on payment provider and frequency. */
  const getSubmitIcon = (): React.ReactElement => {
    if (isPayPal) return <ExternalLink className="w-5 h-5" />;
    if (isMonthly) return <RefreshCw className="w-5 h-5" />;
    return <CreditCard className="w-5 h-5" />;
  };
  const submitIcon = getSubmitIcon();

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {displayError && (
        <div
          className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl animate-fadeIn"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
          <p className="text-sm font-medium">{displayError}</p>
        </div>
      )}

      {/* Subscription info banner for monthly */}
      {isMonthly && (
        <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-100 dark:bg-emerald-800/50 rounded-full flex items-center justify-center">
            <RefreshCw
              className="w-5 h-5 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              Monthly Subscription
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Your card will be charged automatically each month. Cancel
              anytime.
            </p>
          </div>
        </div>
      )}

      {/* Guest checkout info - only show for one-time */}
      {!isMonthly && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <CheckCircle2
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
            No account needed. We&apos;ll email your receipt.
          </p>
        </div>
      )}

      {/* Name field */}
      <PremiumInput
        label="Full Name"
        type="text"
        value={name}
        onChange={handleNameChange}
        icon={User}
        error={nameError}
        autoComplete="name"
        required
      />

      {/* Email field */}
      <PremiumInput
        label="Email Address"
        type="email"
        value={email}
        onChange={handleEmailChange}
        icon={Mail}
        error={emailError}
        helperText={
          isMonthly
            ? "For receipts and subscription management"
            : "For your donation receipt"
        }
        autoComplete="email"
        required
      />

      {/* Fee offset checkbox */}
      <FeeOffsetCheckbox
        amount={amount}
        checked={coverFees}
        onChange={onCoverFeesChange}
        disabled={isBusy}
        formatAmount={fmtAmount}
      />

      {/* Helcim script loading status (USD only) */}
      {!isPayPal && !scriptReady && (
        <div
          className={cn(
            "p-4 rounded-xl",
            "bg-gray-50 dark:bg-slate-800/70",
            "border-2 border-gray-200 dark:border-slate-600",
            "flex items-center justify-center",
            mounted && helcimError && "border-red-300 dark:border-red-700",
          )}
        >
          <ScriptStatus
            scriptReady={scriptReady}
            mounted={mounted}
            paymentError={helcimError}
            retryCount={retryCount}
            onRetry={handleRetryPayment}
          />
        </div>
      )}

      {/* Secure checkout notice */}
      {isReady && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
          <Shield
            className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0"
            aria-hidden="true"
          />
          <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
            {isPayPal
              ? "A secure PayPal window will open for international payment."
              : "A secure payment window will open for card details."}
          </p>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isBusy || !isReady || amount <= 0}
        fullWidth
        size="lg"
        icon={
          isBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : submitIcon
        }
        className={cn(
          "h-14 font-bold text-lg shadow-xl hover:shadow-2xl",
          "bg-gradient-to-r from-emerald-600 to-teal-600",
          "hover:from-emerald-700 hover:to-teal-700",
          "transition-all duration-200",
        )}
      >
        {getButtonText()}
      </Button>

      <PaymentDisclaimer
        isMonthly={isMonthly}
        formattedAmount={fmtAmount(chargeAmount)}
      />

      {/* Art. 13 GDPR privacy notice */}
      <p className="text-xs text-center text-gray-400 dark:text-gray-500">
        Your donation data is processed in accordance with our{" "}
        <a
          href="/privacy"
          className="underline hover:text-gray-600 dark:hover:text-gray-300"
        >
          Privacy Policy
        </a>
        .
      </p>
    </form>
  );
}
