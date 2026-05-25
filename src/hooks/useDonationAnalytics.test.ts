import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook } from "@testing-library/react";
import { useDonationAnalytics } from "./useDonationAnalytics";
import { useToast } from "@/contexts/ToastContext";
import { supabase, resetMockState } from "@/lib/supabase";

const mockUseToast = useToast as ReturnType<typeof jest.fn>;
const mockShowToast = jest.fn();
const mockRpc = supabase.rpc as ReturnType<typeof jest.fn>;

describe("useDonationAnalytics", () => {
  beforeEach(() => {
    resetMockState();
    mockShowToast.mockClear();
    mockUseToast.mockImplementation(() => ({ showToast: mockShowToast }));
    mockRpc.mockResolvedValue({ data: null, error: null });
  });

  it("should start with null metrics and empty timeseries (no profile)", () => {
    const { result } = renderHook(() => useDonationAnalytics());
    expect(result.current.metrics).toBeNull();
    expect(result.current.timeseriesData).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it("should not call rpc when no profile", () => {
    renderHook(() => useDonationAnalytics());
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("should expose refreshAnalytics function", () => {
    const { result } = renderHook(() => useDonationAnalytics());
    expect(result.current.refreshAnalytics).toBeDefined();
    expect(typeof result.current.refreshAnalytics).toBe("function");
  });
});
