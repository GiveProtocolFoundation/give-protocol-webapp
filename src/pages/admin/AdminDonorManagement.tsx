import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAdminDonors } from "@/hooks/useAdminDonors";
import { logRead } from "@/services/adminAuditService";
import type {
  AdminDonorListItem,
  AdminDonorListFilters,
  DonorUserStatus,
} from "@/types/adminDonor";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Status badge pill for a donor's account status */
function StatusBadge({
  status,
}: {
  status: DonorUserStatus;
}): React.ReactElement {
  const styles: Record<string, string> = {
    active: "bg-green-100 text-green-800",
    suspended: "bg-yellow-100 text-yellow-800",
    banned: "bg-red-100 text-red-800",
  };
  const labels: Record<string, string> = {
    active: "Active",
    suspended: "Suspended",
    banned: "Banned",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600"}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

/** Action buttons for a single donor row */
function DonorActions({
  donor,
  onAction,
  disabled,
}: {
  donor: AdminDonorListItem;
  onAction: (_donor: AdminDonorListItem, _action: string) => void;
  disabled: boolean;
}): React.ReactElement {
  const { userStatus: s } = donor;

  const handleSuspend = useCallback(
    () => onAction(donor, "suspend"),
    [donor, onAction],
  );
  const handleReinstate = useCallback(
    () => onAction(donor, "reinstate"),
    [donor, onAction],
  );
  const handleBan = useCallback(
    () => onAction(donor, "ban"),
    [donor, onAction],
  );

  return (
    <div className="flex gap-2 flex-wrap">
      {s === "active" && (
        <>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleSuspend}
            disabled={disabled}
          >
            Suspend
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleBan}
            disabled={disabled}
          >
            Ban
          </Button>
        </>
      )}
      {s === "suspended" && (
        <>
          <Button
            size="sm"
            variant="primary"
            onClick={handleReinstate}
            disabled={disabled}
          >
            Reinstate
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={handleBan}
            disabled={disabled}
          >
            Ban
          </Button>
        </>
      )}
      {s === "banned" && (
        <Button
          size="sm"
          variant="primary"
          onClick={handleReinstate}
          disabled={disabled}
        >
          Reinstate
        </Button>
      )}
    </div>
  );
}

/** Filter bar: status dropdown + auth method dropdown + search input */
function FilterBar({
  filters,
  onStatusChange,
  onAuthMethodChange,
  onSearchChange,
}: {
  filters: AdminDonorListFilters;
  onStatusChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onAuthMethodChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.status ?? ""}
        onChange={onStatusChange}
        aria-label="Filter by status"
      >
        <option value="">All statuses</option>
        <option value="active">Active</option>
        <option value="suspended">Suspended</option>
        <option value="banned">Banned</option>
      </select>
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.authMethod ?? ""}
        onChange={onAuthMethodChange}
        aria-label="Filter by auth method"
      >
        <option value="">All auth methods</option>
        <option value="email">Email</option>
        <option value="wallet">Wallet</option>
      </select>
      <input
        type="text"
        placeholder="Search by email or wallet…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[240px]"
        defaultValue={filters.search ?? ""}
        onChange={onSearchChange}
        aria-label="Search donors"
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
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-500">
        Page {page} of {totalPages}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  suspend: "Suspend Donor",
  reinstate: "Reinstate Donor",
  ban: "Ban Donor",
};

const ACTION_REQUIRES_REASON: Record<string, boolean> = {
  suspend: true,
  reinstate: false,
  ban: true,
};

/** Confirmation modal for status actions */
function ActionModal({
  isOpen,
  donor,
  action,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  confirming,
}: {
  isOpen: boolean;
  donor: AdminDonorListItem | null;
  action: string;
  reason: string;
  onReasonChange: (_e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirming: boolean;
}): React.ReactElement | null {
  if (!donor) return null;
  const label = ACTION_LABELS[action] ?? "Confirm Action";
  const requiresReason = ACTION_REQUIRES_REASON[action] ?? false;
  const displayName = donor.displayName ?? donor.email ?? donor.userId;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={label}>
      <p className="text-sm text-gray-600 mb-4">
        {action === "ban" && "This will permanently ban "}
        {action === "suspend" && "This will temporarily suspend "}
        {action === "reinstate" && "This will reinstate "}
        <span className="font-semibold">{displayName}</span>.
      </p>
      {requiresReason && (
        <div className="mb-4">
          <label
            htmlFor="donor-action-reason"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Reason <span className="text-red-500">*</span>
          </label>
          <textarea
            id="donor-action-reason"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            rows={3}
            value={reason}
            onChange={onReasonChange}
            placeholder="Provide a reason for this action…"
          />
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={confirming}
        >
          Cancel
        </Button>
        <Button
          variant={action === "reinstate" ? "primary" : "danger"}
          size="sm"
          onClick={onConfirm}
          disabled={confirming || (requiresReason && reason.trim() === "")}
        >
          {confirming ? "Saving…" : (ACTION_LABELS[action] ?? "Confirm")}
        </Button>
      </div>
    </Modal>
  );
}

/** A single donor table row */
function DonorRow({
  donor,
  onAction,
  updating,
}: {
  donor: AdminDonorListItem;
  onAction: (_donor: AdminDonorListItem, _action: string) => void;
  updating: boolean;
}): React.ReactElement {
  const formattedDate = new Date(donor.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const totalUsd = (donor.totalCryptoUsd + donor.totalFiatUsd).toFixed(2);

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        <div>{donor.displayName ?? "—"}</div>
        <div className="text-xs text-gray-400">
          {donor.email ?? donor.walletAddress ?? "—"}
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500">
        {donor.primaryAuthMethod}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={donor.userStatus} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">${totalUsd}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{donor.donationCount}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formattedDate}</td>
      <td className="px-4 py-3">
        <DonorActions donor={donor} onAction={onAction} disabled={updating} />
      </td>
    </tr>
  );
}

/** Donor list table with header and rows */
function DonorTable({
  donors,
  onAction,
  updating,
}: {
  donors: AdminDonorListItem[];
  onAction: (_donor: AdminDonorListItem, _action: string) => void;
  updating: boolean;
}): React.ReactElement {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <caption className="sr-only">Donor management list</caption>
        <thead>
          <tr className="bg-gray-50">
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Donor
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Auth
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Status
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Total Donated
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Donations
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Joined
            </th>
            <th
              scope="col"
              className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
            >
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {donors.map((donor) => (
            <DonorRow
              key={donor.userId}
              donor={donor}
              onAction={onAction}
              updating={updating}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Admin donor management page: list all donors with filters, pagination,
 * and suspend/reinstate/ban actions backed by the admin audit trail.
 */
const AdminDonorManagement: React.FC = () => {
  const {
    result,
    loading,
    updating,
    fetchDonors,
    suspendDonor,
    reinstateDonor,
    banDonor,
  } = useAdminDonors();

  const [filters, setFilters] = useState<AdminDonorListFilters>({
    page: 1,
    limit: 50,
  });

  // Modal state
  const [actionDonor, setActionDonor] = useState<AdminDonorListItem | null>(
    null,
  );
  const [currentAction, setCurrentAction] = useState("");
  const [reason, setReason] = useState("");

  // Audit: active filter keys for PII access logging
  const serializedFilterKeys = useMemo(() => {
    const keys = Object.keys(filters)
      .filter(
        (k) =>
          k !== "page" &&
          k !== "limit" &&
          filters[k as keyof AdminDonorListFilters] !== undefined,
      )
      .sort();
    return JSON.stringify(keys);
  }, [filters]);

  useEffect(() => {
    fetchDonors(filters);
  }, [fetchDonors, filters]);

  // Audit: log list view on page/filter change
  useEffect(() => {
    const filterKeys = JSON.parse(serializedFilterKeys) as string[];
    logRead("user", null, {
      page: filters.page,
      limit: filters.limit,
      filterKeys: filterKeys.length > 0 ? filterKeys : undefined,
    });
  }, [filters.page, filters.limit, serializedFilterKeys]);

  const handleAction = useCallback(
    (donor: AdminDonorListItem, action: string) => {
      setActionDonor(donor);
      setCurrentAction(action);
      setReason("");
      logRead("user", donor.userId);
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setActionDonor(null);
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
        status: value !== "" ? (value as DonorUserStatus) : undefined,
      }));
    },
    [],
  );

  const handleAuthMethodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setFilters((prev) => ({
        ...prev,
        page: 1,
        authMethod: value !== "" ? (value as "email" | "wallet") : undefined,
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
    if (!actionDonor) return;
    const id = actionDonor.userId;
    const trimmedReason = reason.trim() !== "" ? reason.trim() : undefined;

    let success = false;
    switch (currentAction) {
      case "suspend":
        success = Boolean(await suspendDonor(id, reason.trim(), filters));
        break;
      case "reinstate":
        success = Boolean(await reinstateDonor(id, trimmedReason, filters));
        break;
      case "ban":
        success = Boolean(await banDonor(id, reason.trim(), filters));
        break;
      default:
        break;
    }

    if (success) {
      handleCloseModal();
    }
  }, [
    actionDonor,
    currentAction,
    reason,
    filters,
    suspendDonor,
    reinstateDonor,
    banDonor,
    handleCloseModal,
  ]);

  if (loading && result.donors.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Donor Management</h1>
        <span className="text-sm text-gray-500">{result.totalCount} total</span>
      </div>

      <Card className="p-6">
        <FilterBar
          filters={filters}
          onStatusChange={handleStatusChange}
          onAuthMethodChange={handleAuthMethodChange}
          onSearchChange={handleSearchChange}
        />

        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )}

        {!loading && result.donors.length === 0 && (
          <p className="text-center py-8 text-gray-500">
            No donors found matching your filters.
          </p>
        )}

        {!loading && result.donors.length > 0 && (
          <DonorTable
            donors={result.donors}
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
        isOpen={actionDonor !== null}
        donor={actionDonor}
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

export default AdminDonorManagement;
