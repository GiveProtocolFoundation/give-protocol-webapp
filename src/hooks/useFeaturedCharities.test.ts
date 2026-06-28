import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import { useFeaturedCharities } from "./useFeaturedCharities";

// supabase is mocked globally via moduleNameMapper — setMockResult controls per-table responses.

interface CharityProfileRow {
  ein: string;
  name: string;
  mission: string | null;
  location: string | null;
  logo_url: string | null;
  ntee_code: string | null;
}

function makeRow(
  ein: string,
  overrides?: Partial<CharityProfileRow>,
): CharityProfileRow {
  return {
    ein,
    name: `Charity ${ein}`,
    mission: `Mission for ${ein}`,
    location: "Boston, MA",
    logo_url: `https://example.com/${ein}.jpg`,
    ntee_code: "B",
    ...overrides,
  };
}

describe("useFeaturedCharities", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("returns loading: true on initial mount", async () => {
    // Default mock returns empty data so the hook starts loading.
    const { result } = renderHook(() => useFeaturedCharities());
    expect(result.current.loading).toBe(true);
    // Let the effect resolve so the post-test setState doesn't trigger an act warning.
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns charities and loading: false after successful fetch", async () => {
    const rows = [makeRow("12-3456789"), makeRow("98-7654321")];
    setMockResult("charity_profiles", { data: rows, error: null });

    const { result } = renderHook(() => useFeaturedCharities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.charities).toHaveLength(2);
    // Hook transforms CharityOrganization into FeaturedCharity
    expect(result.current.charities[0].profileId).toBe("12-3456789");
    expect(result.current.charities[0].name).toBe("Charity 12-3456789");
    expect(result.current.charities[0].category).toBe("Education");
    expect(result.current.charities[0].location).toBe("Boston, MA");
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    setMockResult("charity_profiles", {
      data: null,
      error: { message: "Network error" },
    });

    const { result } = renderHook(() => useFeaturedCharities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.charities).toHaveLength(0);
    expect(result.current.error).toBe("Failed to load featured charities");
  });

  it("returns empty array when no platform charities exist", async () => {
    setMockResult("charity_profiles", { data: [], error: null });

    const { result } = renderHook(() => useFeaturedCharities());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.charities).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});
