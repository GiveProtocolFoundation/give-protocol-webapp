import React, { useState, useCallback, useMemo } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { validateAmount } from "@/utils/validation";
import { useToast } from "@/contexts/ToastContext";
import { Logger } from "@/utils/logger";
import { ethers } from "ethers";
import { getContractAddress, CHAIN_IDS } from "@/config/contracts";
import { getERC20TokensForChain, type TokenConfig } from "@/config/tokens";
import { TokenSelector } from "./TokenSelector";
import { DualAmountInput } from "./DualAmountInput";
import { FiatPresets } from "./FiatPresets";
import { useTokenBalance } from "@/hooks/web3/useTokenBalance";
import {
  Loader2,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import CharityScheduledDistributionABI from "@/contracts/CharityScheduledDistribution.sol/CharityScheduledDistribution.json";
import { ART9_DONATION_CONSENT } from "@/constants/donationConsent";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

// Error type guards for transaction errors
interface TransactionError {
  code?: number;
  message?: string;
}

/**
 * Type guard to check if an error is a transaction error with code and message properties
 * @param error - The error object to check
 * @returns True if the error is a transaction error, false otherwise
 */
function isTransactionError(error: unknown): error is TransactionError {
  return typeof error === "object" && error !== null;
}

/**
 * Checks if an error represents a user rejection of a transaction
 * @param error - The error object to check
 * @returns True if the error indicates user rejection (code 4001 or "user rejected" message), false otherwise
 */
function isUserRejection(error: unknown): boolean {
  return (
    isTransactionError(error) &&
    (error.code === 4001 ||
      (typeof error.message === "string" &&
        error.message.includes("user rejected")))
  );
}
import { formatDate } from "@/utils/date";

// Minimum donation amount in USD to prevent dust donations
const MINIMUM_DONATION_USD = 10;

/**
 * Validates form inputs before submission
 * @returns Error message if validation fails, null if valid
 */
function validateFormInputs(
  amount: number,
  balance: number | null,
  tokenSymbol: string,
): string | null {
  if (!validateAmount(amount)) {
    return "Please enter a valid amount between 0 and 1,000,000";
  }
  if (amount <= 0) {
    return "Please enter an amount greater than 0";
  }
  if (balance !== null && amount > balance) {
    return `Insufficient balance. You have ${balance.toFixed(6)} ${tokenSymbol} but need ${amount.toFixed(6)} ${tokenSymbol}.`;
  }
  return null;
}

/**
 * Ensures token approval for the distribution contract
 * @throws Error if approval fails or is rejected
 */
async function ensureTokenApproval(
  tokenContract: ethers.Contract,
  ownerAddress: string,
  spenderAddress: string,
  requiredAmount: bigint,
  tokenSymbol: string,
): Promise<void> {
  const currentAllowance = await tokenContract.allowance(
    ownerAddress,
    spenderAddress,
  );

  if (currentAllowance >= requiredAmount) {
    return;
  }

  Logger.info("Requesting token approval for scheduled donation", {
    token: tokenSymbol,
    spender: spenderAddress,
  });

  try {
    const approveTx = await tokenContract.approve(
      spenderAddress,
      ethers.MaxUint256,
    );
    await approveTx.wait();
    Logger.info("Token approval successful", {
      token: tokenSymbol,
      spender: spenderAddress,
    });
  } catch (approveError: unknown) {
    if (isUserRejection(approveError)) {
      throw new Error(
        "Transaction was rejected. Please approve the transaction in your wallet to continue.",
      );
    }
    throw approveError;
  }
}

/**
 * Handles transaction rejection errors
 * @throws Error with user-friendly message if rejected, otherwise rethrows
 */
function handleTransactionError(error: unknown): never {
  if (isUserRejection(error)) {
    throw new Error(
      "Transaction was rejected. Please confirm the transaction in your wallet to schedule your donation.",
    );
  }
  throw error;
}

/**
 * Error alert component for form errors
 */
const ErrorAlert: React.FC<{ message: string }> = ({ message }) => (
  <div
    className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl animate-fadeIn"
    role="alert"
  >
    <svg
      className="h-5 w-5 flex-shrink-0 text-red-400"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd"
      />
    </svg>
    <p className="text-sm font-medium">{message}</p>
  </div>
);

/**
 * Success header component for donation confirmation
 */
const SuccessHeader: React.FC = () => (
  <div className="flex items-center gap-3 p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl shadow-sm animate-fadeIn">
    <CheckCircle className="h-8 w-8 text-green-500 dark:text-green-400 flex-shrink-0" />
    <hgroup>
      <h3 className="text-base font-bold text-green-900 dark:text-green-300 mb-1">
        Recurring Donation Scheduled!
      </h3>
      <p className="text-sm text-green-700 dark:text-green-400">
        Your commitment has been secured on the blockchain.
      </p>
    </hgroup>
  </div>
);

interface TransactionRecapRowProps {
  label: string;
  value: string;
  variant?: "default" | "highlight";
}

/** Single row in the transaction recap summary, with optional highlight styling. */
const TransactionRecapRow: React.FC<TransactionRecapRowProps> = ({
  label,
  value,
  variant = "default",
}) => {
  const baseClasses =
    "flex justify-between items-center p-3 rounded-lg shadow-sm";
  const variantClasses =
    variant === "highlight"
      ? "bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
      : "bg-white dark:bg-gray-700";
  const labelClasses =
    variant === "highlight"
      ? "text-emerald-700 dark:text-emerald-400 font-semibold"
      : "text-gray-600 dark:text-gray-300 font-medium";
  const valueClasses =
    variant === "highlight"
      ? "font-bold text-emerald-900 dark:text-emerald-300"
      : "font-semibold text-gray-900 dark:text-gray-100";

  return (
    <div className={`${baseClasses} ${variantClasses}`}>
      <span className={labelClasses}>{label}</span>
      <span className={valueClasses}>{value}</span>
    </div>
  );
};

interface ImportantNoticeProps {
  amount: number;
  tokenSymbol: string;
  charityName: string;
  numberOfMonths: number;
}

/**
 * Important notice component for commitment details
 */
const ImportantNotice: React.FC<ImportantNoticeProps> = ({
  amount,
  tokenSymbol,
  charityName,
  numberOfMonths,
}) => (
  <div className="flex items-start gap-3 bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 p-5 rounded-xl border-2 border-emerald-200 dark:border-emerald-800 shadow-sm">
    <AlertTriangle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
    <section>
      <h4 className="text-sm font-bold text-emerald-900 dark:text-emerald-300 mb-2">
        Important Notice
      </h4>
      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        To immediately secure your full{" "}
        <strong className="text-emerald-900 dark:text-emerald-300">
          {amount.toFixed(4)} {tokenSymbol}
        </strong>{" "}
        commitment, the total amount has been reserved today and will be
        automatically distributed to{" "}
        <strong className="text-emerald-900 dark:text-emerald-300">
          {charityName}
        </strong>{" "}
        in equal installments over the next{" "}
        <strong className="text-emerald-900 dark:text-emerald-300">
          {numberOfMonths} months
        </strong>
        {"."}
      </p>
    </section>
  </div>
);

interface SuccessMessageProps {
  amount: number;
  charityName: string;
  transactionHash: string | null;
  onClose: () => void;
  tokenSymbol: string;
  numberOfMonths: number;
  transactionFee?: string;
}

/**
 * Component that displays a success message after a scheduled donation is created
 */
const SuccessMessage: React.FC<SuccessMessageProps> = ({
  amount,
  charityName,
  transactionHash,
  onClose,
  tokenSymbol,
  numberOfMonths,
  transactionFee,
}) => {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + numberOfMonths);
  const monthlyAmount = amount / numberOfMonths;

  return (
    <div className="space-y-6">
      <SuccessHeader />
      <ImportantNotice
        amount={amount}
        tokenSymbol={tokenSymbol}
        charityName={charityName}
        numberOfMonths={numberOfMonths}
      />

      {/* Transaction Recap */}
      <section className="bg-gradient-to-br from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-800 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-sm space-y-4">
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center">
          <svg
            className="w-5 h-5 mr-2 text-gray-700 dark:text-gray-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Transaction Recap
        </h4>
        <TransactionRecapRow
          label="Total Amount Reserved:"
          value={`${amount.toFixed(6)} ${tokenSymbol}`}
        />
        <TransactionRecapRow
          label="Monthly Distribution:"
          value={`${monthlyAmount.toFixed(6)} ${tokenSymbol}`}
        />
        <TransactionRecapRow
          label="Number of Payments:"
          value={`${numberOfMonths} months`}
        />
        {transactionFee && (
          <TransactionRecapRow
            label="Transaction Fee:"
            value={transactionFee}
          />
        )}
        <TransactionRecapRow
          label="Distribution Starts:"
          value={formatDate(startDate.toISOString())}
        />
        <TransactionRecapRow
          label="Distribution Ends:"
          value={formatDate(endDate.toISOString())}
        />
        <TransactionRecapRow
          label="Beneficiary:"
          value={charityName}
          variant="highlight"
        />
      </section>

      {/* Transaction Hash */}
      {transactionHash && (
        <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-gray-800 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
              Transaction Hash:
            </p>
            <a
              href={`https://moonbase.moonscan.io/tx/${transactionHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-medium"
            >
              View on Explorer
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-xs font-mono text-gray-600 dark:text-gray-300 break-all bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
            {transactionHash}
          </p>
        </div>
      )}

      <Button
        onClick={onClose}
        fullWidth
        size="lg"
        className="font-bold shadow-lg bg-green-600 hover:bg-green-700"
      >
        Complete
      </Button>
    </div>
  );
};

/** Info banner describing the scheduled donation flow. */
const ScheduleInfoBanner: React.FC<{ charityName: string }> = ({
  charityName,
}) => (
  <div className="bg-gradient-to-br from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800">
    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
      Schedule recurring donations to{" "}
      <span className="font-semibold text-emerald-900 dark:text-emerald-300">
        {charityName}
      </span>
      . The total amount will be divided into equal monthly payments.
    </p>
  </div>
);

/** Schedule preview card showing monthly payment, total payments, and date range. */
const SchedulePreview: React.FC<{
  amount: number;
  numberOfMonths: number;
  tokenSymbol: string;
  startDate: Date;
  endDate: Date;
}> = ({ amount, numberOfMonths, tokenSymbol, startDate, endDate }) => (
  <div className="bg-gradient-to-br from-blue-50 to-emerald-50 dark:from-blue-900/20 dark:to-emerald-900/20 p-5 rounded-xl border-2 border-blue-100 dark:border-blue-800 shadow-sm">
    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
      <svg
        className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
      Schedule Preview
    </h4>
    <div className="space-y-2.5 text-sm">
      <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-lg">
        <span className="text-gray-600 dark:text-gray-300">
          Monthly payment:
        </span>
        <span className="font-bold text-emerald-900 dark:text-emerald-300">
          {amount ? (amount / numberOfMonths).toFixed(6) : "0.00"} {tokenSymbol}
        </span>
      </div>
      <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-lg">
        <span className="text-gray-600 dark:text-gray-300">
          Total payments:
        </span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">
          {numberOfMonths} months
        </span>
      </div>
      <div className="flex justify-between items-center p-2 bg-white dark:bg-gray-700 rounded-lg">
        <span className="text-gray-600 dark:text-gray-300">
          Schedule period:
        </span>
        <span className="font-medium text-gray-700 dark:text-gray-200 text-xs">
          {formatDate(startDate.toISOString())} to{" "}
          {formatDate(endDate.toISOString())}
        </span>
      </div>
    </div>
  </div>
);

interface ScheduledDonationFormProps {
  charityAddress: string;
  charityName: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

/**
 * Form component for creating scheduled monthly donations
 * @function ScheduledDonationForm
 * @description Advanced donation form that creates automated monthly payments to charities over a 12-month period.
 * Handles token approval, contract interaction, and provides detailed confirmation feedback.
 * @param {Object} props - Component props
 * @param {string} props.charityAddress - The blockchain address of the charity to receive scheduled donations
 * @param {string} props.charityName - Display name of the charity for user-friendly messaging
 * @param {function} [props.onSuccess] - Optional callback function called after successful schedule creation
 * @param {function} [props.onClose] - Optional callback function for closing the form modal
 * @returns {React.ReactElement} Complete scheduled donation form with amount input, schedule preview, and transaction handling
 * @example
 * ```tsx
 * <ScheduledDonationForm
 *   charityAddress="0x1234...abcd"
 *   charityName="Save the Children"
 *   onSuccess={() => refreshSchedules()}
 *   onClose={() => setShowModal(false)}
 * />
 * ```
 */
export function ScheduledDonationForm({
  charityAddress,
  charityName,
  onSuccess,
  onClose: _onClose,
}: ScheduledDonationFormProps) {
  const { provider, address, isConnected, connect, chainId } = useWeb3();
  const { showToast, dismissToast } = useToast();
  const { convertToFiat: _convertToFiat, tokenPrices } = useCurrencyContext();
  const { user } = useAuth();
  const { t, language } = useTranslation();
  const [art9Consented, setArt9Consented] = useState(false);

  // Get ERC20 tokens available for the current chain
  const availableTokens = useMemo(() => {
    return getERC20TokensForChain(chainId ?? CHAIN_IDS.BASE);
  }, [chainId]);

  const [amount, setAmount] = useState(0);
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(
    availableTokens[0],
  );
  const [numberOfMonths, setNumberOfMonths] = useState(12);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  const [transactionFee, setTransactionFee] = useState<string | null>(null);
  const { balance, isLoading: isLoadingBalance } =
    useTokenBalance(selectedToken);

  // Reset selected token when chain changes
  React.useEffect(() => {
    if (
      availableTokens.length > 0 &&
      !availableTokens.includes(selectedToken)
    ) {
      setSelectedToken(availableTokens[0]);
      setAmount(0);
    }
  }, [availableTokens, selectedToken]);

  // Calculate start and end dates for the donation schedule
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + numberOfMonths);

  const handleAmountChange = useCallback((newAmount: number) => {
    setAmount(newAmount);
  }, []);

  const handleTokenSelect = useCallback((token: TokenConfig) => {
    setSelectedToken(token);
    setAmount(0); // Reset amount when token changes
  }, []);

  const handleMonthsChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      const months = value === "" ? 1 : Number.parseInt(value, 10);
      setNumberOfMonths(Math.max(1, Math.min(60, months))); // Limit between 1-60 months
    },
    [],
  );

  const handleArt9ConsentChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setArt9Consented(e.target.checked);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      // Art. 9(2)(a) explicit consent gate (GIV-655)
      if (!art9Consented) {
        setError(
          t(
            "donation.art9Consent.required",
            "You must consent to donation data processing to proceed.",
          ),
        );
        return;
      }

      // Validate form inputs
      const validationError = validateFormInputs(
        amount,
        balance,
        selectedToken.symbol,
      );
      if (validationError) {
        setError(validationError);
        return;
      }

      // Ensure wallet connection
      if (!isConnected || !provider || !address) {
        try {
          await connect();
        } catch {
          setError("Please connect your wallet to continue");
          return;
        }
      }

      try {
        setLoading(true);

        const distributionAddress = getContractAddress("DISTRIBUTION");
        const signer = await provider.getSigner();
        const tokenAddress = selectedToken.address;
        const parsedAmount = ethers.parseEther(amount.toString());

        // Create token contract for approval
        const tokenContract = new ethers.Contract(
          tokenAddress,
          [
            "function approve(address spender, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)",
          ],
          signer,
        );

        // Ensure token approval
        await ensureTokenApproval(
          tokenContract,
          address,
          distributionAddress,
          parsedAmount,
          selectedToken.symbol,
        );

        // Get token price for contract
        const tokenPrice = tokenPrices[selectedToken.coingeckoId];
        if (!tokenPrice) {
          throw new Error(
            "Unable to fetch current token price. Please try again.",
          );
        }

        const tokenPriceWith8Decimals = Math.floor(tokenPrice * 10 ** 8);

        Logger.info("Creating scheduled donation", {
          charity: charityAddress,
          amount,
          numberOfMonths,
          tokenPrice,
          tokenPriceWith8Decimals,
        });

        // Create distribution contract and execute transaction
        const distributionContract = new ethers.Contract(
          distributionAddress,
          CharityScheduledDistributionABI.abi,
          signer,
        );

        const tx = await distributionContract
          .createSchedule(
            charityAddress,
            tokenAddress,
            parsedAmount,
            numberOfMonths,
            tokenPriceWith8Decimals.toString(),
          )
          .catch(handleTransactionError);

        const submittedToastId = showToast({
          type: "info",
          title: "Transaction submitted",
          message: "Waiting for on-chain confirmation…",
          persistent: true,
        });
        const receipt = await tx.wait();
        dismissToast(submittedToastId);
        showToast({
          type: "success",
          title: "Donation confirmed",
          message: "Your contribution is recorded on-chain.",
        });
        setTransactionHash(receipt.hash);

        // Art. 9(2)(a) consent record — RLS-guarded authenticated insert (GIV-655)
        if (user?.id) {
          const { error: consentErr } = await supabase
            .from("donation_consents")
            .insert({
              user_id: user.id,
              charity_wallet_address: charityAddress,
              donation_type: "crypto",
              donation_ref: receipt.hash,
              consent_text_version: ART9_DONATION_CONSENT.version,
              locale: language,
            });
          if (consentErr) {
            Logger.error("Failed to write Art.9 donation consent", {
              error: consentErr,
            });
          }
        }

        // Calculate transaction fee
        const gasUsed = receipt.gasUsed;
        const gasPrice = receipt.gasPrice || receipt.effectiveGasPrice;
        const fee = ethers.formatEther(gasUsed * gasPrice);
        setTransactionFee(`${Number.parseFloat(fee).toFixed(6)} GLMR`);

        setShowConfirmation(true);

        Logger.info("Scheduled donation created", {
          charity: charityAddress,
          amount,
          token: tokenAddress,
          txHash: receipt.hash,
          transactionFee: fee,
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to schedule donation";
        setError(message);
        Logger.error("Scheduled donation failed", { error: err });
      } finally {
        setLoading(false);
      }
    },
    [
      amount,
      art9Consented,
      t,
      charityAddress,
      isConnected,
      provider,
      address,
      connect,
      balance,
      selectedToken,
      tokenPrices,
      numberOfMonths,
      showToast,
      dismissToast,
      user,
      language,
    ],
  );

  const handleConfirmationClose = useCallback(() => {
    setAmount(0);
    setShowConfirmation(false);
    setTransactionHash(null);
    setTransactionFee(null);
    onSuccess?.();
  }, [onSuccess]);

  if (showConfirmation) {
    return (
      <SuccessMessage
        amount={amount}
        charityName={charityName}
        transactionHash={transactionHash}
        onClose={handleConfirmationClose}
        tokenSymbol={selectedToken.symbol}
        numberOfMonths={numberOfMonths}
        transactionFee={transactionFee}
      />
    );
  }

  if (!isConnected) {
    return (
      <div className="text-center">
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Connect your wallet to schedule monthly donations
        </p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <ErrorAlert message={error} />}

      <ScheduleInfoBanner charityName={charityName} />

      <TokenSelector
        selectedToken={selectedToken}
        onSelectToken={handleTokenSelect}
        walletBalance={balance ?? undefined}
        isLoadingBalance={isLoadingBalance}
        availableTokens={availableTokens}
      />

      <FiatPresets
        selectedToken={selectedToken}
        onAmountSelect={handleAmountChange}
      />

      <DualAmountInput
        token={selectedToken}
        value={amount}
        onChange={handleAmountChange}
        maxBalance={balance ?? undefined}
      />

      <div className="space-y-2">
        <Input
          label="Number of Months"
          type="number"
          min="1"
          max="60"
          step="1"
          value={numberOfMonths}
          onChange={handleMonthsChange}
          required
          variant="enhanced"
          className="text-lg font-semibold"
          helperText="Choose how many months to spread your donation (1-60 months)"
        />
      </div>

      <SchedulePreview
        amount={amount}
        numberOfMonths={numberOfMonths}
        tokenSymbol={selectedToken.symbol}
        startDate={startDate}
        endDate={endDate}
      />

      {/* Minimum Donation Info */}
      {amount > 0 && tokenPrices[selectedToken.coingeckoId] !== undefined && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <p className="text-xs text-amber-800 dark:text-amber-300">
            <span className="font-semibold">Minimum donation:</span> $
            {MINIMUM_DONATION_USD} USD to prevent dust transactions
          </p>
        </div>
      )}

      {/* Art. 9(2)(a) donation consent gate (GIV-655) */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          id="art9-consent"
          type="checkbox"
          checked={art9Consented}
          onChange={handleArt9ConsentChange}
          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
          aria-required="true"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {t(
            "donation.art9Consent.statement",
            ART9_DONATION_CONSENT.statement,
            {
              charity: charityName,
            },
          )}
        </span>
      </label>

      <Button
        type="submit"
        disabled={
          loading ||
          !amount ||
          !art9Consented ||
          isLoadingBalance ||
          (balance !== null && amount > balance)
        }
        fullWidth
        size="lg"
        icon={
          loading ? <Loader2 className="w-5 h-5 animate-spin" /> : undefined
        }
        className="font-bold text-lg shadow-xl hover:shadow-2xl"
      >
        {loading ? "Processing..." : "Schedule Recurring Donation"}
      </Button>
    </form>
  );
}
