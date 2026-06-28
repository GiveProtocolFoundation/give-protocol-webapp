import { useState, useCallback, useEffect } from "react";
import { useProfile } from "@/hooks/useProfile";
import { useToast } from "@/contexts/ToastContext";
import {
  ValidationQueueItem,
  RejectionReason,
} from "@/types/selfReportedHours";
import {
  getOrganizationValidationQueue,
  getValidationQueueCount,
  processValidationResponse,
  batchApproveRequests,
  batchRejectRequests,
} from "@/services/validationRequestService";
import { Logger } from "@/utils/logger";

interface UseValidationQueueReturn {
  queue: ValidationQueueItem[];
  queueCount: number;
  loading: boolean;
  error: string | null;
  selectedIds: Set<string>;
  approveRequest: (_requestId: string) => Promise<boolean>;
  rejectRequest: (
    _requestId: string,
    _reason: RejectionReason,
    _notes?: string,
  ) => Promise<boolean>;
  batchApprove: () => Promise<void>;
  batchReject: (_reason: RejectionReason, _notes?: string) => Promise<void>;
  toggleSelection: (_requestId: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refetch: () => Promise<void>;
}

/**
 * Hook for managing the organization's validation queue
 * @returns Object with queue data and management functions
 */
export function useValidationQueue(): UseValidationQueueReturn {
  const { profile } = useProfile();
  const { showToast } = useToast();

  const [queue, setQueue] = useState<ValidationQueueItem[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const fetchQueue = useCallback(async () => {
    if (!profile?.id) {
      setQueue([]);
      setQueueCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [queueData, count] = await Promise.all([
        getOrganizationValidationQueue(profile.id),
        getValidationQueueCount(profile.id),
      ]);

      setQueue(queueData);
      setQueueCount(count);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch validation queue";
      setError(message);
      Logger.error("Error fetching validation queue", {
        error: err,
        profileId: profile.id,
      });
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const approveRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (!profile?.user_id) {
        showToast("error", "Error", "You must be logged in");
        return false;
      }

      try {
        await processValidationResponse(
          { requestId, approved: true },
          profile.user_id,
        );
        showToast(
          "success",
          "Approved",
          "Volunteer hours validated successfully",
        );
        await fetchQueue();
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to approve";
        showToast("error", "Error", message);
        return false;
      }
    },
    [profile?.user_id, showToast, fetchQueue],
  );

  const rejectRequest = useCallback(
    async (
      requestId: string,
      reason: RejectionReason,
      notes?: string,
    ): Promise<boolean> => {
      if (!profile?.user_id) {
        showToast("error", "Error", "You must be logged in");
        return false;
      }

      try {
        await processValidationResponse(
          {
            requestId,
            approved: false,
            rejectionReason: reason,
            rejectionNotes: notes,
          },
          profile.user_id,
        );
        showToast("success", "Rejected", "Validation request rejected");
        await fetchQueue();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to reject";
        showToast("error", "Error", message);
        return false;
      }
    },
    [profile?.user_id, showToast, fetchQueue],
  );

  const batchApprove = useCallback(async (): Promise<void> => {
    if (!profile?.user_id || selectedIds.size === 0) {
      return;
    }

    try {
      const results = await batchApproveRequests(
        Array.from(selectedIds),
        profile.user_id,
      );

      const successCount = results.success.length;
      const failedCount = results.failed.length;

      if (failedCount === 0) {
        showToast(
          "success",
          "Batch Complete",
          `Approved ${successCount} requests`,
        );
      } else {
        showToast(
          "warning",
          "Partial Success",
          `Approved ${successCount}, failed ${failedCount}`,
        );
      }

      setSelectedIds(new Set());
      await fetchQueue();
    } catch (_err) {
      showToast("error", "Error", "Batch approval failed");
    }
  }, [profile?.user_id, selectedIds, showToast, fetchQueue]);

  const batchReject = useCallback(
    async (reason: RejectionReason, notes?: string): Promise<void> => {
      if (!profile?.user_id || selectedIds.size === 0) {
        return;
      }

      try {
        const results = await batchRejectRequests(
          Array.from(selectedIds),
          profile.user_id,
          reason,
          notes,
        );

        const successCount = results.success.length;
        const failedCount = results.failed.length;

        if (failedCount === 0) {
          showToast(
            "success",
            "Batch Complete",
            `Rejected ${successCount} requests`,
          );
        } else {
          showToast(
            "warning",
            "Partial Success",
            `Rejected ${successCount}, failed ${failedCount}`,
          );
        }

        setSelectedIds(new Set());
        await fetchQueue();
      } catch (_err) {
        showToast("error", "Error", "Batch rejection failed");
      }
    },
    [profile?.user_id, selectedIds, showToast, fetchQueue],
  );

  const toggleSelection = useCallback((requestId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        next.add(requestId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(queue.map((item) => item.requestId)));
  }, [queue]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  return {
    queue,
    queueCount,
    loading,
    error,
    selectedIds,
    approveRequest,
    rejectRequest,
    batchApprove,
    batchReject,
    toggleSelection,
    selectAll,
    clearSelection,
    refetch: fetchQueue,
  };
}
