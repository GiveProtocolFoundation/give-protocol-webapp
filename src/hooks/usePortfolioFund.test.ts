import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import { usePortfolioFund } from "./usePortfolioFund";

// supabase is mocked globally via moduleNameMapper — setMockResult controls per-table responses.

const FUND_ID = "fd000001-0000-4000-8000-000000000001";

function makeFundRow(overrides?: Record<string, unknown>) {
  return {
    id: FUND_ID,
    name: "Environmental Impact Fund",
    description: "Supporting climate action and conservation.",
    category: "Environment",
    image_url: "/images/charities/99-1230003.jpg",
    charity_ids: ["charity-1", "charity-2"],
    ...overrides,
  };
}

function makeCharityRow(id: string, overrides?: Record<string, unknown>) {
  return {
    id,
    ein: `99-123000${id.at(-1)}`,
    name: `Charity ${id}`,
    mission: `Mission for ${id}`,
    location: "Portland, OR",
    logo_url: `/images/charities/${id}.jpg`,
    status: "verified",
    ...overrides,
  };
}

describe("usePortfolioFund", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("returns loading: true on initial mount", async () => {
    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    expect(result.current.loading).toBe(true);
    // Let the effect resolve so the post-test setState doesn't trigger an act warning.
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns the fund and its member charities after a successful fetch", async () => {
    setMockResult("portfolio_funds", { data: makeFundRow(), error: null });
    setMockResult("charity_profiles", {
      data: [makeCharityRow("charity-1"), makeCharityRow("charity-2")],
      error: null,
    });

    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.fund).not.toBeNull();
    expect(result.current.fund?.name).toBe("Environmental Impact Fund");
    expect(result.current.fund?.category).toBe("Environment");
    expect(result.current.fund?.charities).toHaveLength(2);
    expect(result.current.fund?.charities[0].name).toBe("Charity charity-1");
    expect(result.current.fund?.charities[0].verified).toBe(true);
  });

  it("marks a charity unverified when its status is not 'verified'", async () => {
    setMockResult("portfolio_funds", { data: makeFundRow(), error: null });
    setMockResult("charity_profiles", {
      data: [makeCharityRow("charity-1", { status: "unclaimed" })],
      error: null,
    });

    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fund?.charities[0].verified).toBe(false);
  });

  it("falls back to empty strings and a default category on null columns", async () => {
    setMockResult("portfolio_funds", {
      data: makeFundRow({
        description: null,
        category: null,
        image_url: null,
        charity_ids: null,
      }),
      error: null,
    });

    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fund?.description).toBe("");
    expect(result.current.fund?.category).toBe("General");
    expect(result.current.fund?.imageUrl).toBe("");
    expect(result.current.fund?.charities).toEqual([]);
  });

  it("normalises null charity profile columns to empty strings", async () => {
    setMockResult("portfolio_funds", { data: makeFundRow(), error: null });
    setMockResult("charity_profiles", {
      data: [
        makeCharityRow("charity-1", {
          mission: null,
          location: null,
          logo_url: null,
        }),
      ],
      error: null,
    });

    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fund?.charities[0].mission).toBe("");
    expect(result.current.fund?.charities[0].location).toBe("");
    expect(result.current.fund?.charities[0].imageUrl).toBe("");
  });

  it("reports not-found when no fund row matches the id", async () => {
    setMockResult("portfolio_funds", { data: null, error: null });

    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fund).toBeNull();
    expect(result.current.error).toBe("Portfolio fund not found");
  });

  it("reports not-found without querying when the id is undefined", async () => {
    const { result } = renderHook(() => usePortfolioFund());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.fund).toBeNull();
    expect(result.current.error).toBe("Portfolio fund not found");
  });

  it("sets an error when the fund query fails", async () => {
    setMockResult("portfolio_funds", {
      data: null,
      error: { message: "boom" },
    });

    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fund).toBeNull();
    expect(result.current.error).toBe("Failed to load portfolio fund");
  });

  it("sets an error when the charity profile query fails", async () => {
    setMockResult("portfolio_funds", { data: makeFundRow(), error: null });
    setMockResult("charity_profiles", {
      data: null,
      error: { message: "boom" },
    });

    const { result } = renderHook(() => usePortfolioFund(FUND_ID));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.fund).toBeNull();
    expect(result.current.error).toBe("Failed to load portfolio fund");
  });
});
