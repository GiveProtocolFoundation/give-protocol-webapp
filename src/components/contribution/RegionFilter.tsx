import React, { useCallback } from "react";
import { useTranslation } from "@/hooks/useTranslation";

interface RegionFilterProps {
  value: string;
  onChange: (_value: string) => void;
}

/**
 * Component for filtering items by region.
 * @param {string} value - The currently selected region.
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
    <select
      value={value}
      onChange={handleChange}
      className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
      aria-label={t("tracker.region.label", "Filter by region")}
    >
      <option value="all">{t("tracker.region.all", "All Regions")}</option>
      <option value="na">{t("tracker.region.na", "North America")}</option>
      <option value="eu">{t("tracker.region.eu", "Europe")}</option>
      <option value="asia">{t("tracker.region.asia", "Asia")}</option>
      <option value="africa">{t("tracker.region.africa", "Africa")}</option>
      <option value="sa">{t("tracker.region.sa", "South America")}</option>
      <option value="oceania">{t("tracker.region.oceania", "Oceania")}</option>
    </select>
  );
};
