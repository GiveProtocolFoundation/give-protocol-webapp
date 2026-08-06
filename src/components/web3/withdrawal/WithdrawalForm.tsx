import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useDonation } from "@/hooks/web3/useDonation";
import { validateAmount } from "@/utils/validation";
import { Logger } from "@/utils/logger";

interface WithdrawalFormProps {
  onSuccess?: () => void;
}

/**
 * Form component for withdrawing funds from the blockchain
 * @function WithdrawalForm
 * @description Provides a user interface for withdrawing tokens from the connected wallet.
 * Includes amount validation and transaction status feedback.
 * @param {Object} props - Component props
 * @param {function} [props.onSuccess] - Optional callback function called after successful withdrawal
 * @returns {React.ReactElement} Form element with amount input and withdrawal button
 * @example
 * ```tsx
 * <WithdrawalForm onSuccess={() => console.log('Withdrawal successful')} />
 * ```
 */
export function WithdrawalForm({ onSuccess }: WithdrawalFormProps) {
  const [amount, setAmount] = useState("");
  const [_tokenAddress, setTokenAddress] = useState("");
  const { withdraw, loading, error: withdrawalError } = useDonation();
  const [error, setError] = useState("");

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");

      if (!validateAmount(Number.parseFloat(amount))) {
        setError("Please enter a valid amount between 0 and 1,000,000");
        return;
      }

      try {
        await withdraw(amount);
        setAmount("");
        setTokenAddress("");
        onSuccess?.();

        Logger.info("Withdrawal submitted", {
          amount,
          token: "ETH",
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to process withdrawal",
        );
      }
    },
    [amount, withdraw, onSuccess],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || withdrawalError) && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md">
          {error || withdrawalError}
        </div>
      )}

      <Input
        label="Amount (ETH)"
        type="number"
        min="0"
        step="0.000000000000000001"
        value={amount}
        onChange={handleAmountChange}
        required
      />

      <Button type="submit" disabled={loading || !amount} className="w-full">
        {loading ? "Processing..." : "Withdraw"}
      </Button>
    </form>
  );
}
