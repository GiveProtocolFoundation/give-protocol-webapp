import { useCallback, useState } from "react";
import { useToast } from "../contexts/ToastContext";
import {
  getSuspiciousPatterns,
  getValidationStats,
  listValidationRequests,
  overrideValidation,
} from "../services/adminVolunteerValidationService";
import type {
  AdminOverrideValidationInput,
  AdminSuspiciousVolunteerPattern,
  AdminValidationRequestFilters,
  AdminValidationRequestResult,
  AdminValidationStats,
  VolunteerHoursEmailContext,
} from "../types/adminVolunteerValidation";

const INITIAL_RESULT: AdminValidationRequestResult = {
  requests: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Hook for admin volunteer validation oversight: stats, listing, overrides, and abuse detection.
 * @function useAdminVolunteerValidation
 * @description Provides state management for the admin volunteer validation page,
 * including pipeline statistics, paginated request listing, admin overrides, and
 * suspicious pattern detection.
 * @returns {Object} Validation oversight state and action functions
 * @returns {AdminValidationStats | null} returns.stats - Current pipeline statistics
 * @returns {boolean} returns.statsLoading - Loading state for stats fetch
 * @returns {AdminValidationRequestResult} returns.result - Current paginated request list
 * @returns {boolean} returns.loading - Loading state for list fetches
 * @returns {boolean} returns.overriding - Loading state for override actions
 * @returns {AdminSuspiciousVolunteerPattern[]} returns.suspiciousPatterns - Suspicious volunteer patterns
 * @returns {boolean} returns.patternsLoading - Loading state for patterns fetch
 * @returns {Function} returns.fetchStats - Fetch pipeline statistics
 * @returns {Function} returns.fetchRequests - Fetch validation requests with filters
 * @returns {Function} returns.submitOverride - Override a validation request status
 * @returns {Function} returns.fetchSuspiciousPatterns - Fetch suspicious volunteer patterns
 */
export function useAdminVolunteerValidation() {
  const [stats, setStats] = useState<AdminValidationStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [result, setResult] =
    useState<AdminValidationRequestResult>(INITIAL_RESULT);
  const [loading, setLoading] = useState(false);
  const [overriding, setOverriding] = useState(false);
  const [suspiciousPatterns, setSuspiciousPatterns] = useState<
    AdminSuspiciousVolunteerPattern[]
  >([]);
  const [patternsLoading, setPatternsLoading] = useState(false);
  const { showToast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getValidationStats();
      setStats(data);
      return data;
    } catch (error) {
      showToast("error", "Failed to load validation statistics");
      throw error;
    } finally {
      setStatsLoading(false);
    }
  }, [showToast]);

  const fetchRequests = useCallback(
    async (filters: AdminValidationRequestFilters = {}) => {
      try {
        setLoading(true);
        const data = await listValidationRequests(filters);
        setResult(data);
        return data;
      } catch (error) {
        showToast("error", "Failed to load validation requests");
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [showToast],
  );

  const submitOverride = useCallback(
    async (
      input: AdminOverrideValidationInput,
      currentFilters: AdminValidationRequestFilters = {},
      emailContext?: VolunteerHoursEmailContext,
    ) => {
      try {
        setOverriding(true);
        const success = await overrideValidation(input, emailContext);
        if (!success) {
          showToast(
            "error",
            "Failed to override validation. Please try again.",
          );
          return false;
        }
        showToast("success", "Validation status overridden");
        const data = await listValidationRequests(currentFilters);
        setResult(data);
        return true;
      } catch (error) {
        showToast("error", "Failed to override validation. Please try again.");
        throw error;
      } finally {
        setOverriding(false);
      }
    },
    [showToast],
  );

  const fetchSuspiciousPatterns = useCallback(async () => {
    try {
      setPatternsLoading(true);
      const data = await getSuspiciousPatterns();
      setSuspiciousPatterns(data);
      return data;
    } catch (error) {
      showToast("error", "Failed to load suspicious patterns");
      throw error;
    } finally {
      setPatternsLoading(false);
    }
  }, [showToast]);

  return {
    stats,
    statsLoading,
    result,
    loading,
    overriding,
    suspiciousPatterns,
    patternsLoading,
    fetchStats,
    fetchRequests,
    submitOverride,
    fetchSuspiciousPatterns,
  };
}
