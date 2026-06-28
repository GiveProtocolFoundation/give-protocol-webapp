import React, { useState, useCallback } from "react";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { isValidAmount } from "../../../utils/validation";
import { formatCurrency } from "../../../utils/money";

interface WithdrawalRequestFormProps {
  onSubmit: (_amount: number) => Promise<void>;
  availableBalance: number;
  loading?: boolean;
  error?: string;
}

/**
 * Form component for submitting a withdrawal request.
 * @param props - WithdrawalRequestFormProps
 * @param props.onSubmit - Callback invoked with the requested amount on submit
 * @param props.availableBalance - Current withdrawable balance
 * @param props.loading - Whether the submission is in progress
 * @param props.error - Optional error message to display
 * @returns Withdrawal request form element
 */
const WithdrawalRequestForm: React.FC<WithdrawalRequestFormProps> = ({
  onSubmit,
  availableBalance,
  loading,
  error,
}) => {
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState("");

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const numAmount = Number.parseFloat(amount);

      if (!isValidAmount(numAmount)) {
        setValidationError("Please enter a valid amount");
        return;
      }

      if (numAmount > availableBalance) {
        setValidationError(
          `Amount cannot exceed available balance of ${formatCurrency(availableBalance)}`,
        );
        return;
      }

      try {
        await onSubmit(numAmount);
        setAmount("");
        setValidationError("");
      } catch (_err) {
        // Error handling is done by parent component
      }
    },
    [amount, availableBalance, onSubmit],
  );

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
      setValidationError("");
    },
    [],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {(error || validationError) && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md">
          {error || validationError}
        </div>
      )}
      <Input
        label="Withdrawal Amount"
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={handleAmountChange}
        required
        helperText={`Available balance: ${formatCurrency(availableBalance)}`}
      />
      <Button type="submit" disabled={loading || !amount} className="w-full">
        {loading ? "Processing..." : "Request Withdrawal"}
      </Button>
    </form>
  );
};

export default WithdrawalRequestForm;
