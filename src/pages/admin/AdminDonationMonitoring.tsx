import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAdminDonations } from "@/hooks/useAdminDonations";
import { logRead } from "@/services/adminAuditService";
import type {
  AdminDonationListFilters,
  AdminDonationListItem,
  AdminDonationSummaryRow,
  DonationPaymentMethod,
} from "@/types/adminDonation";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Badge for payment method (crypto / fiat) */
function PaymentBadge({
  method,
}: {
  method: DonationPaymentMethod;
}): React.ReactElement {
  const styles: Record<string, string> = {
    crypto: "bg-purple-100 text-purple-800",
    fiat: "bg-blue-100 text-blue-800",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${styles[method] ?? "bg-gray-100 text-gray-600"}`}
    >
      {method}
    </span>
  );
}

/** Red "Flagged" badge */
function FlaggedBadge(): React.ReactElement {
  return (
    <span className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-red-100 text-red-800">
      Flagged
    </span>
  );
}

/** Filter bar for the donation list */
function FilterBar({
  filters,
  onPaymentMethodChange,
  onSearchChange,
  onFlaggedChange,
}: {
  filters: AdminDonationListFilters;
  onPaymentMethodChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onFlaggedChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.ReactElement {
  let flaggedSelectValue: string;
  if (filters.flagged === true) {
    flaggedSelectValue = "true";
  } else if (filters.flagged === false) {
    flaggedSelectValue = "false";
  } else {
    flaggedSelectValue = "";
  }

  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.paymentMethod ?? ""}
        onChange={onPaymentMethodChange}
        aria-label="Filter by payment method"
      >
        <option value="">All methods</option>
        <option value="crypto">Crypto</option>
        <option value="fiat">Fiat</option>
      </select>
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={flaggedSelectValue}
        onChange={onFlaggedChange}
        aria-label="Filter by flag status"
      >
        <option value="">All donations</option>
        <option value="true">Flagged only</option>
        <option value="false">Not flagged</option>
      </select>
      <input
        type="text"
        placeholder="Search donor, charity, tx hash…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[260px]"
        defaultValue={filters.search ?? ""}
        onChange={onSearchChange}
        aria-label="Search donations"
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

/** Action buttons for a single donation row */
function DonationActions({
  donation,
  onFlag,
  disabled,
}: {
  donation: AdminDonationListItem;
  onFlag: (_donation: AdminDonationListItem) => void;
  disabled: boolean;
}): React.ReactElement {
  const handleFlag = useCallback(() => onFlag(donation), [donation, onFlag]);

  if (donation.isFlagged) {
    const flagPlural = donation.openFlagCount > 1 ? "s" : "";
    return (
      <span className="text-xs text-gray-400 italic">
        {donation.openFlagCount > 0
          ? `${donation.openFlagCount} open flag${flagPlural}`
          : "Resolved"}
      </span>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleFlag}
      disabled={disabled}
    >
      Flag
    </Button>
  );
}

/** A single donation table row */
function DonationRow({
  donation,
  onFlag,
  flagging,
}: {
  donation: AdminDonationListItem;
  onFlag: (_donation: AdminDonationListItem) => void;
  flagging: boolean;
}): React.ReactElement {
  const formattedDate = new Date(donation.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    },
  );

  const donorLabel =
    donation.donorDisplayName ??
    donation.donorEmail ??
    donation.donorUserId ??
    "Anonymous";

  let txRef: string;
  if (donation.txHash) {
    txRef = `${donation.txHash.slice(0, 8)}…`;
  } else if (donation.processorId) {
    txRef = donation.processorId;
  } else {
    txRef = "—";
  }

  const amountUsdLabel =
    donation.amountUsd !== null ? `$${donation.amountUsd.toFixed(2)}` : "—";

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3">
        <PaymentBadge method={donation.paymentMethod} />
      </td>
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {amountUsdLabel}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        <div>{donorLabel}</div>
        {donation.donorEmail && donation.donorDisplayName && (
          <div className="text-xs text-gray-400">{donation.donorEmail}</div>
        )}
      </td>
      <td className="px-4 py-3 text-sm text-gray-700">
        {donation.charityName ?? donation.charityId}
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{txRef}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{formattedDate}</td>
      <td className="px-4 py-3">{donation.isFlagged && <FlaggedBadge />}</td>
      <td className="px-4 py-3">
        <DonationActions
          donation={donation}
          onFlag={onFlag}
          disabled={flagging}
        />
      </td>
    </tr>
  );
}

/** Modal for flagging a donation */
function FlagModal({
  isOpen,
  donation,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  confirming,
}: {
  isOpen: boolean;
  donation: AdminDonationListItem | null;
  reason: string;
  onReasonChange: (_e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirming: boolean;
}): React.ReactElement | null {
  if (!donation) return null;

  const label = donation.donorDisplayName ?? donation.donorEmail ?? donation.id;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Flag Donation for Review">
      <p className="text-sm text-gray-600 mb-4">
        Flag the donation from <span className="font-semibold">{label}</span>{" "}
        for admin review.
      </p>
      <div className="mb-4">
        <label
          htmlFor="flag-reason"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          id="flag-reason"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          rows={3}
          value={reason}
          onChange={onReasonChange}
          placeholder="Describe why this donation is suspicious…"
        />
      </div>
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
          variant="danger"
          size="sm"
          onClick={onConfirm}
          disabled={confirming || reason.trim() === ""}
        >
          {confirming ? "Saving…" : "Flag Donation"}
        </Button>
      </div>
    </Modal>
  );
}

/** Summary report table showing grouped donation aggregates */
function SummaryTable({
  summary,
}: {
  summary: AdminDonationSummaryRow[];
}): React.ReactElement {
  return (
    <table className="w-full text-left text-sm">
      <caption className="sr-only">Donation summary by group</caption>
      <thead>
        <tr className="bg-gray-50">
          <th
            scope="col"
            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Group
          </th>
          <th
            scope="col"
            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Method
          </th>
          <th
            scope="col"
            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Total (USD)
          </th>
          <th
            scope="col"
            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Count
          </th>
          <th
            scope="col"
            className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Charity
          </th>
        </tr>
      </thead>
      <tbody>
        {summary.map((row) => (
          <tr
            key={`${row.groupKey}-${row.paymentMethod}-${row.charityId}`}
            className="border-t border-gray-100"
          >
            <td className="px-4 py-2 font-mono text-xs">{row.groupKey}</td>
            <td className="px-4 py-2">
              <PaymentBadge method={row.paymentMethod} />
            </td>
            <td className="px-4 py-2">${row.totalAmountUsd.toFixed(2)}</td>
            <td className="px-4 py-2">{row.donationCount}</td>
            <td className="px-4 py-2 text-gray-600">
              {row.charityName ?? row.charityId ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Donation list table with header and body rows */
function DonationListTable({
  donations,
  onFlag,
  flagging,
}: {
  donations: AdminDonationListItem[];
  onFlag: (_donation: AdminDonationListItem) => void;
  flagging: boolean;
}): React.ReactElement {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">Donation monitoring list</caption>
      <thead>
        <tr className="bg-gray-50">
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Method
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Amount (USD)
          </th>
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
            Charity
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Tx / ID
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Date
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Flag
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
        {donations.map((donation) => (
          <DonationRow
            key={donation.id}
            donation={donation}
            onFlag={onFlag}
            flagging={flagging}
          />
        ))}
      </tbody>
    </table>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

/**
 * Admin donation monitoring page: unified list of crypto and fiat donations with
 * filters, pagination, flag workflow, and CSV export.
 */
const AdminDonationMonitoring: React.FC = () => {
  const {
    result,
    loading,
    flagging,
    summary,
    summaryLoading,
    fetchDonations,
    fetchSummary,
    submitFlag,
    exportCsv,
  } = useAdminDonations();

  const [filters, setFilters] = useState<AdminDonationListFilters>({
    page: 1,
    limit: 50,
  });

  // Flag modal state
  const [flagTarget, setFlagTarget] = useState<AdminDonationListItem | null>(
    null,
  );
  const [flagReason, setFlagReason] = useState("");

  // Report panel state
  const [showReport, setShowReport] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState("");
  const [reportDateTo, setReportDateTo] = useState("");

  // Audit: active filter keys for PII access logging
  const serializedFilterKeys = useMemo(() => {
    const keys = Object.keys(filters)
      .filter(
        (k) =>
          k !== "page" &&
          k !== "limit" &&
          filters[k as keyof AdminDonationListFilters] !== undefined,
      )
      .sort((a, b) => a.localeCompare(b));
    return JSON.stringify(keys);
  }, [filters]);

  useEffect(() => {
    fetchDonations(filters);
  }, [fetchDonations, filters]);

  // Audit: log list view on page/filter change
  useEffect(() => {
    const filterKeys = JSON.parse(serializedFilterKeys) as string[];
    logRead("donation", null, {
      page: filters.page,
      limit: filters.limit,
      filterKeys: filterKeys.length > 0 ? filterKeys : undefined,
    });
  }, [filters.page, filters.limit, serializedFilterKeys]);

  const handlePaymentMethodChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      setFilters((prev) => ({
        ...prev,
        page: 1,
        paymentMethod:
          value !== "" ? (value as DonationPaymentMethod) : undefined,
      }));
    },
    [],
  );

  const handleFlaggedChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      let flaggedFilter: boolean | undefined;
      if (value === "true") {
        flaggedFilter = true;
      } else if (value === "false") {
        flaggedFilter = false;
      } else {
        flaggedFilter = undefined;
      }
      setFilters((prev) => ({
        ...prev,
        page: 1,
        flagged: flaggedFilter,
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

  const handleOpenFlag = useCallback((donation: AdminDonationListItem) => {
    setFlagTarget(donation);
    setFlagReason("");
    logRead("donation", donation.id);
  }, []);

  const handleCloseFlagModal = useCallback(() => {
    setFlagTarget(null);
    setFlagReason("");
  }, []);

  const handleFlagReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setFlagReason(e.target.value);
    },
    [],
  );

  const handleConfirmFlag = useCallback(async () => {
    if (!flagTarget) return;
    const success = await submitFlag(
      {
        donationId: flagTarget.id,
        donationType: flagTarget.paymentMethod,
        reason: flagReason.trim(),
      },
      filters,
    );
    if (success) {
      handleCloseFlagModal();
    }
  }, [flagTarget, flagReason, submitFlag, filters, handleCloseFlagModal]);

  const handleToggleReport = useCallback(() => {
    setShowReport((prev) => !prev);
  }, []);

  const handleReportDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReportDateFrom(e.target.value);
    },
    [],
  );

  const handleReportDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setReportDateTo(e.target.value);
    },
    [],
  );

  const handleGenerateReport = useCallback(async () => {
    if (!reportDateFrom || !reportDateTo) return;
    await fetchSummary(
      `${reportDateFrom}T00:00:00Z`,
      `${reportDateTo}T23:59:59Z`,
      "charity",
    );
  }, [fetchSummary, reportDateFrom, reportDateTo]);

  const handleExportCsv = useCallback(() => {
    exportCsv(
      summary,
      `donation-summary-${reportDateFrom}-to-${reportDateTo}.csv`,
    );
  }, [exportCsv, summary, reportDateFrom, reportDateTo]);

  if (loading && result.donations.length === 0) {
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
          Donation Monitoring
        </h1>
        <div className="flex gap-3">
          <span className="text-sm text-gray-500 self-center">
            {result.totalCount} total
          </span>
          <Button variant="secondary" size="sm" onClick={handleToggleReport}>
            {showReport ? "Hide Report" : "Generate Report"}
          </Button>
        </div>
      </div>

      {/* Report / CSV export panel */}
      {showReport && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Donation Summary Report
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label
                htmlFor="report-date-from"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                From
              </label>
              <input
                id="report-date-from"
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={reportDateFrom}
                onChange={handleReportDateFromChange}
              />
            </div>
            <div>
              <label
                htmlFor="report-date-to"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                To
              </label>
              <input
                id="report-date-to"
                type="date"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={reportDateTo}
                onChange={handleReportDateToChange}
              />
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateReport}
              disabled={summaryLoading || !reportDateFrom || !reportDateTo}
            >
              {summaryLoading ? "Loading…" : "Generate"}
            </Button>
            {summary.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handleExportCsv}>
                Export CSV
              </Button>
            )}
          </div>
          {summary.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <SummaryTable summary={summary} />
            </div>
          )}
        </Card>
      )}

      {/* Donation list */}
      <Card className="p-6">
        <FilterBar
          filters={filters}
          onPaymentMethodChange={handlePaymentMethodChange}
          onSearchChange={handleSearchChange}
          onFlaggedChange={handleFlaggedChange}
        />

        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )}

        {!loading && result.donations.length === 0 && (
          <p className="text-center py-8 text-gray-500">
            No donations found matching your filters.
          </p>
        )}

        {!loading && result.donations.length > 0 && (
          <div className="overflow-x-auto">
            <DonationListTable
              donations={result.donations}
              onFlag={handleOpenFlag}
              flagging={flagging}
            />
          </div>
        )}

        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
        />
      </Card>

      <FlagModal
        isOpen={flagTarget !== null}
        donation={flagTarget}
        reason={flagReason}
        onReasonChange={handleFlagReasonChange}
        onConfirm={handleConfirmFlag}
        onClose={handleCloseFlagModal}
        confirming={flagging}
      />
    </div>
  );
};

export default AdminDonationMonitoring;
