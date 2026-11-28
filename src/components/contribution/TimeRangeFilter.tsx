import React, { useCallback } from "react";
import { ChevronDown } from "lucide-react";
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
    <span className="relative inline-flex shrink-0">
      <select
        value={value}
        onChange={handleChange}
        className="appearance-none bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 border border-gray-300 rounded-[10px] shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 font-medium pl-3 pr-9 py-2 text-sm w-full transition-all duration-200 cursor-pointer"
        aria-label={t("tracker.timeRange.label", "Filter by time range")}
      >
        <option value="all">{t("tracker.timeRange.all", "All Time")}</option>
        <option value="year">{t("tracker.timeRange.year", "This Year")}</option>
        <option value="month">
          {t("tracker.timeRange.month", "This Month")}
        </option>
        <option value="week">{t("tracker.timeRange.week", "This Week")}</option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden="true"
      />
    </span>
  );
};
