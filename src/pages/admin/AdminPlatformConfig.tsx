import React, { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useAdminPlatformConfig } from "@/hooks/useAdminPlatformConfig";
import { useAdminAuditLog } from "@/hooks/useAdminAuditLog";
import {
  configKeyLabel,
  configValueInputType,
} from "@/services/adminPlatformConfigService";
import { getAdminDashboardStats } from "@/services/adminDashboardService";
import { listAdminUsers } from "@/services/adminSettingsService";
import type {
  PlatformConfigEntry,
  PlatformConfigKey,
  PlatformConfigValue,
} from "@/types/adminPlatformConfig";
import type {
  AdminAuditActionType,
  AdminAuditEntityType,
  AdminAuditLogEntry,
  AdminAuditLogFilters,
} from "@/types/adminAudit";
import type { AdminDashboardStats } from "@/types/adminDashboard";
import type { AdminUserEntry } from "@/services/adminSettingsService";

// ─── Tab Types ────────────────────────────────────────────────────────────────

type SettingsTab =
  | "platform-config"
  | "audit-log"
  | "token-network"
  | "admin-users"
  | "system-health";

// ─── Category Config ──────────────────────────────────────────────────────────

/** Config keys shown in the Token & Network tab (not Platform Config tab) */
const TOKEN_NETWORK_KEYS: ReadonlySet<string> = new Set([
  "supported_tokens",
  "supported_networks",
]);

/** Category label for each platform config key */
const CONFIG_CATEGORY: Record<string, string> = {
  min_donation_usd: "Donations",
  validation_window_days: "Donations",
  max_causes_per_charity: "Charities",
  max_opportunities_per_charity: "Charities",
};

/** Display order for config categories */
const CATEGORY_ORDER = ["Donations", "Charities", "Volunteers"];

// ─── Audit Log Constants ──────────────────────────────────────────────────────

const AUDIT_ACTION_TYPES: AdminAuditActionType[] = [
  "charity_status_change",
  "user_status_change",
  "donation_flag",
  "donation_flag_resolve",
  "validation_override",
  "config_change",
  "verification_approve",
  "verification_reject",
  "charity_suspend",
  "charity_reinstate",
  "user_suspend",
  "user_reinstate",
  "user_ban",
];

const AUDIT_ENTITY_TYPES: AdminAuditEntityType[] = [
  "charity",
  "user",
  "donation",
  "validation_request",
  "platform_config",
  "charity_verification",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats a UTC timestamp string as a localised date-time */
function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Renders a JSON value as a short preview string */
function formatJsonPreview(val: unknown): string {
  if (val === null || val === undefined) return "—";
  const json = JSON.stringify(val);
  return json.length > 80 ? `${json.slice(0, 80)}…` : json;
}

/** CSS classes for a tab button */
function tabClass(active: boolean): string {
  return `px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
    active
      ? "border-emerald-500 text-emerald-600"
      : "border-transparent text-gray-500 hover:text-gray-700"
  }`;
}

// ─── Shared Config Sub-components ─────────────────────────────────────────────

/** Renders a config value for display (truncated JSON for complex types) */
function ValuePreview({
  value,
}: {
  value: PlatformConfigValue;
}): React.ReactElement {
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return <span className="font-mono text-sm">{String(value)}</span>;
  }
  const json = JSON.stringify(value, null, 2);
  const preview = json.length > 120 ? `${json.slice(0, 120)}…` : json;
  return (
    <span className="font-mono text-xs text-gray-500 whitespace-pre-wrap">
      {preview}
    </span>
  );
}

/** Single config row card */
function ConfigCard({
  entry,
  onEdit,
}: {
  entry: PlatformConfigEntry;
  onEdit: (_entry: PlatformConfigEntry) => void;
}): React.ReactElement {
  const handleEdit = useCallback(() => {
    onEdit(entry);
  }, [onEdit, entry]);

  return (
    <Card className="p-4 flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800">
          {configKeyLabel(entry.key)}
        </p>
        {entry.description !== null && (
          <p className="text-xs text-gray-500 mt-0.5">{entry.description}</p>
        )}
        <div className="mt-2">
          <ValuePreview value={entry.value} />
        </div>
        {entry.updatedAt !== null && (
          <p className="text-xs text-gray-400 mt-1">
            Last updated: {formatDateTime(entry.updatedAt)}
            {entry.updatedBy !== null && ` by ${entry.updatedBy}`}
          </p>
        )}
      </div>
      <Button
        variant="secondary"
        size="sm"
        onClick={handleEdit}
        className="shrink-0"
      >
        Edit
      </Button>
    </Card>
  );
}

/** Edit modal for a single config entry */
function EditConfigModal({
  entry,
  saving,
  onSave,
  onClose,
}: {
  entry: PlatformConfigEntry;
  saving: boolean;
  onSave: (_key: PlatformConfigKey, _value: PlatformConfigValue) => void;
  onClose: () => void;
}): React.ReactElement {
  const inputType = configValueInputType(entry.value);
  const [numValue, setNumValue] = useState<number>(
    typeof entry.value === "number" ? entry.value : 0,
  );
  const [jsonValue, setJsonValue] = useState<string>(
    inputType === "json" ? JSON.stringify(entry.value, null, 2) : "",
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleNumChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNumValue(Number(e.target.value));
    },
    [],
  );

  const handleJsonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setJsonValue(e.target.value);
      setJsonError(null);
    },
    [],
  );

  const handleSave = useCallback(() => {
    if (inputType === "number") {
      onSave(entry.key, numValue);
    } else {
      try {
        const parsed = JSON.parse(jsonValue) as PlatformConfigValue;
        onSave(entry.key, parsed);
      } catch {
        setJsonError("Invalid JSON — please check the syntax and try again.");
      }
    }
  }, [inputType, entry.key, numValue, jsonValue, onSave]);

  return (
    <Modal onClose={onClose} title={`Edit: ${configKeyLabel(entry.key)}`}>
      <div className="space-y-4">
        {entry.description !== null && (
          <p className="text-sm text-gray-600">{entry.description}</p>
        )}
        {inputType === "number" ? (
          <div>
            <label
              htmlFor="config-num-value"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Value
            </label>
            <input
              id="config-num-value"
              type="number"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={numValue}
              onChange={handleNumChange}
              min={0}
            />
          </div>
        ) : (
          <div>
            <label
              htmlFor="config-json-value"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Value (JSON)
            </label>
            <textarea
              id="config-json-value"
              rows={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              value={jsonValue}
              onChange={handleJsonChange}
            />
            {jsonError !== null && (
              <p className="text-xs text-red-600 mt-1">{jsonError}</p>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

/**
 * Renders the tab selector used to switch between admin platform-config screens.
 * @param props - Component props.
 * @param props.activeTab - Identifier of the currently active tab.
 * @param props.onTabChange - Callback invoked with the new tab identifier when a tab is clicked.
 * @returns The tab bar element.
 */
function TabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: SettingsTab;
  onTabChange: (_tab: SettingsTab) => void;
}): React.ReactElement {
  const handleTabClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const tab = e.currentTarget.dataset.tab as SettingsTab;
      onTabChange(tab);
    },
    [onTabChange],
  );

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex">
        <button
          type="button"
          data-tab="platform-config"
          onClick={handleTabClick}
          className={tabClass(activeTab === "platform-config")}
        >
          Platform Config
        </button>
        <button
          type="button"
          data-tab="audit-log"
          onClick={handleTabClick}
          className={tabClass(activeTab === "audit-log")}
        >
          Audit Log
        </button>
        <button
          type="button"
          data-tab="token-network"
          onClick={handleTabClick}
          className={tabClass(activeTab === "token-network")}
        >
          Token &amp; Network Config
        </button>
        <button
          type="button"
          data-tab="admin-users"
          onClick={handleTabClick}
          className={tabClass(activeTab === "admin-users")}
        >
          Admin Users
        </button>
        <button
          type="button"
          data-tab="system-health"
          onClick={handleTabClick}
          className={tabClass(activeTab === "system-health")}
        >
          System Health
        </button>
      </nav>
    </div>
  );
}

// ─── Platform Config Tab ──────────────────────────────────────────────────────

/**
 * Renders a grouped section of platform configuration entries with edit controls.
 * @param props - Component props.
 * @param props.title - Heading text for the section.
 * @param props.entries - Configuration entries belonging to this category.
 * @param props.onEdit - Callback invoked with the entry the user wants to edit.
 * @returns The category section element.
 */
function CategorySection({
  title,
  entries,
  onEdit,
}: {
  title: string;
  entries: PlatformConfigEntry[];
  onEdit: (_entry: PlatformConfigEntry) => void;
}): React.ReactElement | null {
  if (entries.length === 0) return null;
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
        {title}
      </h2>
      <div className="space-y-3">
        {entries.map((entry) => (
          <ConfigCard key={entry.key} entry={entry} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

/** Renders the Platform Config tab with categorised config cards. */
function PlatformConfigTab({
  configs,
  loading,
  onEdit,
}: {
  configs: PlatformConfigEntry[];
  loading: boolean;
  onEdit: (_entry: PlatformConfigEntry) => void;
}): React.ReactElement {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabEntries = configs.filter((e) => !TOKEN_NETWORK_KEYS.has(e.key));

  if (tabEntries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500 text-sm">
          No platform configuration found. Ensure the platform_config table has
          been seeded.
        </p>
      </Card>
    );
  }

  const categorised: Record<string, PlatformConfigEntry[]> = {};
  const uncategorised: PlatformConfigEntry[] = [];
  for (const entry of tabEntries) {
    const cat = CONFIG_CATEGORY[entry.key];
    if (cat !== undefined) {
      if (categorised[cat] === undefined) {
        categorised[cat] = [];
      }
      categorised[cat].push(entry);
    } else {
      uncategorised.push(entry);
    }
  }

  return (
    <div>
      {CATEGORY_ORDER.map((cat) => (
        <CategorySection
          key={cat}
          title={cat}
          entries={categorised[cat] ?? []}
          onEdit={onEdit}
        />
      ))}
      {uncategorised.length > 0 && (
        <CategorySection
          title="Other"
          entries={uncategorised}
          onEdit={onEdit}
        />
      )}
    </div>
  );
}

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

interface AuditFilterState {
  actionType: AdminAuditActionType | "";
  entityType: AdminAuditEntityType | "";
  dateFrom: string;
  dateTo: string;
}

const INITIAL_AUDIT_FILTERS: AuditFilterState = {
  actionType: "",
  entityType: "",
  dateFrom: "",
  dateTo: "",
};

/** Filter bar for the audit log tab with action type, entity type, and date range. */
function AuditFilterBar({
  filters,
  onActionTypeChange,
  onEntityTypeChange,
  onDateFromChange,
  onDateToChange,
  onApply,
  loading,
}: {
  filters: AuditFilterState;
  onActionTypeChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onEntityTypeChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDateFromChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onDateToChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onApply: () => void;
  loading: boolean;
}): React.ReactElement {
  return (
    <div className="flex flex-wrap gap-3 items-end p-4 bg-gray-50 rounded-lg mb-4">
      <div className="flex-1 min-w-[180px]">
        <label
          htmlFor="audit-action-type"
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          Action Type
        </label>
        <select
          id="audit-action-type"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={filters.actionType}
          onChange={onActionTypeChange}
        >
          <option value="">All action types</option>
          {AUDIT_ACTION_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[180px]">
        <label
          htmlFor="audit-entity-type"
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          Entity Type
        </label>
        <select
          id="audit-entity-type"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={filters.entityType}
          onChange={onEntityTypeChange}
        >
          <option value="">All entity types</option>
          {AUDIT_ENTITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[140px]">
        <label
          htmlFor="audit-date-from"
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          Date From
        </label>
        <input
          id="audit-date-from"
          type="date"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={filters.dateFrom}
          onChange={onDateFromChange}
        />
      </div>
      <div className="min-w-[140px]">
        <label
          htmlFor="audit-date-to"
          className="block text-xs font-medium text-gray-600 mb-1"
        >
          Date To
        </label>
        <input
          id="audit-date-to"
          type="date"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          value={filters.dateTo}
          onChange={onDateToChange}
        />
      </div>
      <Button variant="primary" onClick={onApply} disabled={loading}>
        {loading ? "Loading…" : "Apply Filters"}
      </Button>
    </div>
  );
}

/** Table displaying paginated audit log entries. */
function AuditLogTable({
  entries,
  loading,
}: {
  entries: AdminAuditLogEntry[];
  loading: boolean;
}): React.ReactElement {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No audit log entries found.
      </p>
    );
  }

  const tableHead = (
    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
      <tr>
        <th className="px-4 py-3 whitespace-nowrap">Date</th>
        <th className="px-4 py-3">Admin</th>
        <th className="px-4 py-3 whitespace-nowrap">Action</th>
        <th className="px-4 py-3 whitespace-nowrap">Entity Type</th>
        <th className="px-4 py-3">Entity ID</th>
        <th className="px-4 py-3">Old Values</th>
        <th className="px-4 py-3">New Values</th>
      </tr>
    </thead>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        {tableHead}
        <tbody className="divide-y divide-gray-100">
          {entries.map((row) => (
            <tr key={row.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                {formatDateTime(row.createdAt)}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-600 max-w-[120px] truncate">
                {row.adminUserId}
              </td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                {row.actionType.replaceAll("_", " ")}
              </td>
              <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                {row.entityType.replaceAll("_", " ")}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[120px] truncate">
                {row.entityId}
              </td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[160px] truncate">
                {formatJsonPreview(row.oldValues)}
              </td>
              <td className="px-4 py-3 font-mono text-xs max-w-[160px] truncate">
                {formatJsonPreview(row.newValues)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Audit Log tab with filters, table, and pagination controls. */
function AuditLogTab({
  entries,
  loading,
  totalCount,
  totalPages,
  currentPage,
  onFetch,
}: {
  entries: AdminAuditLogEntry[];
  loading: boolean;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  onFetch: (_filters: AdminAuditLogFilters) => Promise<unknown>;
}): React.ReactElement {
  const [filters, setFilters] = useState<AuditFilterState>(
    INITIAL_AUDIT_FILTERS,
  );
  const [appliedFilters, setAppliedFilters] = useState<AdminAuditLogFilters>(
    {},
  );

  useEffect(() => {
    onFetch({}).catch(() => {
      // Error handled internally by hook
    });
  }, [onFetch]);

  const handleActionTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters((prev) => ({
        ...prev,
        actionType: e.target.value as AdminAuditActionType | "",
      }));
    },
    [],
  );

  const handleEntityTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setFilters((prev) => ({
        ...prev,
        entityType: e.target.value as AdminAuditEntityType | "",
      }));
    },
    [],
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, dateFrom: e.target.value }));
    },
    [],
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setFilters((prev) => ({ ...prev, dateTo: e.target.value }));
    },
    [],
  );

  const handleApply = useCallback(() => {
    const newFilters: AdminAuditLogFilters = {
      actionType: filters.actionType !== "" ? filters.actionType : undefined,
      entityType: filters.entityType !== "" ? filters.entityType : undefined,
      dateFrom: filters.dateFrom !== "" ? filters.dateFrom : undefined,
      dateTo: filters.dateTo !== "" ? filters.dateTo : undefined,
      page: 1,
    };
    setAppliedFilters(newFilters);
    onFetch(newFilters).catch(() => {
      // Error handled internally by hook
    });
  }, [filters, onFetch]);

  const handlePrevPage = useCallback(() => {
    onFetch({ ...appliedFilters, page: currentPage - 1 }).catch(() => {
      // Error handled internally by hook
    });
  }, [appliedFilters, currentPage, onFetch]);

  const handleNextPage = useCallback(() => {
    onFetch({ ...appliedFilters, page: currentPage + 1 }).catch(() => {
      // Error handled internally by hook
    });
  }, [appliedFilters, currentPage, onFetch]);

  return (
    <div>
      <AuditFilterBar
        filters={filters}
        onActionTypeChange={handleActionTypeChange}
        onEntityTypeChange={handleEntityTypeChange}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onApply={handleApply}
        loading={loading}
      />
      <Card className="overflow-hidden">
        <AuditLogTable entries={entries} loading={loading} />
      </Card>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-1">
          <span className="text-sm text-gray-500">
            {totalCount} entries · Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage <= 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Token & Network Config Tab ───────────────────────────────────────────────

/**
 * Renders the token and network configuration tab with editable contract addresses and RPC endpoints.
 * @param props - Component props.
 * @param props.configs - Token and network configuration entries to display.
 * @param props.loading - Whether configuration data is still being fetched.
 * @param props.onEdit - Callback invoked with the configuration entry the user wants to edit.
 * @returns The token/network tab element.
 */
function TokenNetworkTab({
  configs,
  loading,
  onEdit,
}: {
  configs: PlatformConfigEntry[];
  loading: boolean;
  onEdit: (_entry: PlatformConfigEntry) => void;
}): React.ReactElement {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tokenNetworkEntries = configs.filter((e) =>
    TOKEN_NETWORK_KEYS.has(e.key),
  );

  if (tokenNetworkEntries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-gray-500 text-sm">
          No token or network configuration found.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {tokenNetworkEntries.map((entry) => (
        <ConfigCard key={entry.key} entry={entry} onEdit={onEdit} />
      ))}
    </div>
  );
}

// ─── Admin Users Tab (UR-S7) ──────────────────────────────────────────────────

/**
 * Renders a table of admin users with their roles and current status.
 * @param props - Component props.
 * @param props.users - Admin user records to display.
 * @param props.loading - Whether user data is still being fetched.
 * @returns The admin users table element.
 */
function AdminUsersTable({
  users,
  loading,
}: {
  users: AdminUserEntry[];
  loading: boolean;
}): React.ReactElement {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-6 text-center">
        No admin users found.
      </p>
    );
  }

  const tableHead = (
    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
      <tr>
        <th className="px-4 py-3">Display Name</th>
        <th className="px-4 py-3">Email</th>
        <th className="px-4 py-3">User ID</th>
        <th className="px-4 py-3 whitespace-nowrap">Joined</th>
      </tr>
    </thead>
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        {tableHead}
        <tbody className="divide-y divide-gray-100">
          {users.map((user) => (
            <tr key={user.userId} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-800">
                {user.displayName ?? "—"}
              </td>
              <td className="px-4 py-3 text-gray-600">{user.email ?? "—"}</td>
              <td className="px-4 py-3 font-mono text-xs text-gray-500 max-w-[160px] truncate">
                {user.userId}
              </td>
              <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                {formatDateTime(user.joinedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Admin User Directory tab — read-only list of platform administrators. */
function AdminUsersTab(): React.ReactElement {
  const [users, setUsers] = useState<AdminUserEntry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    listAdminUsers()
      .then((data) => {
        setUsers(data);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Read-only directory of platform administrator accounts.
      </p>
      <Card className="overflow-hidden">
        <AdminUsersTable users={users} loading={loading} />
      </Card>
    </div>
  );
}

// ─── System Health Tab (UR-S8) ────────────────────────────────────────────────

/**
 * Renders a single system-health row with a label, status color, and optional detail string.
 * @param props - Component props.
 * @param props.label - Health check name.
 * @param props.status - Status string (e.g. `"ok"`, `"warn"`, `"error"`) used to color the indicator.
 * @param props.detail - Optional supporting detail rendered next to the indicator.
 * @returns The health indicator row element.
 */
function HealthIndicator({
  label,
  status,
  detail,
}: {
  label: string;
  status: "ok" | "warn" | "unknown";
  detail: string;
}): React.ReactElement {
  let dot: string;
  if (status === "ok") {
    dot = "bg-emerald-500";
  } else if (status === "warn") {
    dot = "bg-amber-500";
  } else {
    dot = "bg-gray-400";
  }

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-sm font-medium text-gray-700 w-40 shrink-0">
        {label}
      </span>
      <span className="text-sm text-gray-500">{detail}</span>
    </div>
  );
}

/** Compact card displaying a single labelled metric value. */
function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}): React.ReactElement {
  return (
    <Card className="p-4">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </Card>
  );
}

/** System Health tab — platform health indicators and key metrics. */
function SystemHealthTab(): React.ReactElement {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

  useEffect(() => {
    setLoading(true);
    getAdminDashboardStats()
      .then((data) => {
        setStats(data);
        setFetchedAt(new Date());
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  let dbStatus: "ok" | "warn" | "unknown";
  if (loading) {
    dbStatus = "unknown";
  } else if (stats !== null) {
    dbStatus = "ok";
  } else {
    dbStatus = "warn";
  }

  const pendingStatus =
    stats !== null && stats.pendingCharities > 0 ? "warn" : "ok";

  const checkedAt = fetchedAt !== null ? fetchedAt.toLocaleTimeString() : "—";

  return (
    <div className="space-y-6">
      <Card className="px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 pt-3 pb-2">
          Service Status
        </h2>
        {loading ? (
          <div className="flex justify-center py-4">
            <LoadingSpinner size="sm" />
          </div>
        ) : (
          <div>
            <HealthIndicator
              label="Database"
              status={dbStatus}
              detail={
                stats !== null
                  ? `Connected · checked ${checkedAt}`
                  : "Unable to reach database"
              }
            />
            <HealthIndicator
              label="Platform Config"
              status={dbStatus}
              detail={stats !== null ? "Config RPC responding" : "Unavailable"}
            />
            <HealthIndicator
              label="Pending Verifications"
              status={pendingStatus}
              detail={
                stats !== null
                  ? `${String(stats.pendingCharities)} pending`
                  : "Unknown"
              }
            />
          </div>
        )}
      </Card>

      {stats !== null && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Platform Metrics
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total Donors" value={stats.totalDonors} />
            <StatCard label="Charities" value={stats.totalCharities} />
            <StatCard
              label="Verified Charities"
              value={stats.verifiedCharities}
            />
            <StatCard label="Volunteers" value={stats.totalVolunteers} />
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mt-4">
            <StatCard
              label="7-Day Donations"
              value={stats.trends.donations7d}
            />
            <StatCard
              label="30-Day Donations"
              value={stats.trends.donations30d}
            />
            <StatCard
              label="Total Volume (USD)"
              value={`$${stats.totalVolumeUsd.toLocaleString()}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

/**
 * Admin system settings page.
 * Five-tab layout: Platform Config, Audit Log, Token & Network Config,
 * Admin Users directory, and System Health indicators.
 *
 * @function AdminPlatformConfig
 * @returns {JSX.Element} The admin system settings page
 */
export default function AdminPlatformConfig(): React.ReactElement {
  const { configs, loading, saving, fetchConfig, saveConfig } =
    useAdminPlatformConfig();

  const {
    entries: auditEntries,
    loading: auditLoading,
    totalCount: auditTotalCount,
    totalPages: auditTotalPages,
    page: auditPage,
    fetchAuditLog,
  } = useAdminAuditLog();

  const [activeTab, setActiveTab] = useState<SettingsTab>("platform-config");
  const [editingEntry, setEditingEntry] = useState<PlatformConfigEntry | null>(
    null,
  );

  useEffect(() => {
    fetchConfig().catch(() => {
      // Error handled internally by hook
    });
  }, [fetchConfig]);

  const handleTabChange = useCallback((tab: SettingsTab) => {
    setActiveTab(tab);
  }, []);

  const handleEdit = useCallback((entry: PlatformConfigEntry) => {
    setEditingEntry(entry);
  }, []);

  const handleCloseModal = useCallback(() => {
    setEditingEntry(null);
  }, []);

  const handleSaveConfig = useCallback(
    async (key: PlatformConfigKey, value: PlatformConfigValue) => {
      const success = await saveConfig({ key, value });
      if (success) {
        setEditingEntry(null);
      }
    },
    [saveConfig],
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          Platform configuration, audit log, and token/network settings.
        </p>
      </div>

      <TabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === "platform-config" && (
        <PlatformConfigTab
          configs={configs}
          loading={loading}
          onEdit={handleEdit}
        />
      )}

      {activeTab === "audit-log" && (
        <AuditLogTab
          entries={auditEntries}
          loading={auditLoading}
          totalCount={auditTotalCount}
          totalPages={auditTotalPages}
          currentPage={auditPage}
          onFetch={fetchAuditLog}
        />
      )}

      {activeTab === "token-network" && (
        <TokenNetworkTab
          configs={configs}
          loading={loading}
          onEdit={handleEdit}
        />
      )}

      {activeTab === "admin-users" && <AdminUsersTab />}

      {activeTab === "system-health" && <SystemHealthTab />}

      {editingEntry !== null && (
        <EditConfigModal
          entry={editingEntry}
          saving={saving}
          onSave={handleSaveConfig}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}
