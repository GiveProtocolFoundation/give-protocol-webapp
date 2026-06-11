import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import {
  listOpportunities,
  listCauses,
  moderateContent,
} from "@/services/adminContentModerationService";
import { logRead } from "@/services/adminAuditService";
import { useToast } from "@/contexts/ToastContext";
import type {
  AdminOpportunityListItem,
  AdminCauseListItem,
  AdminContentModerationFilters,
  AdminOpportunityListResult,
  AdminCauseListResult,
  ModerationAction,
  ModerationStatus,
} from "@/types/adminContentModeration";

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Visibility badge pill for a content item's moderation status */
function VisibilityBadge({
  status,
}: {
  status: ModerationStatus;
}): React.ReactElement {
  const styles: Record<ModerationStatus, string> = {
    visible: "bg-green-100 text-green-800",
    hidden: "bg-red-100 text-red-800",
    flagged: "bg-yellow-100 text-yellow-800",
  };
  const labels: Record<ModerationStatus, string> = {
    visible: "Visible",
    hidden: "Hidden",
    flagged: "Flagged",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

/** Moderation action buttons for a content row */
function ContentActions({
  moderationStatus,
  onAction,
  disabled,
}: {
  moderationStatus: ModerationStatus;
  onAction: (_action: ModerationAction) => void;
  disabled: boolean;
}): React.ReactElement {
  const handleHide = useCallback(() => onAction("hide"), [onAction]);
  const handleUnhide = useCallback(() => onAction("unhide"), [onAction]);
  const handleFlag = useCallback(() => onAction("flag"), [onAction]);
  const handleUnflag = useCallback(() => onAction("unflag"), [onAction]);

  return (
    <div className="flex gap-2 flex-wrap">
      {moderationStatus !== "hidden" && (
        <Button
          size="sm"
          variant="danger"
          onClick={handleHide}
          disabled={disabled}
        >
          Hide
        </Button>
      )}
      {moderationStatus === "hidden" && (
        <Button
          size="sm"
          variant="primary"
          onClick={handleUnhide}
          disabled={disabled}
        >
          Unhide
        </Button>
      )}
      {moderationStatus !== "flagged" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleFlag}
          disabled={disabled}
        >
          Flag for Review
        </Button>
      )}
      {moderationStatus === "flagged" && (
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUnflag}
          disabled={disabled}
        >
          Unflag
        </Button>
      )}
    </div>
  );
}

/** Filter bar: moderation status dropdown + search input */
function FilterBar({
  filters,
  onStatusChange,
  onSearchChange,
}: {
  filters: AdminContentModerationFilters;
  onStatusChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onSearchChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.moderationStatus ?? ""}
        onChange={onStatusChange}
        aria-label="Filter by visibility"
      >
        <option value="">All visibility</option>
        <option value="visible">Visible</option>
        <option value="hidden">Hidden</option>
        <option value="flagged">Flagged</option>
      </select>
      <input
        type="text"
        placeholder="Search by name…"
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={filters.search ?? ""}
        onChange={onSearchChange}
        aria-label="Search content"
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
    <div className="flex items-center justify-between mt-6">
      <Button
        size="sm"
        variant="secondary"
        onClick={onPrev}
        disabled={page <= 1}
      >
        Previous
      </Button>
      <span className="text-sm text-gray-600">
        Page {page} of {totalPages}
      </span>
      <Button
        size="sm"
        variant="secondary"
        onClick={onNext}
        disabled={page >= totalPages}
      >
        Next
      </Button>
    </div>
  );
}

/** Confirmation modal for hide/unhide/flag/unflag actions */
function ActionModal({
  isOpen,
  title,
  action,
  reason,
  onReasonChange,
  onConfirm,
  onClose,
  confirming,
}: {
  isOpen: boolean;
  title: string;
  action: ModerationAction | "";
  reason: string;
  onReasonChange: (_e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onConfirm: () => void;
  onClose: () => void;
  confirming: boolean;
}): React.ReactElement | null {
  if (!action) return null;

  const ACTION_LABELS: Record<ModerationAction, string> = {
    hide: "Hide Content",
    unhide: "Unhide Content",
    flag: "Flag for Review",
    unflag: "Unflag Content",
  };

  const REASON_REQUIRED = action === "hide" || action === "flag";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={ACTION_LABELS[action]}
      size="md"
    >
      <p className="text-sm text-gray-600 mb-4">
        {action === "hide" && (
          <>
            Are you sure you want to <strong>hide</strong> <em>{title}</em>?
            Provide a reason below.
          </>
        )}
        {action === "unhide" && (
          <>
            Are you sure you want to <strong>unhide</strong> <em>{title}</em>?
          </>
        )}
        {action === "flag" && (
          <>
            Are you sure you want to <strong>flag</strong> <em>{title}</em> for
            review? Provide a reason below.
          </>
        )}
        {action === "unflag" && (
          <>
            Are you sure you want to <strong>unflag</strong> <em>{title}</em>?
          </>
        )}
      </p>
      <textarea
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y min-h-[80px]"
        placeholder={
          REASON_REQUIRED ? "Reason (required)" : "Reason (optional)"
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
          Cancel
        </Button>
        <Button
          variant={
            action === "hide" || action === "flag" ? "danger" : "primary"
          }
          size="sm"
          onClick={onConfirm}
          disabled={
            confirming || (REASON_REQUIRED && reason.trim().length === 0)
          }
        >
          {confirming ? "Saving…" : ACTION_LABELS[action]}
        </Button>
      </div>
    </Modal>
  );
}

// ─── Opportunities tab ────────────────────────────────────────────────────────

type PendingAction = {
  id: string;
  title: string;
  contentType: "opportunity" | "cause";
  action: ModerationAction;
};

/** Opportunities list table */
function OpportunitiesTable({
  opportunities,
  onAction,
  updating,
}: {
  opportunities: AdminOpportunityListItem[];
  onAction: (
    _item: AdminOpportunityListItem,
    _action: ModerationAction,
  ) => void;
  updating: boolean;
}): React.ReactElement {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">Volunteer opportunities moderation</caption>
      <thead>
        <tr className="bg-gray-50">
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Name
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
            Status
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Visibility
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Last Modified
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
        {opportunities.map((opp) => (
          <OpportunityRow
            key={opp.id}
            item={opp}
            onAction={onAction}
            updating={updating}
          />
        ))}
      </tbody>
    </table>
  );
}

/** Single row in the opportunities moderation table */
function OpportunityRow({
  item,
  onAction,
  updating,
}: {
  item: AdminOpportunityListItem;
  onAction: (
    _item: AdminOpportunityListItem,
    _action: ModerationAction,
  ) => void;
  updating: boolean;
}): React.ReactElement {
  const formattedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleAction = useCallback(
    (action: ModerationAction) => onAction(item, action),
    [item, onAction],
  );

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {item.title}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.charityName}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.status}</td>
      <td className="px-4 py-3">
        <VisibilityBadge status={item.moderationStatus} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formattedDate}</td>
      <td className="px-4 py-3">
        <ContentActions
          moderationStatus={item.moderationStatus}
          onAction={handleAction}
          disabled={updating}
        />
      </td>
    </tr>
  );
}

// ─── Causes tab ───────────────────────────────────────────────────────────────

/** Causes list table */
function CausesTable({
  causes,
  onAction,
  updating,
}: {
  causes: AdminCauseListItem[];
  onAction: (_item: AdminCauseListItem, _action: ModerationAction) => void;
  updating: boolean;
}): React.ReactElement {
  return (
    <table className="w-full text-left">
      <caption className="sr-only">Causes moderation</caption>
      <thead>
        <tr className="bg-gray-50">
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Name
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
            Status
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Visibility
          </th>
          <th
            scope="col"
            className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide"
          >
            Last Modified
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
        {causes.map((cause) => (
          <CauseRow
            key={cause.id}
            item={cause}
            onAction={onAction}
            updating={updating}
          />
        ))}
      </tbody>
    </table>
  );
}

/** Single row in the causes moderation table */
function CauseRow({
  item,
  onAction,
  updating,
}: {
  item: AdminCauseListItem;
  onAction: (_item: AdminCauseListItem, _action: ModerationAction) => void;
  updating: boolean;
}): React.ReactElement {
  const formattedDate = new Date(item.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const handleAction = useCallback(
    (action: ModerationAction) => onAction(item, action),
    [item, onAction],
  );

  return (
    <tr className="border-t border-gray-100 hover:bg-gray-50">
      <td className="px-4 py-3 text-sm font-medium text-gray-900">
        {item.title}
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.charityName}</td>
      <td className="px-4 py-3 text-sm text-gray-500">{item.status}</td>
      <td className="px-4 py-3">
        <VisibilityBadge status={item.moderationStatus} />
      </td>
      <td className="px-4 py-3 text-sm text-gray-500">{formattedDate}</td>
      <td className="px-4 py-3">
        <ContentActions
          moderationStatus={item.moderationStatus}
          onAction={handleAction}
          disabled={updating}
        />
      </td>
    </tr>
  );
}

// ─── Tab content ─────────────────────────────────────────────────────────────

/** Renders the active tab's content: loading spinner, empty state, or data table */
function TabContent({
  activeTab,
  loading,
  updating,
  oppResult,
  causeResult,
  onOpportunityAction,
  onCauseAction,
}: {
  activeTab: "opportunities" | "causes";
  loading: boolean;
  updating: boolean;
  oppResult: AdminOpportunityListResult;
  causeResult: AdminCauseListResult;
  onOpportunityAction: (
    _item: AdminOpportunityListItem,
    _action: ModerationAction,
  ) => void;
  onCauseAction: (_item: AdminCauseListItem, _action: ModerationAction) => void;
}): React.ReactElement | null {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (activeTab === "opportunities") {
    if (oppResult.opportunities.length === 0) {
      return (
        <p className="text-center py-8 text-gray-500">
          No opportunities found matching your filters.
        </p>
      );
    }
    return (
      <OpportunitiesTable
        opportunities={oppResult.opportunities}
        onAction={onOpportunityAction}
        updating={updating}
      />
    );
  }

  if (causeResult.causes.length === 0) {
    return (
      <p className="text-center py-8 text-gray-500">
        No causes found matching your filters.
      </p>
    );
  }
  return (
    <CausesTable
      causes={causeResult.causes}
      onAction={onCauseAction}
      updating={updating}
    />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ActiveTab = "opportunities" | "causes";

const INITIAL_OPP_RESULT: AdminOpportunityListResult = {
  opportunities: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

const INITIAL_CAUSE_RESULT: AdminCauseListResult = {
  causes: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

/**
 * Admin Content Moderation page: manage visibility of volunteer opportunities
 * and causes with hide/unhide/flag/unflag actions backed by the admin audit trail.
 */
const AdminContentModeration: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ActiveTab>("opportunities");
  const [filters, setFilters] = useState<AdminContentModerationFilters>({
    page: 1,
    limit: 50,
  });

  const [oppResult, setOppResult] =
    useState<AdminOpportunityListResult>(INITIAL_OPP_RESULT);
  const [causeResult, setCauseResult] =
    useState<AdminCauseListResult>(INITIAL_CAUSE_RESULT);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Modal state
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [reason, setReason] = useState("");

  // Audit: active filter keys for PII access logging
  const serializedFilterKeys = useMemo(() => {
    const keys = Object.keys(filters)
      .filter(
        (k) =>
          k !== "page" &&
          k !== "limit" &&
          filters[k as keyof AdminContentModerationFilters] !== undefined,
      )
      .sort();
    return JSON.stringify(keys);
  }, [filters]);

  const fetchOpportunities = useCallback(
    async (f: AdminContentModerationFilters) => {
      setLoading(true);
      try {
        const data = await listOpportunities(f);
        setOppResult(data);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchCauses = useCallback(async (f: AdminContentModerationFilters) => {
    setLoading(true);
    try {
      const data = await listCauses(f);
      setCauseResult(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "opportunities") {
      fetchOpportunities(filters);
    } else {
      fetchCauses(filters);
    }
  }, [activeTab, filters, fetchOpportunities, fetchCauses]);

  // Audit: log list view on page/filter change
  useEffect(() => {
    const filterKeys = JSON.parse(serializedFilterKeys) as string[];
    logRead("content", null, {
      page: filters.page,
      limit: filters.limit,
      filterKeys: filterKeys.length > 0 ? filterKeys : undefined,
      source: activeTab,
    });
  }, [filters.page, filters.limit, serializedFilterKeys, activeTab]);

  const handleTabOpportunities = useCallback(() => {
    setActiveTab("opportunities");
    setFilters({ page: 1, limit: 50 });
  }, []);

  const handleTabCauses = useCallback(() => {
    setActiveTab("causes");
    setFilters({ page: 1, limit: 50 });
  }, []);

  const handleOpportunityAction = useCallback(
    (item: AdminOpportunityListItem, action: ModerationAction) => {
      setPendingAction({
        id: item.id,
        title: item.title,
        contentType: "opportunity",
        action,
      });
      setReason("");
      logRead("content", item.id);
    },
    [],
  );

  const handleCauseAction = useCallback(
    (item: AdminCauseListItem, action: ModerationAction) => {
      setPendingAction({
        id: item.id,
        title: item.title,
        contentType: "cause",
        action,
      });
      setReason("");
      logRead("content", item.id);
    },
    [],
  );

  const handleCloseModal = useCallback(() => {
    setPendingAction(null);
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
        moderationStatus:
          value !== "" ? (value as ModerationStatus) : undefined,
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
    if (!pendingAction) return;
    setUpdating(true);
    try {
      const auditId = await moderateContent({
        contentType: pendingAction.contentType,
        contentId: pendingAction.id,
        action: pendingAction.action,
        reason: reason.trim() !== "" ? reason.trim() : undefined,
      });

      if (auditId === null) {
        showToast("error", "Action failed. Please try again.");
        return;
      }

      const ACTION_SUCCESS: Record<ModerationAction, string> = {
        hide: "Content hidden successfully.",
        unhide: "Content unhidden successfully.",
        flag: "Content flagged for review.",
        unflag: "Content unflagged.",
      };
      showToast("success", ACTION_SUCCESS[pendingAction.action]);
      handleCloseModal();

      if (activeTab === "opportunities") {
        await fetchOpportunities(filters);
      } else {
        await fetchCauses(filters);
      }
    } finally {
      setUpdating(false);
    }
  }, [
    pendingAction,
    reason,
    showToast,
    handleCloseModal,
    activeTab,
    filters,
    fetchOpportunities,
    fetchCauses,
  ]);

  const currentPage =
    activeTab === "opportunities" ? oppResult.page : causeResult.page;
  const totalPages =
    activeTab === "opportunities"
      ? oppResult.totalPages
      : causeResult.totalPages;
  const totalCount =
    activeTab === "opportunities"
      ? oppResult.totalCount
      : causeResult.totalCount;

  const showInitialLoader =
    loading &&
    ((activeTab === "opportunities" && oppResult.opportunities.length === 0) ||
      (activeTab === "causes" && causeResult.causes.length === 0));

  if (showInitialLoader) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Content Moderation</h1>
        <span className="text-sm text-gray-500">{totalCount} total</span>
      </div>

      {/* Tab navigation */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "opportunities"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={handleTabOpportunities}
        >
          Opportunities
        </button>
        <button
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "causes"
              ? "border-emerald-500 text-emerald-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
          onClick={handleTabCauses}
        >
          Causes
        </button>
      </div>

      <Card className="p-6 overflow-x-auto">
        <FilterBar
          filters={filters}
          onStatusChange={handleStatusChange}
          onSearchChange={handleSearchChange}
        />

        <TabContent
          activeTab={activeTab}
          loading={loading}
          updating={updating}
          oppResult={oppResult}
          causeResult={causeResult}
          onOpportunityAction={handleOpportunityAction}
          onCauseAction={handleCauseAction}
        />

        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPrev={handlePrevPage}
          onNext={handleNextPage}
        />
      </Card>

      <ActionModal
        isOpen={pendingAction !== null}
        title={pendingAction?.title ?? ""}
        action={pendingAction?.action ?? ""}
        reason={reason}
        onReasonChange={handleReasonChange}
        onConfirm={handleConfirm}
        onClose={handleCloseModal}
        confirming={updating}
      />
    </div>
  );
};

export default AdminContentModeration;
