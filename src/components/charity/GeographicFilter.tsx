import React, { useCallback } from "react";
import { CheckCircle, X } from "lucide-react";
import type { LocationFilter } from "@/utils/locationResolver";
import { cn } from "@/utils/cn";

type FilterCategory = "impact" | "hq";

interface GeographicFilterProps {
  /** The active filter category. */
  activeCategory: FilterCategory;
  /** Called when the active category changes. */
  onCategoryChange: (_category: FilterCategory) => void;
  /** Current list of active Impact location filters. */
  impactLocations: LocationFilter[];
  /** Current list of active HQ location filters. */
  hqLocations: LocationFilter[];
  /** Called when the full set of impact locations changes. */
  onImpactLocationsChange: (_locations: LocationFilter[]) => void;
  /** Called when the full set of HQ locations changes. */
  onHqLocationsChange: (_locations: LocationFilter[]) => void;
  /** Whether the "On Platform Only" checkbox is checked. */
  onPlatformOnly: boolean;
  /** Called when the "On Platform Only" checkbox changes. */
  onPlatformOnlyChange: (_e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Optional additional CSS class names. */
  className?: string;
}

interface FilterPillProps {
  /** The location filter to display. */
  location: LocationFilter;
  /** Which category this pill belongs to. */
  category: FilterCategory;
  /** Called with the location id when the remove button is clicked. */
  onRemove: (_id: string) => void;
}

/**
 * Removable pill displaying a geographic filter with its category prefix.
 * @param props - Component props
 * @returns The rendered pill element
 */
function FilterPill({ location, category, onRemove }: FilterPillProps) {
  const handleRemove = useCallback(() => {
    onRemove(location.id);
  }, [onRemove, location.id]);

  const prefix = category === "impact" ? "Impact" : "HQ";

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      {prefix}: {location.displayLabel}
      <button
        type="button"
        onClick={handleRemove}
        aria-label={`Remove ${location.displayLabel}`}
        className="ml-0.5 hover:text-emerald-900 transition-colors"
      >
        <X className="h-3 w-3" aria-hidden="true" />
      </button>
    </span>
  );
}

/**
 * Controls row with a compact segmented toggle for Impact/HQ mode,
 * an "On Platform" checkbox, and removable location filter pills.
 * The location search input is rendered by the parent in a separate row.
 * @param props - Component props
 * @returns The rendered controls row
 */
export const GeographicFilter: React.FC<GeographicFilterProps> = ({
  activeCategory,
  onCategoryChange,
  impactLocations,
  hqLocations,
  onImpactLocationsChange,
  onHqLocationsChange,
  onPlatformOnly,
  onPlatformOnlyChange,
  className,
}) => {
  const handleImpactClick = useCallback(() => {
    onCategoryChange("impact");
  }, [onCategoryChange]);

  const handleHqClick = useCallback(() => {
    onCategoryChange("hq");
  }, [onCategoryChange]);

  const handleRemoveImpact = useCallback(
    (id: string) => {
      onImpactLocationsChange(impactLocations.filter((loc) => loc.id !== id));
    },
    [impactLocations, onImpactLocationsChange],
  );

  const handleRemoveHq = useCallback(
    (id: string) => {
      onHqLocationsChange(hqLocations.filter((loc) => loc.id !== id));
    },
    [hqLocations, onHqLocationsChange],
  );

  const hasPills = impactLocations.length > 0 || hqLocations.length > 0;

  return (
    <div className={cn("flex items-center flex-wrap gap-2", className)}>
      <div
        className="inline-flex rounded-full bg-gray-100 p-0.5 border border-gray-200"
        role="radiogroup"
        aria-label="Location filter mode"
      >
        <button
          type="button"
          role="radio"
          aria-checked={activeCategory === "impact"}
          onClick={handleImpactClick}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-full transition-all",
            activeCategory === "impact"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-gray-600 hover:text-gray-800",
          )}
        >
          Serving In
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={activeCategory === "hq"}
          onClick={handleHqClick}
          className={cn(
            "px-2.5 py-1 text-xs font-medium rounded-full transition-all",
            activeCategory === "hq"
              ? "bg-white text-emerald-700 shadow-sm"
              : "text-gray-600 hover:text-gray-800",
          )}
        >
          Registered In
        </button>
      </div>

      <label
        htmlFor="onPlatform"
        className="inline-flex items-center gap-1 text-xs text-gray-600 cursor-pointer select-none"
      >
        <input
          type="checkbox"
          id="onPlatform"
          checked={onPlatformOnly}
          onChange={onPlatformOnlyChange}
          className="h-3.5 w-3.5 text-emerald-600 rounded border-gray-300"
        />
        <CheckCircle
          aria-hidden="true"
          className="h-3.5 w-3.5 text-emerald-500"
        />
        On Platform
      </label>

      {hasPills && (
        <>
          <span className="w-px h-4 bg-gray-200" aria-hidden="true" />
          {hqLocations.map((loc) => (
            <FilterPill
              key={loc.id}
              location={loc}
              category="hq"
              onRemove={handleRemoveHq}
            />
          ))}
          {impactLocations.map((loc) => (
            <FilterPill
              key={loc.id}
              location={loc}
              category="impact"
              onRemove={handleRemoveImpact}
            />
          ))}
        </>
      )}
    </div>
  );
};
