import React, { useCallback } from "react";
import { SelfReportedHoursCard } from "./SelfReportedHoursCard";
import {
  SelfReportedHoursDisplay,
  ValidationStatus,
  ACTIVITY_TYPE_LABELS,
  ActivityType,
  SelfReportedHoursFilters,
} from "@/types/selfReportedHours";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ClipboardList } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/** Filter panel with status, activity type, and date range controls for self-reported hours. */
const HoursFilterPanel: React.FC<{
  filters: SelfReportedHoursFilters;
  onStatusChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onActivityTypeChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDateFromChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onDateToChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}> = ({ filters, onStatusChange, onActivityTypeChange, onDateFromChange, onDateToChange, onClearFilters, hasActiveFilters }) => {
  const { t } = useTranslation();
  return (
    <div className="mb-6 p-4 bg-gray-50 rounded-lg flex flex-wrap gap-4 items-end">
      <label htmlFor="status-filter" className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">{t("volunteer.statusFilter", "Status")}</span>
        <select
          id="status-filter"
          value={filters.status || ""}
          onChange={onStatusChange}
          className="block w-36 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">{t("volunteer.allStatuses", "All")}</option>
          <option value={ValidationStatus.VALIDATED}>{t("status.completed", "Validated")}</option>
          <option value={ValidationStatus.PENDING}>{t("status.pending", "Pending")}</option>
          <option value={ValidationStatus.UNVALIDATED}>{t("volunteer.unvalidatedHours", "Unvalidated")}</option>
          <option value={ValidationStatus.REJECTED}>{t("volunteer.rejectedLabel", "Rejected")}</option>
          <option value={ValidationStatus.EXPIRED}>{t("admin.validation.expired", "Expired")}</option>
        </select>
      </label>
      <label htmlFor="activity-filter" className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">{t("volunteer.activityTypeFilter", "Activity Type")}</span>
        <select
          id="activity-filter"
          value={filters.activityType || ""}
          onChange={onActivityTypeChange}
          className="block w-44 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
        >
          <option value="">{t("volunteer.allActivityTypes", "All Types")}</option>
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label htmlFor="date-from" className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">{t("volunteer.filterFrom", "From")}</span>
        <input
          id="date-from"
          type="date"
          value={filters.dateFrom || ""}
          onChange={onDateFromChange}
          className="block border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
        />
      </label>
      <label htmlFor="date-to" className="block">
        <span className="block text-xs font-medium text-gray-500 mb-1">{t("volunteer.filterTo", "To")}</span>
        <input
          id="date-to"
          type="date"
          value={filters.dateTo || ""}
          onChange={onDateToChange}
          className="block border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
        />
      </label>
      {hasActiveFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="text-sm text-emerald-600 hover:text-emerald-700 underline"
        >
          {t("volunteer.clearFilters", "Clear filters")}
        </button>
      )}
    </div>
  );
};

interface SelfReportedHoursListProps {
  records: SelfReportedHoursDisplay[];
  loading: boolean;
  filters: SelfReportedHoursFilters;
  onFilterChange: (_filters: SelfReportedHoursFilters) => void;
  onView: (_id: string) => void;
  onEdit: (_id: string) => void;
  onDelete: (_id: string) => void;
}

/**
 * Component displaying a filterable list of self-reported hours records
 * @param props - Component props
 * @returns JSX element
 */
export const SelfReportedHoursList: React.FC<SelfReportedHoursListProps> = ({
  records,
  loading,
  filters,
  onFilterChange,
  onView,
  onEdit,
  onDelete,
}) => {
  const { t } = useTranslation();

  const handleStatusChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFilterChange({
        ...filters,
        status: value ? (value as ValidationStatus) : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleActivityTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      onFilterChange({
        ...filters,
        activityType: value ? (value as ActivityType) : undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleDateFromChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({
        ...filters,
        dateFrom: e.target.value || undefined,
      });
    },
    [filters, onFilterChange],
  );

  const handleDateToChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onFilterChange({
        ...filters,
        dateTo: e.target.value || undefined,
      });
    },
    [filters, onFilterChange],
  );

  const clearFilters = useCallback(() => {
    onFilterChange({});
  }, [onFilterChange]);

  const hasActiveFilters = Boolean(
    filters.status ||
    filters.activityType ||
    filters.dateFrom ||
    filters.dateTo,
  );

  return (
    <div>
      {/* Filters */}
      <HoursFilterPanel
        filters={filters}
        onStatusChange={handleStatusChange}
        onActivityTypeChange={handleActivityTypeChange}
        onDateFromChange={handleDateFromChange}
        onDateToChange={handleDateToChange}
        onClearFilters={clearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Records List */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      )}
      {!loading && records.length === 0 ? (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            {hasActiveFilters
              ? t("volunteer.noMatchingRecords", "No matching records")
              : t("volunteer.noHoursLogged", "No volunteer hours logged yet")}
          </h3>
          <p className="text-gray-500">
            {hasActiveFilters
              ? t("volunteer.adjustFilters", "Try adjusting your filters to find records.")
              : t("volunteer.startLogging", "Start by logging your first volunteer hours.")}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map((record) => (
            <SelfReportedHoursCard
              key={record.id}
              record={record}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SelfReportedHoursList;
