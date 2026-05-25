import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { useAdminPanel } from "./useAdminPanel";
import { useToast } from "@/contexts/ToastContext";
import { setMockResult, resetMockState } from "@/lib/supabase";

const mockUseToast = useToast as ReturnType<typeof jest.fn>;
const mockShowToast = jest.fn();

describe("useAdminPanel", () => {
  beforeEach(() => {
    resetMockState();
    mockShowToast.mockClear();
    mockUseToast.mockImplementation(() => ({ showToast: mockShowToast }));
  });

  it("should initialize with loading false", () => {
    const { result } = renderHook(() => useAdminPanel());
    expect(result.current.loading).toBe(false);
  });

  it("should return empty array when no profile (default mock)", async () => {
    const { result } = renderHook(() => useAdminPanel());

    let data: unknown;
    await act(async () => {
      data = await result.current.fetchPendingVerifications();
    });

    expect(data).toEqual([]);
  });

  it("should expose updateVerificationStatus function", () => {
    const { result } = renderHook(() => useAdminPanel());
    expect(typeof result.current.updateVerificationStatus).toBe("function");
  });

  it("should expose fetchPendingVerifications function", () => {
    const { result } = renderHook(() => useAdminPanel());
    expect(typeof result.current.fetchPendingVerifications).toBe("function");
  });
});
