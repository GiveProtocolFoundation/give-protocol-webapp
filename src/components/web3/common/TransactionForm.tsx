import React, { useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface TransactionFormProps {
  amount: string;
  onAmountChange: (_value: string) => void;
  onSubmit: (_e: React.FormEvent) => Promise<void>;
  loading: boolean;
  error?: string;
  submitLabel: string;
}

/**
 * Form used to enter an ETH amount and submit a Web3 transaction.
 * @param props - Component props.
 * @param props.amount - Current amount value (controlled input).
 * @param props.onAmountChange - Callback invoked when the amount input changes.
 * @param props.onSubmit - Submit handler invoked when the form is submitted.
 * @param props.loading - When `true`, disables the submit button and shows a processing label.
 * @param props.error - Optional error message rendered above the input.
 * @param props.submitLabel - Label shown on the submit button when not loading.
 * @returns The transaction form element.
 */
export const TransactionForm: React.FC<TransactionFormProps> = ({
  amount,
  onAmountChange,
  onSubmit,
  loading,
  error,
  submitLabel,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onAmountChange(e.target.value);
    },
    [onAmountChange],
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-600 rounded-md">{error}</div>
      )}
      <Input
        label="Amount (ETH)"
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={handleChange}
        required
      />
      <Button type="submit" disabled={loading || !amount} className="w-full">
        {loading ? "Processing..." : submitLabel}
      </Button>
    </form>
  );
};
