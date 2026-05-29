import React, { useState, useCallback, useMemo, useRef } from "react";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/Button";
import { validateAmount } from "@/utils/validation";
import { useDonation, DonationType } from "@/hooks/web3/useDonation";
import { useTokenBalance } from "@/hooks/web3/useTokenBalance";
import { useToast } from "@/contexts/ToastContext";
import { Logger } from "@/utils/logger";
import { TokenSelector } from "./TokenSelector";
import { DualAmountInput } from "./DualAmountInput";
import { FiatPresets } from "./FiatPresets";
import { getERC20TokensForChain, type TokenConfig } from "@/config/tokens";
import { CHAIN_IDS } from "@/config/contracts";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

interface DonationFormProps {
  charityAddress: string;
  onSuccess?: () => void;
}

/**
 * Form component for making donations to charities
 * @function DonationForm
 * @description Comprehensive donation form that supports both native GLMR and ERC20 token donations.
 * Includes wallet connection check, donation type selection, amount validation, and transaction processing.
 * @param {Object} props - Component props
 * @param {string} props.charityAddress - The blockchain address of the charity to receive the donation
 * @param {function} [props.onSuccess] - Optional callback function called after successful donation submission
 * @returns {React.ReactElement} Complete donation form with type selection, amount input, and submit functionality
 * @example
 * ```tsx
 * <DonationForm
 *   charityAddress="0x1234...abcd"
 *   onSuccess={() => refreshDonationList()}
 * />
 * ```
 */
export function DonationForm({ charityAddress, onSuccess }: DonationFormProps) {
  const [hasMounted, setHasMounted] = useState(false);
  React.useEffect(() => { setHasMounted(true); }, []);

  const { isConnected, connect, chainId } = useWeb3();
  const { donate, loading, approving, error: donationError } = useDonation();
  const { showToast, dismissToast } = useToast();
  const pendingToastIdRef = useRef<string | null>(null);

  // Get ERC20 tokens available for the current chain
  const availableTokens = useMemo(() => {
    return getERC20TokensForChain(chainId ?? CHAIN_IDS.BASE);
  }, [chainId]);

  const [amount, setAmount] = useState(0);
  const [selectedToken, setSelectedToken] = useState<TokenConfig>(
    availableTokens[0],
  );
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
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

  const handleAmountChange = useCallback((newAmount: number) => {
    setAmount(newAmount);
  }, []);

  const handleTokenSelect = useCallback((token: TokenConfig) => {
    setSelectedToken(token);
    setAmount(0); // Reset amount when token changes
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!charityAddress) {
        setError("Charity address is missing");
        return;
      }

      if (!validateAmount(amount)) {
        setError("Please enter a valid amount between 0 and 1,000,000");
        return;
      }

      if (amount <= 0) {
        setError("Please enter an amount greater than 0");
        return;
      }

      // Validate balance
      if (balance !== null && amount > balance) {
        setError(
          `Insufficient balance. You only have ${balance.toFixed(6)} ${selectedToken.symbol} available.`,
        );
        return;
      }

      const toastId = showToast({
        type: "info",
        title: "Transaction submitted",
        message: "Waiting for on-chain confirmation\u2026",
        persistent: true,
      });
      pendingToastIdRef.current = toastId;

      try {
        // All donations are ERC20 tokens (native tokens not supported by contract)
        await donate({
          charityAddress,
          amount: amount.toString(),
          type: DonationType._TOKEN,
          _tokenAddress: selectedToken.address,
        });

        if (pendingToastIdRef.current) {
          dismissToast(pendingToastIdRef.current);
          pendingToastIdRef.current = null;
        }
        showToast({
          type: "success",
          title: "Donation confirmed",
          message: "Your contribution is recorded on-chain.",
        });

        setSuccessMessage(
          `Successfully donated ${amount} ${selectedToken.symbol}!`,
        );
        setAmount(0);

        setTimeout(() => {
          setSuccessMessage("");
          onSuccess?.();
        }, 3000);

        Logger.info("Donation submitted", {
          charity: charityAddress,
          amount,
          token: selectedToken.symbol,
        });
      } catch (err) {
        if (pendingToastIdRef.current) {
          dismissToast(pendingToastIdRef.current);
          pendingToastIdRef.current = null;
        }
        const errMsg = err instanceof Error ? err.message : "Failed to process donation";
        showToast({ type: "error", title: "Donation failed", message: errMsg });
        setError(errMsg);
      }
    },
    [amount, balance, charityAddress, selectedToken, donate, onSuccess, showToast, dismissToast],
  );

  if (!hasMounted) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-current border-t-transparent mb-3" />
        <p className="text-sm">Loading wallet...</p>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="text-center">
        <p className="mb-4 text-gray-600">Connect your wallet to donate</p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(error || donationError) && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{error || donationError}</p>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border-2 border-green-200 text-green-700 rounded-xl animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-medium">{successMessage}</p>
        </div>
      )}

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

      <Button
        type="submit"
        disabled={
          loading ||
          approving ||
          amount <= 0 ||
          isLoadingBalance ||
          (balance !== null && amount > balance)
        }
        fullWidth
        size="lg"
        icon={
          loading || approving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : undefined
        }
        className="font-bold text-lg shadow-xl hover:shadow-2xl"
      >
        {(() => {
          if (approving) return "Approving Token...";
          if (loading) return "Processing Donation...";
          if (successMessage) return "Donation Successful!";
          if (isLoadingBalance) return "Loading Balance...";
          return "Donate Now";
        })()}
      </Button>
    </form>
  );
}
