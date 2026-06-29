import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useTranslation } from "@/hooks/useTranslation";
import { useAdminCharities } from "@/hooks/useAdminCharities";
import { useAdminStats } from "@/components/admin/shell";
import { logRead } from "@/services/adminAuditService";
import type {
  AdminCharityListItem,
  AdminCharityListFilters,
  AdminCharityVerificationStatus,
} from "@/types/adminCharity";

// ─── Visual helpers ───────────────────────────────────────────────────────────

type ChipTone = "success" | "warning" | "neutral" | "danger";

const CHIP_TONES: Record<ChipTone, string> = {
  success: "text-[#1b8a6b] bg-[#e6f4ef]",
  warning: "text-[#b06a12] bg-[#fbf0df]",
  neutral: "text-[#8a948f] bg-[#f1f3f2]",
  danger: "text-[#c8412b] bg-[#fbeae6]",
};

/** Per-org avatar tints, selected deterministically from the org name. */
const AVATAR_TINTS = [
  { bg: "bg-[#e6f4ef]", fg: "text-[#1b8a6b]" },
  { bg: "bg-[#eaf0fb]", fg: "text-[#3a6bd0]" },
  { bg: "bg-[#f3eafb]", fg: "text-[#8a4bd0]" },
  { bg: "bg-[#fbeae6]", fg: "text-[#c8412b]" },
  { bg: "bg-[#fbf4df]", fg: "text-[#b06a12]" },
];

/** Returns a stable tint index for a name (simple character-sum hash). */
function tintForName(name: string): { bg: string; fg: string } {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) sum += name.charCodeAt(i);
  return AVATAR_TINTS[sum % AVATAR_TINTS.length];
}

/** Returns up to two uppercase initials for an org name. */
function initialsForName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

/** Maps a verification status to its chip tone. */
function toneForStatus(status: AdminCharityVerificationStatus): ChipTone {
  switch (status) {
    case "verified":
    case "approved":
      return "success";
    case "pending":
      return "warning";
    case "rejected":
      return "danger";
    default:
      return "neutral";
  }
}

/** Converts an ISO timestamp to a human-readable relative time string. */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDay < 1) return "Today";
  if (diffDay === 1) return "Yesterday";
  if (diffDay < 30) return `${diffDay} days ago`;
  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return `${diffMonth} mo ago`;
  return `${Math.floor(diffMonth / 12)}y ago`;
}

/** Returns the absolute, localized date string for timestamp hover titles. */
function formatAbsoluteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Status badge ─────────────────────────────────────────────────────────────

/** Status badge pill for a charity's verification status. */
function StatusBadge({
  status,
}: {
  status: AdminCharityVerificationStatus;
}): React.ReactElement {
  const { t } = useTranslation();
  const labels: Record<string, string> = {
    pending: t("admin.charity.statusPending", "Pending"),
    verified: t("admin.charity.statusVerified", "Verified"),
    approved: t("admin.charity.statusApproved", "Approved"),
    rejected: t("admin.charity.statusRejected", "Rejected"),
    suspended: t("admin.charity.statusSuspended", "Suspended"),
  };
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${CHIP_TONES[toneForStatus(status)]}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

// ─── Status tabs ──────────────────────────────────────────────────────────────

type TabValue = "all" | "pending" | "verified" | "rejected";

/** Filter tab bar with mono counts; active tab is the dark pill. */
function StatusTabs({
  active,
  counts,
  onChange,
}: {
  active: TabValue;
  counts: Record<TabValue, number | undefined>;
  onChange: (_e: React.MouseEvent<HTMLButtonElement>) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const tabs: { value: TabValue; label: string }[] = [
    { value: "all", label: t("admin.charity.tabAll", "All") },
    { value: "pending", label: t("admin.charity.statusPending", "Pending") },
    { value: "verified", label: t("admin.charity.statusVerified", "Verified") },
    { value: "rejected", label: t("admin.charity.statusRejected", "Rejected") },
  ];
  return (
    <>
      {tabs.map((tab) => {
        const isActive = active === tab.value;
        const count = counts[tab.value];
        return (
          <button
            key={tab.value}
            type="button"
            data-status={tab.value}
            onClick={onChange}
            aria-pressed={isActive}
            className={
              isActive
                ? "flex items-center gap-[7px] rounded-[9px] bg-[#0e352c] px-[14px] py-2 text-[12.5px] font-semibold text-white"
                : "flex items-center gap-[7px] rounded-[9px] border border-[#e4e8e6] bg-white px-[14px] py-2 text-[12.5px] font-semibold text-[#445]"
            }
          >
            {tab.label}
            {count !== undefined && (
              <span className="font-mono-data opacity-60">{count}</span>
            )}
          </button>
        );
      })}
    </>
  );
}

// ─── Review modal ─────────────────────────────────────────────────────────────

/** Action descriptors available for a given charity status. */
function actionsForStatus(
  status: AdminCharityVerificationStatus,
): Array<{ action: string; tone: "primary" | "danger"; requiresReason: boolean }> {
  switch (status) {
    case "pending":
      return [
        { action: "approve", tone: "primary", requiresReason: false },
        { action: "reject", tone: "danger", requiresReason: true },
      ];
    case "verified":
    case "approved":
      return [{ action: "suspend", tone: "danger", requiresReason: true }];
    case "suspended":
      return [{ action: "reinstate", tone: "primary", requiresReason: false }];
    case "rejected":
      return [{ action: "approve", tone: "primary", requiresReason: false }];
    default:
      return [];
  }
}

/** Review dialog: charity metadata + contextual approve/reject/suspend actions. */
function ReviewModal({
  charity,
  onAction,
  onClose,
  working,
}: {
  charity: AdminCharityListItem | null;
  onAction: (_action: string, _reason: string) => void;
  onClose: () => void;
  working: boolean;
}): React.ReactElement | null {
  const { t } = useTranslation();
  const [reason, setReason] = useState("");

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value),
    [],
  );

  // Reset the reason whenever a different charity opens the modal.
  useEffect(() => {
    setReason("");
  }, [charity?.id]);

  const handleActionClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const action = e.currentTarget.dataset.action;
      if (action) onAction(action, reason);
    },
    [onAction, reason],
  );

  if (!charity) return null;

  const ACTION_LABELS: Record<string, string> = {
    approve: t("admin.charity.approve", "Approve"),
    reject: t("admin.charity.reject", "Reject"),
    suspend: t("admin.charity.suspend", "Suspend"),
    reinstate: t("admin.charity.reinstate", "Reinstate"),
  };
  const actions = actionsForStatus(charity.verificationStatus);

  return (
    <Modal
      isOpen={charity !== null}
      onClose={onClose}
      title={t("admin.charity.reviewTitle", "Review {{name}}", {
        name: charity.name,
      })}
      size="md"
    >
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={charity.verificationStatus} />
        <span
          className="text-sm text-gray-500"
          title={formatAbsoluteTime(charity.createdAt)}
        >
          {t("admin.charity.submittedRelative", "Submitted {{when}}", {
            when: formatRelativeTime(charity.createdAt),
          })}
        </span>
      </div>

      {(charity.ein !== null || charity.signerName !== null) && (
        <div className="mb-4 space-y-1 rounded-lg bg-gray-50 p-3 text-sm">
          {charity.ein !== null && (
            <p>
              <span className="font-medium text-gray-700">
                {t("admin.charity.colEin", "EIN")}:
              </span>{" "}
              <span className="font-mono-data">{charity.ein}</span>
            </p>
          )}
          {charity.signerName !== null && (
            <p>
              <span className="font-medium text-gray-700">
                {t("admin.charity.colSigner", "Contact")}:
              </span>{" "}
              {charity.signerName}
            </p>
          )}
          {charity.signerEmail !== null && (
            <p>
              <span className="font-medium text-gray-700">
                {t("admin.charity.contactEmail", "Email")}:
              </span>{" "}
              {charity.signerEmail}
            </p>
          )}
          {charity.signerPhone !== null && (
            <p>
              <span className="font-medium text-gray-700">
                {t("admin.charity.contactPhone", "Phone")}:
              </span>{" "}
              {charity.signerPhone}
            </p>
          )}
        </div>
      )}

      <textarea
        className="mb-4 min-h-[80px] w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        placeholder={t("admin.charity.reasonOptional", "Reason (optional)")}
        value={reason}
        onChange={handleReasonChange}
        aria-label="Reason"
      />

      <div className="flex flex-wrap justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
          disabled={working}
        >
          {t("common.cancel", "Cancel")}
        </Button>
        {actions.map((a) => {
          const disabled =
            working || (a.requiresReason && reason.trim().length === 0);
          return (
            <button
              key={a.action}
              type="button"
              data-action={a.action}
              onClick={handleActionClick}
              disabled={disabled}
              className={`rounded-[10px] px-4 py-1.5 text-sm font-semibold text-white transition-colors ${
                a.tone === "danger"
                  ? "bg-[#c8412b] hover:bg-[#b0381f]"
                  : "bg-[#0e352c] hover:bg-[#0a2a22]"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              {ACTION_LABELS[a.action] ?? a.action}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// ─── Charity row ──────────────────────────────────────────────────────────────

/** A single charity row in the data table. */
function CharityRow({
  charity,
  onReview,
}: {
  charity: AdminCharityListItem;
  onReview: (_charity: AdminCharityListItem) => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const tint = tintForName(charity.name);

  const handleReview = useCallback(
    () => onReview(charity),
    [charity, onReview],
  );

  return (
    <div className="grid grid-cols-[2.4fr_1fr_1.1fr_1fr_90px] items-center gap-3 border-b border-[#f1f3f2] px-5 py-3.5">
      <div className="flex items-center gap-3">
        <span
          className={`flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[9px] text-[13px] font-bold ${tint.bg} ${tint.fg}`}
        >
          {initialsForName(charity.name)}
        </span>
        <div className="min-w-0 leading-[1.3]">
          <div className="truncate text-[13px] font-semibold text-[#16201c]">
            {charity.name}
          </div>
          <div className="font-mono-data text-[11px] text-[#9aa5a0]">
            {charity.ein !== null ? `EIN ${charity.ein}` : "—"}
          </div>
        </div>
      </div>
      <span>
        <StatusBadge status={charity.verificationStatus} />
      </span>
      <span
        className="text-right font-mono-data text-[13px] text-[#9aa5a0]"
        title={t("admin.charity.raisedUnavailable", "No donation total available")}
      >
        —
      </span>
      <span
        className="text-[12.5px] text-[#7c8884]"
        title={formatAbsoluteTime(charity.createdAt)}
      >
        {formatRelativeTime(charity.createdAt)}
      </span>
      <span className="text-right">
        <button
          type="button"
          onClick={handleReview}
          className="rounded-lg border border-[#e4e8e6] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1b8a6b] transition-colors hover:border-[#1fae7f]"
        >
          {t("admin.charity.review", "Review")}
        </button>
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

/**
 * Admin charity management: a filterable, restyled data-table of organizations
 * with a review dialog backing the approve/reject/suspend/reinstate workflow.
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
  const { data: stats } = useAdminStats();

  const [filters, setFilters] = useState<AdminCharityListFilters>({
    page: 1,
    limit: 50,
  });
  const [activeTab, setActiveTab] = useState<TabValue>("all");
  const [searchInput, setSearchInput] = useState("");
  const [reviewCharity, setReviewCharity] =
    useState<AdminCharityListItem | null>(null);

  // Audit: active filter keys for PII access logging
  const serializedFilterKeys = useMemo(() => {
    const keys = Object.keys(filters)
      .filter(
        (k) =>
          k !== "page" &&
          k !== "limit" &&
          filters[k as keyof AdminCharityListFilters] !== undefined,
      )
      .sort((a, b) => a.localeCompare(b));
    return JSON.stringify(keys);
  }, [filters]);

  useEffect(() => {
    fetchCharities(filters);
  }, [fetchCharities, filters]);

  // Audit: log list view on page/filter change
  useEffect(() => {
    const filterKeys = JSON.parse(serializedFilterKeys) as string[];
    logRead("charity", null, {
      page: filters.page,
      limit: filters.limit,
      filterKeys: filterKeys.length > 0 ? filterKeys : undefined,
    });
  }, [filters.page, filters.limit, serializedFilterKeys]);

  const handleTabChange = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const value = e.currentTarget.dataset.status as TabValue;
      if (!value) return;
      setActiveTab(value);
      setFilters((prev) => ({
        ...prev,
        page: 1,
        status:
          value === "all"
            ? undefined
            : (value as AdminCharityVerificationStatus),
      }));
    },
    [],
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchInput(value);
      setFilters((prev) => ({
        ...prev,
        page: 1,
        search: value !== "" ? value : undefined,
      }));
    },
    [],
  );

  const handlePrevPage = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: Math.max(1, (prev.page ?? 1) - 1) }));
  }, []);

  const handleNextPage = useCallback(() => {
    setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }));
  }, []);

  const handleReview = useCallback((charity: AdminCharityListItem) => {
    setReviewCharity(charity);
    logRead("charity", charity.id);
  }, []);

  const handleCloseReview = useCallback(() => {
    setReviewCharity(null);
  }, []);

  const handleModalAction = useCallback(
    async (action: string, reasonText: string) => {
      if (!reviewCharity) return;
      const id = reviewCharity.id;
      const trimmed = reasonText.trim() !== "" ? reasonText.trim() : undefined;

      let success = false;
      switch (action) {
        case "approve":
          success = Boolean(await approveCharity(id, trimmed, filters));
          break;
        case "reject":
          success = Boolean(await rejectCharity(id, reasonText.trim(), filters));
          break;
        case "suspend":
          success = Boolean(
            await suspendCharity(id, reasonText.trim(), filters),
          );
          break;
        case "reinstate":
          success = Boolean(await reinstateCharity(id, trimmed, filters));
          break;
        default:
          break;
      }
      if (success) setReviewCharity(null);
    },
    [
      reviewCharity,
      filters,
      approveCharity,
      rejectCharity,
      suspendCharity,
      reinstateCharity,
    ],
  );

  const tabCounts: Record<TabValue, number | undefined> = {
    all: stats?.totalCharities ?? result.totalCount,
    pending: stats?.pendingCharities,
    verified: stats?.verifiedCharities,
    rejected: undefined,
  };

  if (loading && result.charities.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-8 py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex w-full max-w-[1240px] flex-col gap-[18px] px-8 pb-12 pt-[26px]">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3">
        <StatusTabs
          active={activeTab}
          counts={tabCounts}
          onChange={handleTabChange}
        />
        <div className="flex-1" />
        <div className="flex h-[38px] w-[260px] items-center gap-[9px] rounded-[10px] border border-[#e4e8e6] bg-white px-[13px]">
          <Search size={15} strokeWidth={2} className="text-[#9aa5a0]" />
          <input
            type="search"
            placeholder={t(
              "admin.charity.searchByNameEin",
              "Search by name or EIN…",
            )}
            value={searchInput}
            onChange={handleSearchChange}
            aria-label={t("admin.charity.searchAria", "Search charities")}
            className="w-full border-0 bg-transparent text-[13px] outline-none placeholder:text-[#9aa5a0]"
          />
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-[14px] border border-[#e4e8e6] bg-white shadow-[0_1px_2px_#0b1f1a07]">
        <div className="grid grid-cols-[2.4fr_1fr_1.1fr_1fr_90px] gap-3 border-b border-[#eef0ef] bg-[#f8faf9] px-5 py-3 text-[11px] font-bold uppercase tracking-[0.04em] text-[#8a948f]">
          <span>{t("admin.charity.colOrganization", "Organization")}</span>
          <span>{t("admin.charity.colStatus", "Status")}</span>
          <span className="text-right">
            {t("admin.charity.colRaised", "Raised")}
          </span>
          <span>{t("admin.charity.colSubmitted", "Submitted")}</span>
          <span className="text-right">
            {t("admin.charity.colActions", "Actions")}
          </span>
        </div>

        {loading && (
          <div className="flex justify-center py-8">
            <LoadingSpinner size="md" />
          </div>
        )}

        {!loading && result.charities.length === 0 && (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] text-[#8a948f]">
              {t(
                "admin.charity.noResults",
                "No charities found matching your filters.",
              )}
            </p>
          </div>
        )}

        {!loading &&
          result.charities.map((charity) => (
            <CharityRow
              key={charity.id}
              charity={charity}
              onReview={handleReview}
            />
          ))}
      </div>

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            size="sm"
            variant="secondary"
            onClick={handlePrevPage}
            disabled={result.page <= 1}
          >
            {t("common.previous", "Previous")}
          </Button>
          <span className="text-sm text-[#7c8884]">
            {t("common.pageOfTotal", "Page {{page}} of {{total}}", {
              page: result.page,
              total: result.totalPages,
            })}
          </span>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleNextPage}
            disabled={result.page >= result.totalPages}
          >
            {t("common.next", "Next")}
          </Button>
        </div>
      )}

      <ReviewModal
        charity={reviewCharity}
        onAction={handleModalAction}
        onClose={handleCloseReview}
        working={updating}
      />
    </div>
  );
};

export default AdminCharityManagement;
