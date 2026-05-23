import React, { useState } from "react";
import { validateAmount } from "@/utils/validation";
import { Logger } from "@/utils/logger";

interface TransactionFormConfig {
  onSuccess?: () => void;
}

/**
 * Web3 transaction form hook for handling blockchain transaction forms with validation
 * @function useTransactionForm
 * @description Web3-specific version of transaction form hook that manages form state, amount validation,
 * loading states, and form submission logic for blockchain transactions. Validates amounts and provides
 * automatic form reset on success with comprehensive error logging.
 * @param {TransactionFormConfig} config - Configuration object with success callback
 * @param {Function} [config.onSuccess] - Optional callback executed after successful transaction
 * @returns {Object} Web3 transaction form utilities and state
 * @returns {string} returns.amount - Current amount input value as string
 * @returns {Function} returns.setAmount - Set amount value: (amount: string) => void
 * @returns {string} returns.validationError - Amount validation error message or empty string
 * @returns {boolean} returns.loading - Form submission loading state
 * @returns {Function} returns.handleSubmit - Form submission handler: (event: React.FormEvent, executeFn: (amount: string) => Promise<void>) => Promise<void>
 * @example
 * ```tsx
 * const { amount, setAmount, validationError, loading, handleSubmit } = useTransactionForm({
 *   onSuccess: () => refreshBalance()
 * });
 *
 * const executeDonation = async (amount: string) => {
 *   const tx = await contract.donate(charityAddress, { value: parseEther(amount) });
 *   await tx.wait();
 * };
 *
 * return (
 *   <form onSubmit={(e) => handleSubmit(e, executeDonation)}>
 *     <input value={amount} onChange={(e) => setAmount(e.target.value)} />
 *     {validationError && <span className="error">{validationError}</span>}
 *     <button type="submit" disabled={loading}>
 *       {loading ? 'Processing Transaction...' : 'Send Transaction'}
 *     </button>
 *   </form>
 * );
 * ```
 */
export function useTransactionForm({ onSuccess }: TransactionFormConfig) {
  const [amount, setAmount] = useState("");
  const [validationError, setValidationError] = useState("");
  const [loading, setLoading] = useState(false);

  /**
   * Handles form submission for a blockchain transaction.
   * @param e - React form event
   * @param executeFn - Function to execute with the validated amount
   * @returns Promise that resolves when the transaction completes
   */
  const handleSubmit = async (
    e: React.FormEvent,
    executeFn: (_amount: string) => Promise<void>,
  ) => {
    e.preventDefault();
    setValidationError("");

    const numAmount = Number.parseFloat(amount);
    if (!validateAmount(numAmount)) {
      setValidationError("Please enter a valid amount between 0 and 1,000,000");
      return;
    }

    try {
      setLoading(true);
      await executeFn(amount);
      setAmount("");
      onSuccess?.();

      Logger.info("Transaction successful", {
        amount,
      });
    } catch (err) {
      Logger.error("Transaction failed", {
        error: err instanceof Error ? err.message : String(err),
        amount,
      });
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    amount,
    setAmount,
    validationError,
    loading,
    handleSubmit,
  };
}
