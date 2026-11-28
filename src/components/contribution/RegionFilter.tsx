import React, { useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface RegionFilterProps {
  value: string;
  onChange: (_value: string) => void;
}

/**
 * Component for filtering rankings by the region the giver is from (UNICEF reporting regions).
 * @param {string} value - The currently selected region: "all", a region id, or "unspecified".
 * @param {(value: string) => void} onChange - Callback invoked when the selected region changes.
 * @returns {JSX.Element} A dropdown select element for choosing regions.
 */
export const RegionFilter: React.FC<RegionFilterProps> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  /**
   * Handles the select change event and invokes the onChange callback with the selected value.
   * @param {React.ChangeEvent<HTMLSelectElement>} e - The change event for the select element.
   * @returns {void}
   */
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
        aria-label={t("tracker.giverRegion.label", "Filter by giver region")}
      >
        <option value="all">
          {t("tracker.giverRegion.all", "All giver regions")}
        </option>
        <option value="na">
          {t("tracker.giverRegion.na", "North America")}
        </option>
        <option value="lac">
          {t("tracker.giverRegion.lac", "Latin America and Caribbean")}
        </option>
        <option value="eca">
          {t("tracker.giverRegion.eca", "Europe and Central Asia")}
        </option>
        <option value="mena">
          {t("tracker.giverRegion.mena", "Middle East and North Africa")}
        </option>
        <option value="ssa">
          {t("tracker.giverRegion.ssa", "Sub-Saharan Africa")}
        </option>
        <option value="sa">{t("tracker.giverRegion.sa", "South Asia")}</option>
        <option value="eap">
          {t("tracker.giverRegion.eap", "East Asia and Pacific")}
        </option>
        <option value="unspecified">
          {t("tracker.giverRegion.unspecified", "Region not specified")}
        </option>
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
        aria-hidden="true"
      />
    </span>
  );
};
