import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, waitFor } from "@testing-library/react";
import { useAuthState } from "./useAuthState";
import { supabase } from "@/lib/supabase";

const mockGetSession = supabase.auth.getSession as ReturnType<typeof jest.fn>;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as ReturnType<
  typeof jest.fn
>;

describe("useAuthState", () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it("should start with loading true", () => {
    const { result } = renderHook(() => useAuthState());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
  });

  it("should set user to null when no session", async () => {
    const { result } = renderHook(() => useAuthState());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toBeNull();
  });

  it("should set user when session exists", async () => {
    const mockUser = { id: "user-1", email: "test@example.com" };
    mockGetSession.mockResolvedValue({
      data: { session: { user: mockUser } },
      error: null,
    });

    const { result } = renderHook(() => useAuthState());
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(result.current.user).toEqual(mockUser);
  });

  it("should subscribe to auth state changes", () => {
    renderHook(() => useAuthState());
    expect(mockOnAuthStateChange).toHaveBeenCalled();
  });
});
