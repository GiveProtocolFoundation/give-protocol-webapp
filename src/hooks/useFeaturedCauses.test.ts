import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import { useFeaturedCauses } from "./useFeaturedCauses";

// supabase is mocked globally via moduleNameMapper — setMockResult controls per-table responses.

interface CauseRow {
  id: string;
  name: string;
  description: string;
  category: string;
  image_url: string | null;
  target_amount: number;
  raised_amount: number;
  location: string | null;
  charity_id: string;
}

interface ProfileRow {
  id: string;
  name: string;
}

function makeRow(id: string, overrides?: Partial<CauseRow>): CauseRow {
  return {
    id,
    name: `Cause ${id}`,
    description: `Description for cause ${id}`,
    category: "Environment",
    image_url: `https://example.com/${id}.jpg`,
    target_amount: 10000,
    raised_amount: 5000,
    location: "East Africa",
    charity_id: `charity-${id}`,
    ...overrides,
  };
}

function makeProfile(id: string, name: string): ProfileRow {
  return { id, name };
}

describe("useFeaturedCauses", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("returns loading: true on initial mount", async () => {
    const { result } = renderHook(() => useFeaturedCauses());
    expect(result.current.loading).toBe(true);
    // Let the effect resolve so the post-test setState doesn't trigger an act warning.
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns causes and loading: false after successful fetch", async () => {
    const rows = [makeRow("1"), makeRow("2")];
    setMockResult("causes", { data: rows, error: null });
    setMockResult("charity_profiles", {
      data: [
        makeProfile("charity-1", "Charity One"),
        makeProfile("charity-2", "Charity Two"),
      ],
      error: null,
    });

    const { result } = renderHook(() => useFeaturedCauses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.causes).toHaveLength(2);
    expect(result.current.causes[0].id).toBe("1");
    expect(result.current.causes[0].name).toBe("Cause 1");
    expect(result.current.causes[0].charityName).toBe("Charity One");
    expect(result.current.causes[0].targetAmount).toBe(10000);
    expect(result.current.causes[0].raisedAmount).toBe(5000);
    expect(result.current.causes[0].location).toBe("East Africa");
    expect(result.current.error).toBeNull();
  });

  it("sets error when fetch fails", async () => {
    setMockResult("causes", {
      data: null,
      error: { message: "Network error" },
    });

    const { result } = renderHook(() => useFeaturedCauses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.causes).toHaveLength(0);
    expect(result.current.error).toBe("Failed to load featured causes");
  });

  it("returns empty array when no active causes exist", async () => {
    setMockResult("causes", { data: [], error: null });

    const { result } = renderHook(() => useFeaturedCauses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.causes).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it("maps null image_url to empty string", async () => {
    setMockResult("causes", {
      data: [makeRow("1", { image_url: null })],
      error: null,
    });
    setMockResult("charity_profiles", {
      data: [makeProfile("charity-1", "Test Charity")],
      error: null,
    });

    const { result } = renderHook(() => useFeaturedCauses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.causes[0].imageUrl).toBe("");
  });

  it("maps null location to undefined", async () => {
    setMockResult("causes", {
      data: [makeRow("1", { location: null })],
      error: null,
    });
    setMockResult("charity_profiles", {
      data: [makeProfile("charity-1", "Test Charity")],
      error: null,
    });

    const { result } = renderHook(() => useFeaturedCauses());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.causes[0].location).toBeUndefined();
  });
});
