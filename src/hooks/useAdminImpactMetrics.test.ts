import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useAdminImpactMetrics } from "./useAdminImpactMetrics";
import { setMockResult, resetMockState } from "@/lib/supabase";

describe("useAdminImpactMetrics", () => {
  beforeEach(() => {
    resetMockState();
  });

  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useAdminImpactMetrics());
    expect(result.current.metrics).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("should fetch metrics successfully", async () => {
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

    const { result } = renderHook(() => useAdminImpactMetrics());

    await act(async () => {
      await result.current.fetchAllMetrics();
    });

    expect(result.current.metrics).toHaveLength(1);
    expect(result.current.metrics[0].unitName).toBe("meals");
    expect(result.current.metrics[0].unitCostUsd).toBe(2.5);
    expect(result.current.loading).toBe(false);
  });

  it("should handle fetch error", async () => {
    setMockResult("fund_impact_metrics", {
      data: null,
      error: new Error("DB connection failed"),
    });

    const { result } = renderHook(() => useAdminImpactMetrics());

    await act(async () => {
      await result.current.fetchAllMetrics();
    });

    expect(result.current.error).toBe("DB connection failed");
    expect(result.current.metrics).toEqual([]);
  });

  it("should create a metric successfully", async () => {
    setMockResult("fund_impact_metrics", { data: [], error: null });

    const { result } = renderHook(() => useAdminImpactMetrics());

    let success = false;
    await act(async () => {
      success = await result.current.createMetric({
        fund_id: "fund-1",
        unit_name: "trees",
        unit_cost_usd: 10,
        unit_icon: "tree",
        description_template: "Planted {count} trees",
        sort_order: 1,
      });
    });

    expect(success).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("should handle create error", async () => {
    setMockResult("fund_impact_metrics", {
      data: null,
      error: new Error("Insert failed"),
    });

    const { result } = renderHook(() => useAdminImpactMetrics());

    let success = true;
    await act(async () => {
      success = await result.current.createMetric({
        fund_id: "fund-1",
        unit_name: "trees",
        unit_cost_usd: 10,
        unit_icon: "tree",
        description_template: "Planted {count} trees",
        sort_order: 1,
      });
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Insert failed");
  });

  it("should delete a metric successfully", async () => {
    setMockResult("fund_impact_metrics", { data: [], error: null });

    const { result } = renderHook(() => useAdminImpactMetrics());

    let success = false;
    await act(async () => {
      success = await result.current.deleteMetric("m1");
    });

    expect(success).toBe(true);
  });

  it("should handle delete error", async () => {
    setMockResult("fund_impact_metrics", {
      data: null,
      error: new Error("Delete failed"),
    });

    const { result } = renderHook(() => useAdminImpactMetrics());

    let success = true;
    await act(async () => {
      success = await result.current.deleteMetric("m1");
    });

    expect(success).toBe(false);
    expect(result.current.error).toBe("Delete failed");
  });
});
