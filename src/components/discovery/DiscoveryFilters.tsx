import React, { useCallback, useState } from "react";
import { Search, MapPin } from "lucide-react";
import { GeographicFilter } from "@/components/charity/GeographicFilter";
import { Button } from "@/components/ui/Button";
import { resolveLocation } from "@/utils/locationResolver";
import type { LocationFilter } from "@/utils/locationResolver";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/hooks/useTranslation";
import type {
  DiscoveryFilterCategory,
  DiscoveryFiltersState,
} from "./discoveryFiltersState";

interface DiscoveryFiltersProps {
  value: DiscoveryFiltersState;
  onChange: (_next: DiscoveryFiltersState) => void;
  /** If false, the Charities/Causes/Portfolios toggle is hidden. Default: true. */
  showViewToggle?: boolean;
  className?: string;
}

/**
 * Composite filter block for the /browse page: view-mode toggle,
 * search + location dual-input, and the GeographicFilter pill set with an
 * "on platform only" checkbox. Stateless — the caller owns the filter state.
 */
export const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({
  value,
  onChange,
  showViewToggle = true,
  className,
}) => {
  const { t } = useTranslation();
  const [locationInput, setLocationInput] = useState("");

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, searchTerm: e.target.value });
    },
    [value, onChange],
  );

  const handleLocationInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocationInput(e.target.value);
    },
    [],
  );

  const handleLocationKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      const trimmed = locationInput.trim();
      if (trimmed.length === 0) return;

      const location = resolveLocation(trimmed);
      const current =
        value.activeCategory === "impact"
          ? value.impactLocations
          : value.hqLocations;

      if (current.some((loc) => loc.id === location.id)) {
        setLocationInput("");
        return;
      }

      const nextList = [...current, location];
      onChange({
        ...value,
        impactLocations:
          value.activeCategory === "impact" ? nextList : value.impactLocations,
        hqLocations:
          value.activeCategory === "hq" ? nextList : value.hqLocations,
      });
      setLocationInput("");
    },
    [locationInput, value, onChange],
  );

  const handleCategoryChange = useCallback(
    (category: DiscoveryFilterCategory) => {
      onChange({ ...value, activeCategory: category });
    },
    [value, onChange],
  );

  const handleImpactLocationsChange = useCallback(
    (locations: LocationFilter[]) => {
      onChange({ ...value, impactLocations: locations });
    },
    [value, onChange],
  );

  const handleHqLocationsChange = useCallback(
    (locations: LocationFilter[]) => {
      onChange({ ...value, hqLocations: locations });
    },
    [value, onChange],
  );

  const handleOnPlatformChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ ...value, onPlatformOnly: e.target.checked });
    },
    [value, onChange],
  );

  const handleCharitiesClick = useCallback(() => {
    onChange({ ...value, viewMode: "charities" });
  }, [value, onChange]);

  const handleCausesClick = useCallback(() => {
    onChange({ ...value, viewMode: "causes" });
  }, [value, onChange]);

  const handlePortfoliosClick = useCallback(() => {
    onChange({ ...value, viewMode: "portfolios" });
  }, [value, onChange]);

  const isCharities = value.viewMode === "charities";

  return (
    <div className={cn("space-y-3", className)}>
      {showViewToggle && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant={value.viewMode === "charities" ? "primary" : "secondary"}
            onClick={handleCharitiesClick}
          >
            {t("browse.tabs.charities", "Charities")}
          </Button>
          <Button
            variant={value.viewMode === "causes" ? "primary" : "secondary"}
            onClick={handleCausesClick}
          >
            {t("browse.tabs.causes", "Causes")}
          </Button>
          <Button
            variant={value.viewMode === "portfolios" ? "primary" : "secondary"}
            onClick={handlePortfoliosClick}
          >
            {t("browse.tabs.funds", "Portfolio Funds")}
          </Button>
        </div>
      )}

      <div className="flex gap-3">
        <div className={cn("relative", isCharities ? "flex-[7]" : "flex-grow")}>
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
          />
          <input
            type="search"
            value={value.searchTerm}
            onChange={handleSearchChange}
            placeholder={t(
              "browse.filter.searchPlaceholder",
              "Search charities...",
            )}
            aria-label={t("browse.filter.searchAria", "Search charities")}
            className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
        {isCharities && (
          <div className="relative flex-[3]">
            <MapPin
              aria-hidden="true"
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            />
            <input
              type="text"
              value={locationInput}
              onChange={handleLocationInputChange}
              onKeyDown={handleLocationKeyDown}
              placeholder={t(
                "browse.filter.locationPlaceholder",
                "City, state, or country...",
              )}
              aria-label={t("browse.filter.locationAria", "Search location")}
              className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        )}
      </div>

      {isCharities && (
        <GeographicFilter
          activeCategory={value.activeCategory}
          onCategoryChange={handleCategoryChange}
          impactLocations={value.impactLocations}
          hqLocations={value.hqLocations}
          onImpactLocationsChange={handleImpactLocationsChange}
          onHqLocationsChange={handleHqLocationsChange}
          onPlatformOnly={value.onPlatformOnly}
          onPlatformOnlyChange={handleOnPlatformChange}
        />
      )}
    </div>
  );
};
