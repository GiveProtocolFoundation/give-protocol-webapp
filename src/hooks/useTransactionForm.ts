import React, { useState } from "react";
import { validateAmount } from "@/utils/validation";
import { Logger } from "@/utils/logger";

interface TransactionFormConfig {
  onSuccess?: () => void;
}

/**
 * Transaction form hook for handling financial transaction forms with validation
 * @function useTransactionForm
 * @description Manages transaction form state, amount validation, loading states, and form submission logic.
 * Validates amounts between 0 and 1,000,000, provides automatic form reset on success, and comprehensive error logging.
 * @param {TransactionFormConfig} config - Configuration object with success callback
 * @param {Function} [config.onSuccess] - Optional callback executed after successful transaction
 * @returns {Object} Transaction form utilities and state
 * @returns {string} returns.amount - Current amount input value as string
 * @returns {Function} returns.setAmount - Set amount value: (amount: string) => void
 * @returns {string} returns.validationError - Amount validation error message or empty string
 * @returns {boolean} returns.loading - Form submission loading state
 * @returns {Function} returns.handleSubmit - Form submission handler: (event: React.FormEvent, submitFn: (amount: string) => Promise<void>) => Promise<void>
 * @example
 * ```tsx
 * const { amount, setAmount, validationError, loading, handleSubmit } = useTransactionForm({
 *   onSuccess: () => console.log('Transaction completed!')
 * });
 *
 * const submitDonation = async (amount: string) => {
 *   // Custom transaction logic
 *   await processDonation(Number.parseFloat(amount));
 * };
 *
 * return (
 *   <form onSubmit={(e) => handleSubmit(e, submitDonation)}>
 *     <input value={amount} onChange={(e) => setAmount(e.target.value)} />
 *     {validationError && <span className="error">{validationError}</span>}
 *     <button type="submit" disabled={loading}>
 *       {loading ? 'Processing...' : 'Submit'}
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
   * Handles form submission, validates the amount, and calls the submit function.
   * @param e - React form event
   * @param submitFn - Function to execute with the validated amount string
   * @returns Promise that resolves when the submission completes
   */
  const handleSubmit = async (
    e: React.FormEvent,
    submitFn: (_amount: string) => Promise<void>,
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
      await submitFn(amount);
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
