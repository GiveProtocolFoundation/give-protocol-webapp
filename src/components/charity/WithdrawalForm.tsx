import React, { useState, useCallback } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useWithdrawals } from "@/hooks/useWithdrawals";

/**
 * Form used by charities to request a withdrawal of a specified amount.
 * @returns The withdrawal form element.
 */
export const WithdrawalForm: React.FC = () => {
  const { requestWithdrawal, loading, error } = useWithdrawals();
  const [amount, setAmount] = useState("");

  const handleAmountChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAmount(e.target.value);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await requestWithdrawal(Number.parseFloat(amount));
      setAmount("");
    },
    [amount, requestWithdrawal],
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        Request Withdrawal
      </h2>
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <Input
          label="Amount"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={handleAmountChange}
          required
        />
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Processing..." : "Request Withdrawal"}
        </Button>
      </form>
    </div>
  );
};
