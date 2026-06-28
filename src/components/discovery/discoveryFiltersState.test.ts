import { emptyDiscoveryFilters } from "./discoveryFiltersState";
import type {
  DiscoveryFiltersState,
  DiscoveryViewMode,
  DiscoveryFilterCategory,
} from "./discoveryFiltersState";

describe("discoveryFiltersState", () => {
  it("exports emptyDiscoveryFilters with correct defaults", () => {
    const filters: DiscoveryFiltersState = emptyDiscoveryFilters;
    expect(filters.viewMode).toBe("charities");
    expect(filters.searchTerm).toBe("");
    expect(filters.activeCategory).toBe("hq");
    expect(filters.impactLocations).toEqual([]);
    expect(filters.hqLocations).toEqual([]);
    expect(filters.onPlatformOnly).toBe(false);
  });

  it("DiscoveryViewMode accepts valid values", () => {
    const modes: DiscoveryViewMode[] = ["charities", "causes", "portfolios"];
    expect(modes).toHaveLength(3);
  });

  it("DiscoveryFilterCategory accepts valid values", () => {
    const cats: DiscoveryFilterCategory[] = ["impact", "hq"];
    expect(cats).toHaveLength(2);
  });
});
