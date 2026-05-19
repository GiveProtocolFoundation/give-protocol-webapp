import type { LocationFilter } from "@/utils/locationResolver";

/** Which tab is active on the discovery/browse page. */
export type DiscoveryViewMode = "charities" | "causes" | "portfolios";
/** Which geographic filter dimension is active (impact location vs HQ location). */
export type DiscoveryFilterCategory = "impact" | "hq";

/** Shared filter state for the discovery/browse page. */
export interface DiscoveryFiltersState {
  viewMode: DiscoveryViewMode;
  searchTerm: string;
  activeCategory: DiscoveryFilterCategory;
  impactLocations: LocationFilter[];
  hqLocations: LocationFilter[];
  onPlatformOnly: boolean;
}

/** Empty filter state — useful as a default when wiring a new consumer. */
export const emptyDiscoveryFilters: DiscoveryFiltersState = {
  viewMode: "charities",
  searchTerm: "",
  activeCategory: "hq",
  impactLocations: [],
  hqLocations: [],
  onPlatformOnly: false,
};
