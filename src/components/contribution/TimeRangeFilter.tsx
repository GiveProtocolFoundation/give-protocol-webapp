import React, { useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface TimeRangeFilterProps {
  value: string;
  onChange: (_value: string) => void;
}

/**
 * TimeRangeFilter component renders a dropdown for selecting a time range filter.
 *
 * @param {string} value - The currently selected time range.
 * @param {(value: string) => void} onChange - Callback invoked when the selected time range changes.
 * @returns {JSX.Element} The select element for filtering by time range.
 */
export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange],
  );

  return (
    <select
      value={value}
      onChange={handleChange}
      className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
      aria-label={t("tracker.timeRange.label", "Filter by time range")}
    >
      <option value="all">{t("tracker.timeRange.all", "All Time")}</option>
      <option value="year">{t("tracker.timeRange.year", "This Year")}</option>
      <option value="month">
        {t("tracker.timeRange.month", "This Month")}
      </option>
      <option value="week">{t("tracker.timeRange.week", "This Week")}</option>
    </select>
  );
};
