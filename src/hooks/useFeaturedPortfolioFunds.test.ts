import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import { useFeaturedPortfolioFunds } from "./useFeaturedPortfolioFunds";

// supabase is mocked globally via moduleNameMapper — setMockResult controls per-table responses.

interface PortfolioFundRow {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  charity_ids: string[] | null;
}

function makeRow(
  id: string,
  overrides?: Partial<PortfolioFundRow>,
): PortfolioFundRow {
  return {
    id,
    name: `Fund ${id}`,
    description: `Description for fund ${id}`,
    category: "Environment",
    image_url: `https://example.com/${id}.jpg`,
    charity_ids: ["charity-1", "charity-2"],
    ...overrides,
  };
}

describe("useFeaturedPortfolioFunds", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("returns loading: true on initial mount", async () => {
    const { result } = renderHook(() => useFeaturedPortfolioFunds());
    expect(result.current.loading).toBe(true);
    // Let the effect resolve so the post-test setState doesn't trigger an act warning.
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("returns funds and loading: false after successful fetch", async () => {
    const rows = [makeRow("fund-1"), makeRow("fund-2")];
    setMockResult("portfolio_funds", { data: rows, error: null });

    const { result } = renderHook(() => useFeaturedPortfolioFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.funds).toHaveLength(2);
    expect(result.current.funds[0].id).toBe("fund-1");
    expect(result.current.funds[0].name).toBe("Fund fund-1");
    expect(result.current.funds[0].category).toBe("Environment");
    expect(result.current.funds[0].charityCount).toBe(2);
    expect(result.current.error).toBeNull();
  });

  it("sets charityCount to 0 when charity_ids is null", async () => {
    const rows = [makeRow("fund-1", { charity_ids: null })];
    setMockResult("portfolio_funds", { data: rows, error: null });

    const { result } = renderHook(() => useFeaturedPortfolioFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.funds[0].charityCount).toBe(0);
  });

  it("uses 'General' as default category when category is null", async () => {
    const rows = [makeRow("fund-1", { category: null })];
    setMockResult("portfolio_funds", { data: rows, error: null });

    const { result } = renderHook(() => useFeaturedPortfolioFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.funds[0].category).toBe("General");
  });

  it("uses empty string as description when description is null", async () => {
    const rows = [makeRow("fund-1", { description: null })];
    setMockResult("portfolio_funds", { data: rows, error: null });

    const { result } = renderHook(() => useFeaturedPortfolioFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.funds[0].description).toBe("");
  });

  it("uses empty string as imageUrl when image_url is null", async () => {
    const rows = [makeRow("fund-1", { image_url: null })];
    setMockResult("portfolio_funds", { data: rows, error: null });

    const { result } = renderHook(() => useFeaturedPortfolioFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.funds[0].imageUrl).toBe("");
  });

  it("sets error when fetch fails", async () => {
    setMockResult("portfolio_funds", {
      data: null,
      error: { message: "Network error" },
    });

    const { result } = renderHook(() => useFeaturedPortfolioFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.funds).toHaveLength(0);
    expect(result.current.error).toBe("Failed to load portfolio funds");
  });

  it("returns empty array when no active funds exist", async () => {
    setMockResult("portfolio_funds", { data: [], error: null });

    const { result } = renderHook(() => useFeaturedPortfolioFunds());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.funds).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });
});
