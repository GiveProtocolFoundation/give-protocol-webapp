import { emptyDiscoveryFilters } from "./discoveryFiltersState";
import type {
  DiscoveryFiltersState,
  DiscoveryFilterCategory,
} from "./discoveryFiltersState";

describe("discoveryFiltersState", () => {
  it("exports emptyDiscoveryFilters with correct defaults", () => {
    const filters: DiscoveryFiltersState = emptyDiscoveryFilters;
    expect(filters.searchTerm).toBe("");
    expect(filters.activeCategory).toBe("hq");
    expect(filters.impactLocations).toEqual([]);
    expect(filters.hqLocations).toEqual([]);
    expect(filters.onPlatformOnly).toBe(false);
  });

  it("DiscoveryFilterCategory accepts valid values", () => {
    const cats: DiscoveryFilterCategory[] = ["impact", "hq"];
    expect(cats).toHaveLength(2);
  });
});
