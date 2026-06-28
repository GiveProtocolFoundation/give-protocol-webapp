import { useState, useEffect, useCallback } from "react";
import { useToast } from "../contexts/ToastContext";
import { supabase } from "../lib/supabase";
import { useProfile } from "./useProfile";

/** A user financial transaction record (donation or withdrawal). */
export interface Transaction {
  id: string;
  type: "donation" | "withdrawal";
  amount: number;
  status: "pending" | "completed" | "failed";
  txHash?: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

/**
 * Transaction tracking hook for managing user financial transactions
 * @function useTransactionTracking
 * @description Provides functionality to track, fetch, and manage user transactions including donations and withdrawals.
 * Automatically fetches transactions on profile changes and provides methods to track new transactions with toast notifications.
 * @returns {Object} Transaction tracking utilities and state
 * @returns {Transaction[]} returns.transactions - Array of user's transactions ordered by creation date (newest first)
 * @returns {Function} returns.trackTransaction - Function to track a new transaction: (type, amount, txHash?, metadata?) => Promise<void>
 * @returns {boolean} returns.loading - Loading state for fetch operations
 * @example
 * ```tsx
 * const { transactions, trackTransaction, loading } = useTransactionTracking();
 *
 * // Track a new donation
 * await trackTransaction('donation', 100, '0x123...', { charityId: 'abc' });
 *
 * // Display transactions
 * if (loading) return <Spinner />;
 * return transactions.map(tx => <TransactionItem key={tx.id} transaction={tx} />);
 * ```
 */
export function useTransactionTracking() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { profile } = useProfile();

  const fetchTransactions = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTransactions(data);
    } catch (_error) {
      showToast("error", "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, [profile?.id, showToast]);

  /**
   * Records a new transaction for the current user.
   * @param type - Transaction type
   * @param amount - Transaction amount
   * @param txHash - Optional blockchain transaction hash
   * @param metadata - Optional additional transaction metadata
   * @returns Promise that resolves when the transaction is recorded
   */
  const trackTransaction = async (
    type: Transaction["type"],
    amount: number,
    txHash?: string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!profile?.id) throw new Error("Profile not found");

    try {
      const { error } = await supabase.from("transactions").insert({
        user_id: profile.id,
        type,
        amount,
        status: "pending",
        tx_hash: txHash,
        metadata,
      });

      if (error) throw error;

      showToast("success", "Transaction tracked successfully");
      await fetchTransactions();
    } catch (error) {
      showToast("error", "Failed to track transaction");
      throw error;
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [profile?.id, fetchTransactions]);

  return {
    transactions,
    trackTransaction,
    loading,
  };
}
