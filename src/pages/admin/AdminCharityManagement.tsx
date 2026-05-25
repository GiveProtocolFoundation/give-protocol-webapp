import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminCharities } from "@/hooks/useAdminCharities";
import type {
  AdminCharityListItem,
  AdminCharityListFilters,
  AdminCharityVerificationStatus,
} from "@/types/adminCharity";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Status badge pill for a charity's verification status */
function StatusBadge({
  status,
}: {
  status: AdminCharityVerificationStatus;
}): React.ReactElement {
  const { t } = useTranslation();
  const styles: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    verified: "bg-green-100 text-green-800",
    approved: "bg-green-100 text-green-800",
    rejected: "bg-red-100 text-red-800",
    suspended: "bg-gray-100 text-gray-700",
  };
  const labels: Record<string, string> = {
    pending: t("admin.charity.statusPending", "Pending"),
    verified: t("admin.charity.statusVerified", "Verified"),
    approved: t("admin.charity.statusApproved", "Approved"),
    rejected: t("admin.charity.statusRejected", "Rejected"),
    suspended: t("admin.charity.statusSuspended", "Suspended"),
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

/** Wallet address badge for admin charity list */
function WalletBadge({
  address,
}: {
  address: string | null;
}): React.ReactElement {
  const { t } = useTranslation();
  if (address) {
    return (
      <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
        {`${address.slice(0, 6)}\u2026${address.slice(-4)}`}
      </span>
    );
  }
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
      {t("admin.charity.walletNotSet", "Not set")}
    </span>
  );
}

/** Action buttons row for a single charity row */
function CharityActions({
  charity,
  onAction,
  disabled,
}: {
  charity: AdminCharityListItem;
  onAction: (_charity: AdminCharityListItem, _action: string) => void;
  disabled: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  const { verificationStatus: s } = charity;

  const handleApprove = useCallback(
    () => onAction(charity, "approve"),
    [charity, onAction],
  );
  const handleReject = useCallback(
    () => onAction(charity, "reject"),
    [charity, onAction],
  );
  const handleSuspend = useCallback(
    () => onAction(charity, "suspend"),
    [charity, onAction],
  );
  const handleReinstate = useCallback(
    () => onAction(charity, "reinstate"),
    [charity, onAction],
  );

  return (
    <div className="flex gap-2 flex-wrap">
      {s === "pending" && (
        <>
          <Button
            size="sm"
            variant="primary"
            onClick={handleApprove}
            disabled={disabled}
          >
            {t("admin.charity.approve", "Approve")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleReject}
            disabled={disabled}
          >
            {t("admin.charity.reject", "Reject")}
          </Button>
        </>
      )}
      {(s === "verified" || s === "approved") && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleSuspend}
          disabled={disabled}
        >
          {t("admin.charity.suspend", "Suspend")}
        </Button>
      )}
      {s === "suspended" && (
        <Button
          size="sm"
          variant="primary"
          onClick={handleReinstate}
          disabled={disabled}
        >
          {t("admin.charity.reinstate", "Reinstate")}
        </Button>
      )}
      {s === "rejected" && (
        <Button
          size="sm"
          variant="primary"
          onClick={handleApprove}
          disabled={disabled}
        >
          {t("admin.charity.approve", "Approve")}
        </Button>
      )}
    </div>
  );
}

/** Filter bar: status dropdown + search input */
function FilterBar({
  filters,
  onStatusChange,
  onSearchChange,
}: {
  filters: AdminCharityListFilters;
  onStatusChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.status ?? ""}
        onChange={onStatusChange}
        aria-label="Filter by status"
      >
        <option value="">
          {t("admin.charity.allStatuses", "All statuses")}
        </option>
        <option value="pending">
          {t("admin.charity.statusPending", "Pending")}
        </option>
        <option value="verified">
          {t("admin.charity.statusVerified", "Verified")}
        </option>
        <option value="rejected">
          {t("admin.charity.statusRejected", "Rejected")}
        </option>
        <option value="suspended">
          {t("admin.charity.statusSuspended", "Suspended")}
        </option>
      </select>
      <input
        type="text"
        placeholder={t(
          "admin.charity.searchPlaceholder",
          "Search by name\u2026",
        )}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.search ?? ""}
        onChange={onSearchChange}
        aria-label="Search charities"
      />
    </div>
  );
}

/** Pagination controls */
function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}): React.ReactElement | null {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6">
      <Button
        size="sm"
        variant="secondary"
        onClick={onPrev}
        disabled={page <= 1}
      >
        {t("common.previous", "Previous")}
      </Button>
      <span className="text-sm text-gray-600">
        {t("common.pageOfTotal", "Page {{page}} of {{total}}", {
          page,
          total: totalPages,
        })}
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        {t("common.next", "Next")}
      </Button>
    </div>
  );
}

/** Confirmation modal body for approve/reject/suspend/reinstate */
function ActionModal({
  isOpen,
  charity,
  action,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  confirming,
}: {
  isOpen: boolean;
  charity: AdminCharityListItem | null;
  action: string;
  reason: string;
  onReasonChange: (_e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirming: boolean;
}): React.ReactElement | null {
  const { t } = useTranslation();
  if (!charity) return null;

  const ACTION_LABELS: Record<string, string> = {
    approve: t("admin.charity.approveTitle", "Approve Charity"),
    reject: t("admin.charity.rejectTitle", "Reject Charity"),
    suspend: t("admin.charity.suspendTitle", "Suspend Charity"),
    reinstate: t("admin.charity.reinstateTitle", "Reinstate Charity"),
  };

  const REASON_REQUIRED = action === "reject" || action === "suspend";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        ACTION_LABELS[action] ??
        t("admin.charity.confirmAction", "Confirm Action")
      }
      size="md"
    >
      <p className="text-sm text-gray-600 mb-4">
        {action === "approve" && (
          <>
            Are you sure you want to <strong>approve</strong>{" "}
            <em>{charity.name}</em>?
          </>
        )}
        {action === "reject" && (
          <>
            Are you sure you want to <strong>reject</strong>{" "}
            <em>{charity.name}</em>? Provide a reason below.
          </>
        )}
        {action === "suspend" && (
          <>
            Are you sure you want to <strong>suspend</strong>{" "}
            <em>{charity.name}</em>? Provide a reason below.
          </>
        )}
        {action === "reinstate" && (
          <>
            Are you sure you want to <strong>reinstate</strong>{" "}
            <em>{charity.name}</em>?
          </>
        )}
      </p>
      <textarea
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y min-h-[80px]"
        placeholder={
          REASON_REQUIRED
            ? t("admin.charity.reasonRequired", "Reason (required)")
            : t("admin.charity.reasonOptional", "Reason (optional)")
        }
        value={reason}
        onChange={onReasonChange}
        aria-label="Reason"
      />
      <div className="flex gap-3 justify-end">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={confirming}
        >
          {t("common.cancel", "Cancel")}
        </Button>
        <Button
          variant={
            action === "reject" || action === "suspend" ? "danger" : "primary"
          }
          size="sm"
          onClick={onConfirm}
          disabled={
            confirming || (REASON_REQUIRED && reason.trim().length === 0)
          }
        >
          {confirming
            ? t("admin.charity.saving", "Saving\u2026")
            : (ACTION_LABELS[action] ?? t("admin.charity.confirm", "Confirm"))}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Charity table ────────────────────────────────────────────────────────────

/** Charity list table with header and rows */
function CharityTable({
  charities,
  onAction,
  updating,
}: {
  charities: AdminCharityListItem[];
  onAction: (_charity: AdminCharityListItem, _action: string) => void;
  updating: boolean;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <table className="w-full text-left overflow-x-auto">
      <thead>
        <tr className="bg-gray-50">
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("admin.charity.colName", "Name")}
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("admin.charity.colCategory", "Category")}
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("admin.charity.colStatus", "Status")}
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("admin.charity.colJoined", "Joined")}
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("admin.charity.colWallet", "Wallet")}
          </th>
          <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {t("admin.charity.colActions", "Actions")}
          </th>
        </tr>
      </thead>
      <tbody>
        {charities.map((charity) => (
          <CharityRow
            key={charity.id}
            charity={charity}
            onAction={onAction}
            updating={updating}
          />
        ))}
      </tbody>
    </table>
  );
}

// ─── Charity row ──────────────────────────────────────────────────────────────

/**
 * Renders a single charity row in the admin charity management table with action buttons.
 * @param props - Component props.
 * @param props.charity - The charity record being displayed.
 * @param props.onAction - Callback invoked with the charity and the requested action identifier.
 * @param props.updating - When `true`, disables action buttons while a mutation is in flight.
 * @returns The charity row element.
 */
function CharityRow({
  charity,
  onAction,
  updating,
}: {
  charity: AdminCharityListItem;
  onAction: (_charity: AdminCharityListItem, _action: string) => void;
  updating: boolean;
}): React.ReactElement {
  const formattedDate = new Date(charity.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {charity.name}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {charity.category ?? "—"}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={charity.verificationStatus} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formattedDate}</td>
      <td className="px-4 py-3">
        <WalletBadge address={charity.walletAddress} />
      </td>
      <td className="px-4 py-3">
        <CharityActions
          charity={charity}
          onAction={onAction}
          disabled={updating}
        />
      </td>
    </tr>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Admin charity management page: list all charities with filters, pagination,
 * and approve/reject/suspend/reinstate actions backed by the admin audit trail.
 */
const AdminCharityManagement: React.FC = () => {
  const { t } = useTranslation();
  const {
    result,
    loading,
    updating,
    fetchCharities,
    approveCharity,
    rejectCharity,
    suspendCharity,
    reinstateCharity,
  } = useAdminCharities();
  const [filters, setFilters] = useState<AdminCharityListFilters>({
    page: 1,
    limit: 50,
  });

  // Modal state
  const [actionCharity, setActionCharity] =
    useState<AdminCharityListItem | null>(null);
  const [currentAction, setCurrentAction] = useState("");
  const [reason, setReason] = useState("");

  useEffect(() => {
    fetchCharities(filters);
  }, [fetchCharities, filters]);

  const handleAction = useCallback(
    (charity: AdminCharityListItem, action: string) => {
      setActionCharity(charity);
      setCurrentAction(action);
      setReason("");
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setActionCharity(null);
    setCurrentAction("");
    setReason("");
  }, []);

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReason(e.target.value);
    },
    [],
  );

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setFilters((prev) => ({
        ...prev,
        page: 1,
        status:
          value !== "" ? (value as AdminCharityVerificationStatus) : undefined,
      }));
    },
    [],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFilters((prev) => ({
        ...prev,
        page: 1,
        search: value !== "" ? value : undefined,
      }));
    },
    [],
  );

  const handlePrevPage = useCallback(() => {
    setFilters((prev) => ({
      ...prev,
      page: Math.max(1, (prev.page ?? 1) - 1),
    }));
  }, []);

  const handleNextPage = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }));
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!actionCharity) return;
    const id = actionCharity.id;
    const trimmedReason = reason.trim() !== "" ? reason.trim() : undefined;

    let success = false;
    switch (currentAction) {
      case "approve":
        success = Boolean(await approveCharity(id, trimmedReason, filters));
        break;
      case "reject":
        success = Boolean(await rejectCharity(id, reason.trim(), filters));
        break;
      case "suspend":
        success = Boolean(await suspendCharity(id, reason.trim(), filters));
        break;
      case "reinstate":
        success = Boolean(await reinstateCharity(id, trimmedReason, filters));
        break;
      default:
        break;
    }

    if (success) {
      handleCloseModal();
    }
  }, [
    actionCharity,
    currentAction,
    reason,
    filters,
    approveCharity,
    rejectCharity,
    suspendCharity,
    reinstateCharity,
    handleCloseModal,
  ]);

  if (loading && result.charities.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">
          {t("admin.charity.title", "Charity Management")}
        </h1>
        <span className="text-sm text-gray-500">
          {t("admin.charity.totalCount", "{{count}} total", {
            count: result.totalCount,
          })}
        </span>
      </div>

      <Card className="p-6">
        <FilterBar
          filters={filters}
          onStatusChange={handleStatusChange}
          onSearchChange={handleSearchChange}
        />

        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )}

        {!loading && result.charities.length === 0 && (
          <p className="text-center py-8 text-gray-500">
            {t(
              "admin.charity.noResults",
              "No charities found matching your filters.",
            )}
          </p>
        )}

        {!loading && result.charities.length > 0 && (
          <CharityTable
            charities={result.charities}
            onAction={handleAction}
            updating={updating}
          />
        )}

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
        />
      </Card>

      <ActionModal
        isOpen={actionCharity !== null}
        charity={actionCharity}
        action={currentAction}
        reason={reason}
        onReasonChange={handleReasonChange}
        onConfirm={handleConfirm}
        onClose={handleCloseModal}
        confirming={updating}
      />
    </div>
  );
};

export default AdminCharityManagement;
