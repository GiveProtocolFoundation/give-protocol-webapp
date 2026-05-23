import { useState } from "react";
import { useToast } from "../contexts/ToastContext";
import { supabase } from "../lib/supabase";
import { useProfile } from "./useProfile";

interface _CharityVerification {
  id: string;
  charity_id: string;
  status: "pending" | "approved" | "rejected";
  documents: Array<{
    type: string;
    url: string;
  }>;
}

/**
 * Admin panel management hook for charity verification operations
 * @function useAdminPanel
 * @description Provides administrative functionality for managing charity verifications including fetching pending
 * verifications and updating their status. Includes comprehensive error handling and toast notifications for admin actions.
 * @returns {Object} Admin panel utilities and state
 * @returns {Function} returns.fetchPendingVerifications - Fetch pending charity verifications: () => Promise<CharityVerification[]>
 * @returns {Function} returns.updateVerificationStatus - Update verification status: (id: string, status: 'approved' | 'rejected', reason?: string) => Promise<void>
 * @returns {boolean} returns.loading - Loading state for admin operations
 * @example
 * ```tsx
 * const { fetchPendingVerifications, updateVerificationStatus, loading } = useAdminPanel();
 *
 * useEffect(() => {
 *   const loadVerifications = async () => {
 *     try {
 *       const verifications = await fetchPendingVerifications();
 *       setVerifications(verifications);
 *     } catch (error) {
 *       // Error handling is done in the hook with toast notifications
 *     }
 *   };
 *   loadVerifications();
 * }, []);
 *
 * const handleApprove = async (verificationId: string) => {
 *   await updateVerificationStatus(verificationId, 'approved');
 * };
 *
 * const handleReject = async (verificationId: string, reason: string) => {
 *   await updateVerificationStatus(verificationId, 'rejected', reason);
 * };
 * ```
 */
export function useAdminPanel() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const { profile } = useProfile();

  /**
   * Fetches all pending charity verification requests.
   * @returns Promise resolving to an array of pending verification records
   */
  const fetchPendingVerifications = async () => {
    if (!profile?.id) return [];

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("charity_verifications")
        .select(
          `
          id,
          charity_id,
          status,
          charity_documents (
            document_type,
            document_url
          )
        `,
        )
        .eq("status", "pending");

      if (error) throw error;
      return data;
    } catch (error) {
      showToast("error", "Failed to fetch verifications");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Updates the approval status of a charity verification.
   * @param verificationId - ID of the verification record
   * @param status - New status: approved or rejected
   * @param reason - Optional reason for the decision
   * @returns Promise that resolves on successful update
   */
  const updateVerificationStatus = async (
    verificationId: string,
    status: "approved" | "rejected",
    reason?: string,
  ) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("charity_verifications")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          review_notes: reason,
        })
        .eq("id", verificationId);

      if (error) throw error;
      showToast("success", `Verification ${status} successfully`);
    } catch (error) {
      showToast("error", "Failed to update verification status");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    fetchPendingVerifications,
    updateVerificationStatus,
    loading,
  };
}
