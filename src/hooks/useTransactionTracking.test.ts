import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useTransactionTracking } from "./useTransactionTracking";
import { useToast } from "@/contexts/ToastContext";
import { resetMockState } from "@/lib/supabase";

const mockUseToast = useToast as ReturnType<typeof jest.fn>;
const mockShowToast = jest.fn();

describe("useTransactionTracking", () => {
  beforeEach(() => {
    resetMockState();
    mockShowToast.mockClear();
    mockUseToast.mockImplementation(() => ({ showToast: mockShowToast }));
  });

  it("should initialize with empty transactions and loading false", async () => {
    const { result } = renderHook(() => useTransactionTracking());

    // With default profile mock (null), fetchTransactions returns early
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.transactions).toEqual([]);
  });

  it("should expose trackTransaction function", () => {
    const { result } = renderHook(() => useTransactionTracking());
    expect(typeof result.current.trackTransaction).toBe("function");
  });

  it("should throw when tracking without profile", async () => {
    const { result } = renderHook(() => useTransactionTracking());

    let threw = false;
    let errorMsg = "";
    try {
      await result.current.trackTransaction("donation", 100);
    } catch (e) {
      threw = true;
      errorMsg = (e as Error).message;
    }

    expect(threw).toBe(true);
    expect(errorMsg).toBe("Profile not found");
  });
});
