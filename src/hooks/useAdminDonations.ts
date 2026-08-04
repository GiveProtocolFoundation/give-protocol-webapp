import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  flagDonation,
  getDonationSummary,
  listDonations,
  resolveFlag,
  summaryToCsv,
} from "../services/adminDonationService";
import type {
  AdminDonationListFilters,
  AdminDonationListResult,
  AdminDonationSummaryRow,
  AdminFlagDonationInput,
  AdminResolveFlagInput,
  DonationSummaryGroupBy,
} from "../types/adminDonation";

const INITIAL_RESULT: AdminDonationListResult = {
  donations: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Hook for admin donation monitoring: listing, filtering, flagging, and reporting.
 * @function useAdminDonations
 * @description Provides state management for the admin donation monitoring page,
 * including paginated listing, filtering, flag/resolve actions, and CSV export.
 * @returns {Object} Donation list state and action functions
 * @returns {AdminDonationListResult} returns.result - Current paginated donation list
 * @returns {boolean} returns.loading - Loading state for list fetches
 * @returns {boolean} returns.flagging - Loading state for flag/resolve actions
 * @returns {AdminDonationSummaryRow[]} returns.summary - Current summary rows for export
 * @returns {boolean} returns.summaryLoading - Loading state for summary fetches
 * @returns {Function} returns.fetchDonations - Fetch donations with filters
 * @returns {Function} returns.fetchSummary - Fetch aggregated summary data
 * @returns {Function} returns.submitFlag - Flag a donation for review
 * @returns {Function} returns.submitResolveFlag - Resolve an open donation flag
 * @returns {Function} returns.exportCsv - Export current summary as CSV download
 */
export function useAdminDonations() {
  const [result, setResult] = useState<AdminDonationListResult>(INITIAL_RESULT);
  const [loading, setLoading] = useState(false);
  const [flagging, setFlagging] = useState(false);
  const [summary, setSummary] = useState<AdminDonationSummaryRow[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchDonations = useCallback(
    async (filters: AdminDonationListFilters = {}) => {
      try {
        setLoading(true);
        setError(null);
        const data = await listDonations(filters);
        setResult(data);
        return data;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load donations";
        setError(msg);
        showToast("error", msg);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const fetchSummary = useCallback(
    async (
      dateFrom: string,
      dateTo: string,
      groupBy: DonationSummaryGroupBy,
    ) => {
      try {
        setSummaryLoading(true);
        const data = await getDonationSummary(dateFrom, dateTo, groupBy);
        setSummary(data);
        return data;
      } catch (error) {
        showToast("error", "Failed to load donation summary");
        throw error;
      } finally {
        setSummaryLoading(false);
      }
    },
    [showToast],
  );

  const submitFlag = useCallback(
    async (
      input: AdminFlagDonationInput,
      currentFilters: AdminDonationListFilters = {},
    ) => {
      try {
        setFlagging(true);
        const flagId = await flagDonation(input);
        if (flagId === null) {
          showToast("error", "Failed to flag donation. Please try again.");
          return false;
        }
        showToast("success", "Donation flagged for review");
        const data = await listDonations(currentFilters);
        setResult(data);
        return true;
      } catch (error) {
        showToast("error", "Failed to flag donation. Please try again.");
        throw error;
      } finally {
        setFlagging(false);
      }
    },
    [showToast],
  );

  const submitResolveFlag = useCallback(
    async (
      input: AdminResolveFlagInput,
      currentFilters: AdminDonationListFilters = {},
    ) => {
      try {
        setFlagging(true);
        const success = await resolveFlag(input);
        if (!success) {
          showToast("error", "Failed to resolve flag. Please try again.");
          return false;
        }
        showToast("success", "Flag resolved");
        const data = await listDonations(currentFilters);
        setResult(data);
        return true;
      } catch (error) {
        showToast("error", "Failed to resolve flag. Please try again.");
        throw error;
      } finally {
        setFlagging(false);
      }
    },
    [showToast],
  );

  const exportCsv = useCallback(
    (rows: AdminDonationSummaryRow[], filename: string) => {
      const csv = summaryToCsv(rows);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  return {
    result,
    loading,
    flagging,
    summary,
    summaryLoading,
    error,
    fetchDonations,
    fetchSummary,
    submitFlag,
    submitResolveFlag,
    exportCsv,
  };
}
