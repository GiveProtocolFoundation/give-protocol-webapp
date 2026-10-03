import type { LocationFilter } from "@/utils/locationResolver";

/** Which geographic filter dimension is active (impact location vs HQ location). */
export type DiscoveryFilterCategory = "impact" | "hq";

/** Shared filter state for the discovery/browse page. */
export interface DiscoveryFiltersState {
  searchTerm: string;
  activeCategory: DiscoveryFilterCategory;
  impactLocations: LocationFilter[];
  hqLocations: LocationFilter[];
  onPlatformOnly: boolean;
}

/** Empty filter state — useful as a default when wiring a new consumer. */
export const emptyDiscoveryFilters: DiscoveryFiltersState = {
  searchTerm: "",
  activeCategory: "hq",
  impactLocations: [],
  hqLocations: [],
  onPlatformOnly: false,
};
