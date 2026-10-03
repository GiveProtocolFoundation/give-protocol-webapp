import React, { useCallback, useState } from "react";
import { Search, MapPin, Plus } from "lucide-react";
import { GeographicFilter } from "@/components/charity/GeographicFilter";
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
  className?: string;
}

/** Minimum characters before a search term is sent to the backend. */
const MIN_SEARCH_CHARS = 2;

interface LocationInputProps {
  value: string;
  onChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown: (_e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAdd: () => void;
}

/** Location text box with an explicit Add button (Enter also applies it). */
function LocationInput({
  value,
  onChange,
  onKeyDown,
  onAdd,
}: LocationInputProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2 sm:flex-[3]">
      <div className="relative flex-1">
        <MapPin
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
        />
        <input
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={t(
            "browse.filter.locationPlaceholder",
            "City, state, or country...",
          )}
          aria-label={t("browse.filter.locationAria", "Search location")}
          aria-describedby="browse-location-hint"
          className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      </div>
      <button
        type="button"
        onClick={onAdd}
        disabled={value.trim().length === 0}
        aria-label={t("browse.filter.addLocation", "Add location")}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-emerald-500 hover:text-emerald-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <Plus aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}

/**
 * Composite filter block for the /browse Charities tab: search + location
 * dual-input and the GeographicFilter pill set with an "on platform only"
 * checkbox. Stateless — the caller owns the filter state.
 * @param props - Current filter state and change handler
 * @returns The filter block
 */
export const DiscoveryFilters: React.FC<DiscoveryFiltersProps> = ({
  value,
  onChange,
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

  const commitLocation = useCallback(() => {
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
      hqLocations: value.activeCategory === "hq" ? nextList : value.hqLocations,
    });
    setLocationInput("");
  }, [locationInput, value, onChange]);

  const handleLocationKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      commitLocation();
    },
    [commitLocation],
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

  const searchLength = value.searchTerm.trim().length;
  const showMinCharsHint = searchLength > 0 && searchLength < MIN_SEARCH_CHARS;
  const showImpactNotice = value.impactLocations.length > 0;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative sm:flex-[7]">
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
            aria-describedby={
              showMinCharsHint ? "browse-search-hint" : undefined
            }
            className="w-full h-11 pl-10 pr-4 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-md focus:ring-emerald-500 focus:border-emerald-500 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
        </div>
        <LocationInput
          value={locationInput}
          onChange={handleLocationInputChange}
          onKeyDown={handleLocationKeyDown}
          onAdd={commitLocation}
        />
      </div>

      <p
        id="browse-location-hint"
        className="text-xs text-gray-500 dark:text-gray-400"
      >
        {t(
          "browse.filter.locationHint",
          "Press Enter or choose Add to apply a location.",
        )}
      </p>

      {showMinCharsHint && (
        <p
          id="browse-search-hint"
          role="status"
          className="text-xs text-amber-700 dark:text-amber-400"
        >
          {t("browse.filter.minChars", "Type at least 2 characters to search.")}
        </p>
      )}

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

      {showImpactNotice && (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
          {t(
            "browse.filter.impactNotice",
            "Impact-location filtering isn't available yet, so results are not narrowed by impact location.",
          )}
        </p>
      )}
    </div>
  );
};
