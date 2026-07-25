import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { listCharities, updateCharityStatus } from "../services/adminCharityService";
import type {
  AdminCharityListFilters,
  AdminCharityListResult,
  AdminCharityStatusUpdateInput,
  AdminCharityVerificationStatus,
} from "../types/adminCharity";

const INITIAL_RESULT: AdminCharityListResult = {
  charities: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Hook for admin charity management: listing, filtering, and status updates.
 * @function useAdminCharities
 * @description Provides state management for the admin charity management page,
 * including paginated listing, filtering, and approve/reject/suspend/reinstate actions.
 * @returns {Object} Charity list state and action functions
 * @returns {AdminCharityListResult} returns.result - Current paginated charity list
 * @returns {boolean} returns.loading - Loading state for list fetches
 * @returns {boolean} returns.updating - Loading state for status updates
 * @returns {Function} returns.fetchCharities - Fetch charities with filters
 * @returns {Function} returns.approveCharity - Approve a pending charity
 * @returns {Function} returns.rejectCharity - Reject a charity with reason
 * @returns {Function} returns.suspendCharity - Suspend an approved charity
 * @returns {Function} returns.reinstateCharity - Reinstate a suspended charity
 */
export function useAdminCharities() {
  const [result, setResult] = useState<AdminCharityListResult>(INITIAL_RESULT);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const { showToast } = useToast();

  const fetchCharities = useCallback(
    async (filters: AdminCharityListFilters = {}) => {
      try {
        setLoading(true);
        const data = await listCharities(filters);
        setResult(data);
        return data;
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        showToast("error", `Failed to load charities: ${msg}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const performStatusUpdate = useCallback(
    async (
      input: AdminCharityStatusUpdateInput,
      successMessage: string,
      currentFilters: AdminCharityListFilters = {},
    ) => {
      try {
        setUpdating(true);
        const verificationId = await updateCharityStatus(input);
        if (verificationId === null) {
          showToast("error", "Status update failed. Please try again.");
          return false;
        }
        showToast("success", successMessage);
        // Refresh list to show updated status
        const data = await listCharities(currentFilters);
        setResult(data);
        return true;
      } catch (error) {
        showToast("error", "Status update failed. Please try again.");
        throw error;
      } finally {
        setUpdating(false);
      }
    },
    [showToast],
  );

  const approveCharity = useCallback(
    (
      charityId: string,
      reason?: string,
      currentFilters?: AdminCharityListFilters,
    ) => {
      const status: AdminCharityVerificationStatus = "verified";
      return performStatusUpdate(
        { charityId, newStatus: status, reason },
        "Charity approved successfully",
        currentFilters,
      );
    },
    [performStatusUpdate],
  );

  const rejectCharity = useCallback(
    (
      charityId: string,
      reason: string,
      currentFilters?: AdminCharityListFilters,
    ) => {
      const status: AdminCharityVerificationStatus = "rejected";
      return performStatusUpdate(
        { charityId, newStatus: status, reason },
        "Charity rejected",
        currentFilters,
      );
    },
    [performStatusUpdate],
  );

  const suspendCharity = useCallback(
    (
      charityId: string,
      reason: string,
      currentFilters?: AdminCharityListFilters,
    ) => {
      const status: AdminCharityVerificationStatus = "suspended";
      return performStatusUpdate(
        { charityId, newStatus: status, reason },
        "Charity suspended",
        currentFilters,
      );
    },
    [performStatusUpdate],
  );

  const reinstateCharity = useCallback(
    (
      charityId: string,
      reason?: string,
      currentFilters?: AdminCharityListFilters,
    ) => {
      const status: AdminCharityVerificationStatus = "verified";
      return performStatusUpdate(
        { charityId, newStatus: status, reason },
        "Charity reinstated successfully",
        currentFilters,
      );
    },
    [performStatusUpdate],
  );

  return {
    result,
    loading,
    updating,
    fetchCharities,
    approveCharity,
    rejectCharity,
    suspendCharity,
    reinstateCharity,
  };
}
