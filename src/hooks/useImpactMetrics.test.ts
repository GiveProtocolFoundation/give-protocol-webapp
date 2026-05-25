import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useImpactMetrics } from "./useImpactMetrics";
import { setMockResult, resetMockState } from "@/lib/supabase";

describe("useImpactMetrics", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("should start with loading true", () => {
    const { result } = renderHook(() => useImpactMetrics("fund-1"));
    expect(result.current.loading).toBe(true);
    expect(result.current.metrics).toEqual([]);
  });

  it("should fetch metrics for the given fundId", async () => {
    setMockResult("fund_impact_metrics", {
      data: [
        {
          id: "m1",
          fund_id: "fund-1",
          unit_name: "meals",
          unit_cost_usd: 2.5,
          unit_icon: "utensils",
          description_template: "Provided {count} meals",
          sort_order: 1,
          updated_at: "2026-01-01T00:00:00Z",
        },
      ],
      error: null,
    });

    const { result } = renderHook(() => useImpactMetrics("fund-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].unitName).toBe("meals");
    expect(result.current.metrics[0].fundId).toBe("fund-1");
    expect(result.current.error).toBeNull();
  });

  it("should handle table-missing error gracefully", async () => {
    setMockResult("fund_impact_metrics", {
      data: null,
      error: { code: "42P01", message: "relation does not exist" },
    });

    const { result } = renderHook(() => useImpactMetrics("fund-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should handle PGRST error gracefully", async () => {
    setMockResult("fund_impact_metrics", {
      data: null,
      error: { code: "PGRST204", message: "schema cache lookup failed" },
    });

    const { result } = renderHook(() => useImpactMetrics("fund-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.metrics).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("should set error for non-table-missing DB errors", async () => {
    setMockResult("fund_impact_metrics", {
      data: null,
      error: { code: "23505", message: "Unique constraint violation" },
    });

    const { result } = renderHook(() => useImpactMetrics("fund-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it("should refetch metrics when refetch is called", async () => {
    setMockResult("fund_impact_metrics", { data: [], error: null });

    const { result } = renderHook(() => useImpactMetrics("fund-1"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Trigger refetch
    act(() => {
      result.current.refetch();
    });

    // Should not throw
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
  });
});
