import { useState, useEffect, useCallback } from "react";
import {
  getTeosStatus,
  getOfficerVerifications,
  getTeosVerificationSummary,
} from "@/services/teosVerificationService";
import type {
  TeosStatus,
  OfficerVerification,
  TeosVerificationSummary,
} from "@/types/teosVerification";

/**
 * Hook to fetch TEOS exempt status for a given EIN.
 *
 * @param ein - The Employer Identification Number (pass null/empty to skip)
 * @returns Object with teosStatus, loading state, error, and refetch function
 */
export function useTeosStatus(ein: string | null) {
  const [teosStatus, setTeosStatus] = useState<TeosStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!ein) {
      setTeosStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTeosStatus(ein);
      setTeosStatus(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch TEOS status");
    } finally {
      setLoading(false);
    }
  }, [ein]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return { teosStatus, loading, error, refetch: fetchStatus };
}

/**
 * Hook to fetch PPA v1.1 officer verifications for a given EIN.
 *
 * @param ein - The Employer Identification Number (pass null/empty to skip)
 * @returns Object with verifications array, loading state, error, and refetch function
 */
export function useOfficerVerifications(ein: string | null) {
  const [verifications, setVerifications] = useState<OfficerVerification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVerifications = useCallback(async () => {
    if (!ein) {
      setVerifications([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getOfficerVerifications(ein);
      setVerifications(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch officer verifications",
      );
    } finally {
      setLoading(false);
    }
  }, [ein]);

  useEffect(() => {
    fetchVerifications();
  }, [fetchVerifications]);

  return { verifications, loading, error, refetch: fetchVerifications };
}

/**
 * Hook to fetch a combined TEOS verification summary for a charity.
 * Includes TEOS exempt status, officer verifications, and last refresh info.
 *
 * @param ein - The Employer Identification Number (pass null/empty to skip)
 * @returns Object with summary, loading state, error, and refetch function
 */
export function useTeosVerificationSummary(ein: string | null) {
  const [summary, setSummary] = useState<TeosVerificationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = useCallback(async () => {
    if (!ein) {
      setSummary(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await getTeosVerificationSummary(ein);
      setSummary(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch TEOS verification summary",
      );
    } finally {
      setLoading(false);
    }
  }, [ein]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { summary, loading, error, refetch: fetchSummary };
}
