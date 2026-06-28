import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminVolunteerValidation } from "@/hooks/useAdminVolunteerValidation";
import { logRead } from "@/services/adminAuditService";
import type {
  AdminValidationRequestFilters,
  AdminValidationRequestItem,
  AdminValidationStats,
  AdminSuspiciousVolunteerPattern,
  ValidationRequestStatus,
} from "@/types/adminVolunteerValidation";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Colored status badge for validation request status */
function StatusBadge({
  status,
}: {
  status: ValidationRequestStatus;
}): React.ReactElement {
  const styles: Record<ValidationRequestStatus, string> = {
    pending:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
    approved:
      "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
    rejected: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    expired: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status] ?? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}
    >
      {status}
    </span>
  );
}

/** Pipeline stats cards at the top of the page */
function StatsRow({
  stats,
}: {
  stats: AdminValidationStats;
}): React.ReactElement {
  const { t } = useTranslation();
  const cards = [
    {
      label: t("admin.validation.pending", "Pending"),
      value: stats.totalPending,
      color: "text-yellow-600",
    },
    {
      label: t("admin.validation.approved", "Approved"),
      value: stats.totalApproved,
      color: "text-green-600",
    },
    {
      label: t("admin.validation.rejected", "Rejected"),
      value: stats.totalRejected,
      color: "text-red-600",
    },
    {
      label: t("admin.validation.expired", "Expired"),
      value: stats.totalExpired,
      color: "text-gray-500",
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
      {cards.map((c) => (
        <Card key={c.label} className="p-4 text-center">
          <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
          <p className="text-xs text-gray-500 mt-1">{c.label}</p>
        </Card>
      ))}
    </div>
  );
}

/** Secondary stats row: avg response time, expiration rate, rejection rate */
function RateRow({
  stats,
}: {
  stats: AdminValidationStats;
}): React.ReactElement {
  const { t } = useTranslation();
  const expPct = (stats.expirationRate * 100).toFixed(1);
  const rejPct = (stats.rejectionRate * 100).toFixed(1);
  const avgHrs = stats.avgResponseTimeHours.toFixed(1);
  return (
    <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-600">
      <span>
        {t("admin.validation.avgResponseTime", "Avg response time:")}{" "}
        <strong>{avgHrs}h</strong>
      </span>
      <span>
        {t("admin.validation.expirationRate", "Expiration rate:")}{" "}
        <strong>{expPct}%</strong>
      </span>
      <span>
        {t("admin.validation.rejectionRate", "Rejection rate:")}{" "}
        <strong>{rejPct}%</strong>
      </span>
    </div>
  );
}

/** Filter bar for the validation request list */
function FilterBar({
  filters,
  onStatusChange,
  onSearchChange,
}: {
  filters: AdminValidationRequestFilters;
  onStatusChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.status ?? ""}
        onChange={onStatusChange}
        aria-label="Filter by status"
      >
        <option value="">
          {t("admin.validation.allStatuses", "All statuses")}
        </option>
        <option value="pending">
          {t("admin.validation.pending", "Pending")}
        </option>
        <option value="approved">
          {t("admin.validation.approved", "Approved")}
        </option>
        <option value="rejected">
          {t("admin.validation.rejected", "Rejected")}
        </option>
        <option value="expired">
          {t("admin.validation.expired", "Expired")}
        </option>
      </select>
      <input
        type="text"
        placeholder={t(
          "admin.validation.searchPlaceholder",
          "Search volunteer, org…",
        )}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[220px]"
        defaultValue={filters.search ?? ""}
        onChange={onSearchChange}
        aria-label="Search validation requests"
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
    <div className="flex items-center justify-between mt-4">
      <Button
        variant="secondary"
        size="sm"
        onClick={onPrev}
        disabled={page <= 1}
      >
        {t("common.previous", "Previous")}
      </Button>
      <span className="text-sm text-gray-500">
        {t("common.pageOfTotal", "Page {{page}} of {{total}}", {
          page,
          total: totalPages,
        })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        {t("common.next", "Next")}
      </Button>
    </div>
  );
}

/** Single row in the validation request table */
function RequestRow({
  request,
  onOverride,
}: {
  request: AdminValidationRequestItem;
  onOverride: (_req: AdminValidationRequestItem) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const handleOverride = useCallback(() => {
    onOverride(request);
  }, [onOverride, request]);

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
      <td className="px-4 py-3 text-sm text-gray-900 max-w-[180px] truncate">
        {request.volunteerDisplayName ??
          request.volunteerEmail ??
          request.volunteerId}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {request.orgName ?? request.orgId}
      </td>
      <td className="px-4 py-3 text-sm text-gray-900 text-right">
        {request.hoursReported}
      </td>
      <td className="px-4 py-3 text-sm text-gray-600">
        {request.activityDate}
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={request.status} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {request.createdAt.split("T")[0]}
      </td>
      <td className="px-4 py-3 text-right">
        {request.status === "pending" && (
          <Button variant="secondary" size="sm" onClick={handleOverride}>
            {t("admin.validation.override", "Override")}
          </Button>
        )}
      </td>
    </tr>
  );
}

/** Suspicious patterns table */
function SuspiciousTable({
  patterns,
}: {
  patterns: AdminSuspiciousVolunteerPattern[];
}): React.ReactElement {
  const { t } = useTranslation();
  if (patterns.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        {t("admin.validation.noPatterns", "No suspicious patterns detected.")}
      </p>
    );
  }
  return (
    <table className="min-w-full divide-y divide-gray-200 text-left overflow-x-auto">
      <caption className="sr-only">Suspicious volunteer patterns</caption>
      <thead>
        <tr className="bg-gray-50 dark:bg-gray-800">
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
          >
            {t("admin.validation.colVolunteer", "Volunteer")}
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
          >
            {t("admin.validation.colOrganisation", "Organisation")}
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right"
          >
            {t("admin.validation.colHrsPerWeek", "Hrs/Week")}
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right"
          >
            {t("admin.validation.colTotalRequests", "Total Requests")}
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {patterns.map((p) => (
          <tr
            key={`${p.volunteerId}-${p.orgId}`}
            className="hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <td className="px-4 py-3 text-sm text-gray-900">
              {p.volunteerDisplayName ?? p.volunteerEmail ?? p.volunteerId}
            </td>
            <td className="px-4 py-3 text-sm text-gray-600">
              {p.orgName ?? p.orgId}
            </td>
            <td className="px-4 py-3 text-sm font-semibold text-red-700 text-right">
              {p.weeklyHours}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 text-right">
              {p.totalRequests}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ─── Override Modal ───────────────────────────────────────────────────────────

interface OverrideModalProps {
  request: AdminValidationRequestItem;
  overriding: boolean;
  onConfirm: (_newStatus: ValidationRequestStatus, _reason: string) => void;
  onClose: () => void;
}

/** Confirmation modal for admin override of a validation request */
function OverrideModal({
  request,
  overriding,
  onConfirm,
  onClose,
}: OverrideModalProps): React.ReactElement {
  const { t } = useTranslation();
  const [newStatus, setNewStatus] =
    useState<ValidationRequestStatus>("approved");
  const [reason, setReason] = useState("");

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setNewStatus(e.target.value as ValidationRequestStatus);
    },
    [],
  );

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReason(e.target.value);
    },
    [],
  );

  const handleConfirm = useCallback(() => {
    onConfirm(newStatus, reason);
  }, [onConfirm, newStatus, reason]);

  const volunteerLabel =
    request.volunteerDisplayName ??
    request.volunteerEmail ??
    request.volunteerId;

  return (
    <Modal
      title={t("admin.validation.overrideTitle", "Override Validation Request")}
      onClose={onClose}
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose} disabled={overriding}>
            {t("common.cancel", "Cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={overriding || reason.trim().length === 0}
          >
            {overriding
              ? t("common.saving", "Saving…")
              : t("admin.validation.confirmOverride", "Confirm Override")}
          </Button>
        </div>
      }
    >
      <div>
        <p className="text-sm text-gray-700 mb-4">
          {t("admin.validation.colVolunteer", "Volunteer")}:{" "}
          <strong>{volunteerLabel}</strong> — {request.hoursReported}h on{" "}
          {request.activityDate}
        </p>
        <label
          htmlFor="override-status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("admin.validation.newStatus", "New Status")}
        </label>
        <select
          id="override-status"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-4"
          value={newStatus}
          onChange={handleStatusChange}
        >
          <option value="approved">
            {t("admin.validation.approved", "Approved")}
          </option>
          <option value="rejected">
            {t("admin.validation.rejected", "Rejected")}
          </option>
        </select>
        <label
          htmlFor="override-reason"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {t("admin.validation.reasonRequired", "Reason (required)")}
        </label>
        <textarea
          id="override-reason"
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder={t(
            "admin.validation.reasonPlaceholder",
            "Explain the reason for overriding this request…",
          )}
          value={reason}
          onChange={handleReasonChange}
        />
      </div>
    </Modal>
  );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────

type TabId = "requests" | "patterns";

// ─── Main Page ────────────────────────────────────────────────────────────────

/**
 * AdminVolunteerValidation page.
 * Provides pipeline statistics, a filterable validation request list with override capability,
 * and a suspicious patterns alert view for abuse detection.
 */
export default function AdminVolunteerValidation(): React.ReactElement {
  const { t } = useTranslation();
  const {
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
  } = useAdminVolunteerValidation();

  const [activeTab, setActiveTab] = useState<TabId>("requests");
  const [filters, setFilters] = useState<AdminValidationRequestFilters>({
    page: 1,
    limit: 50,
  });
  const [selectedRequest, setSelectedRequest] =
    useState<AdminValidationRequestItem | null>(null);

  // Audit: active filter keys for PII access logging
  const serializedFilterKeys = useMemo(() => {
    const keys = Object.keys(filters)
      .filter(
        (k) =>
          k !== "page" &&
          k !== "limit" &&
          filters[k as keyof AdminValidationRequestFilters] !== undefined,
      )
      .sort((a, b) => a.localeCompare(b));
    return JSON.stringify(keys);
  }, [filters]);

  // Initial data load
  useEffect(() => {
    fetchStats().catch(() => {
      // Error handled internally by hook
    });
    fetchRequests({ page: 1, limit: 50 }).catch(() => {
      // Error handled internally by hook
    });
    fetchSuspiciousPatterns().catch(() => {
      // Error handled internally by hook
    });
  }, [fetchStats, fetchRequests, fetchSuspiciousPatterns]);

  // Audit: log list view on page/filter change
  useEffect(() => {
    const filterKeys = JSON.parse(serializedFilterKeys) as string[];
    logRead("volunteer", null, {
      page: filters.page,
      limit: filters.limit,
      filterKeys: filterKeys.length > 0 ? filterKeys : undefined,
    });
  }, [filters.page, filters.limit, serializedFilterKeys]);

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const status = e.target.value as ValidationRequestStatus | "";
      const newFilters: AdminValidationRequestFilters = {
        ...filters,
        status: status !== "" ? status : undefined,
        page: 1,
      };
      setFilters(newFilters);
      fetchRequests(newFilters).catch(() => {
        // Error handled internally by hook
      });
    },
    [filters, fetchRequests],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const search = e.target.value.trim();
      const newFilters: AdminValidationRequestFilters = {
        ...filters,
        search: search !== "" ? search : undefined,
        page: 1,
      };
      setFilters(newFilters);
      fetchRequests(newFilters).catch(() => {
        // Error handled internally by hook
      });
    },
    [filters, fetchRequests],
  );

  const handlePrev = useCallback(() => {
    const newFilters = { ...filters, page: (filters.page ?? 1) - 1 };
    setFilters(newFilters);
    fetchRequests(newFilters).catch(() => {
      // Error handled internally by hook
    });
  }, [filters, fetchRequests]);

  const handleNext = useCallback(() => {
    const newFilters = { ...filters, page: (filters.page ?? 1) + 1 };
    setFilters(newFilters);
    fetchRequests(newFilters).catch(() => {
      // Error handled internally by hook
    });
  }, [filters, fetchRequests]);

  const handleOpenOverride = useCallback((req: AdminValidationRequestItem) => {
    setSelectedRequest(req);
    logRead("volunteer", req.id);
  }, []);

  const handleCloseOverride = useCallback(() => {
    setSelectedRequest(null);
  }, []);

  const handleConfirmOverride = useCallback(
    async (newStatus: ValidationRequestStatus, reason: string) => {
      if (selectedRequest === null) return;
      const success = await submitOverride(
        { requestId: selectedRequest.id, newStatus, reason },
        filters,
        {
          volunteerId: selectedRequest.volunteerId,
          volunteerDisplayName: selectedRequest.volunteerDisplayName,
          orgName: selectedRequest.orgName,
          hoursReported: selectedRequest.hoursReported,
          activityDate: selectedRequest.activityDate,
        },
      );
      if (success) {
        setSelectedRequest(null);
      }
    },
    [selectedRequest, submitOverride, filters],
  );

  const handleTabRequests = useCallback(() => setActiveTab("requests"), []);
  const handleTabPatterns = useCallback(() => setActiveTab("patterns"), []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {t("admin.validation.title", "Volunteer Validation Oversight")}
        </h1>
        <span className="text-sm text-gray-500">
          {t("admin.validation.totalCount", "{{count}} total requests", {
            count: result.totalCount,
          })}
        </span>
      </div>

      {/* Pipeline stats */}
      <Card className="p-6 mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          {t("admin.validation.pipelineStats", "Pipeline Statistics")}
        </h2>
        {statsLoading && <LoadingSpinner size="sm" />}
        {!statsLoading && stats !== null && (
          <>
            <StatsRow stats={stats} />
            <RateRow stats={stats} />
          </>
        )}
        {!statsLoading && stats === null && (
          <p className="text-sm text-gray-500">
            {t("admin.validation.noStats", "No statistics available.")}
          </p>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-gray-200">
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === "requests" ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={handleTabRequests}
        >
          {t("admin.validation.requestsTab", "Validation Requests")}
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${activeTab === "patterns" ? "border-emerald-500 text-emerald-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}
          onClick={handleTabPatterns}
        >
          {t("admin.validation.patternsTab", "Suspicious Patterns")}
          {suspiciousPatterns.length > 0 && (
            <span className="ml-2 inline-block bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 text-xs font-semibold px-1.5 py-0.5 rounded-full">
              {suspiciousPatterns.length}
            </span>
          )}
        </button>
      </div>

      {/* Validation Requests tab */}
      {activeTab === "requests" && (
        <Card className="p-6">
          <FilterBar
            filters={filters}
            onStatusChange={handleStatusChange}
            onSearchChange={handleSearchChange}
          />
          {loading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}
          {!loading && result.requests.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              {t(
                "admin.validation.noRequests",
                "No validation requests found.",
              )}
            </p>
          )}
          {!loading && result.requests.length > 0 && (
            <table className="min-w-full divide-y divide-gray-200 text-left overflow-x-auto">
              <caption className="sr-only">
                Volunteer validation requests
              </caption>
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800">
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
                  >
                    {t("admin.validation.colVolunteer", "Volunteer")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
                  >
                    {t("admin.validation.colOrganisation", "Organisation")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-right"
                  >
                    {t("admin.validation.colHours", "Hours")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
                  >
                    {t("admin.validation.colActivityDate", "Activity Date")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
                  >
                    {t("admin.validation.colStatus", "Status")}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase"
                  >
                    {t("admin.validation.colCreated", "Created")}
                  </th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {result.requests.map((req) => (
                  <RequestRow
                    key={req.id}
                    request={req}
                    onOverride={handleOpenOverride}
                  />
                ))}
              </tbody>
            </table>
          )}
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </Card>
      )}

      {/* Suspicious Patterns tab */}
      {activeTab === "patterns" && (
        <Card className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            {t(
              "admin.validation.patternsDescription",
              "Volunteers flagged for reporting more than the configured threshold of hours in a rolling 7-day window. These patterns may indicate abuse of the self-reported hours system.",
            )}
          </p>
          {patternsLoading && (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          )}
          {!patternsLoading && (
            <SuspiciousTable patterns={suspiciousPatterns} />
          )}
        </Card>
      )}

      {/* Override Modal */}
      {selectedRequest !== null && (
        <OverrideModal
          request={selectedRequest}
          overriding={overriding}
          onConfirm={handleConfirmOverride}
          onClose={handleCloseOverride}
        />
      )}
    </div>
  );
}
