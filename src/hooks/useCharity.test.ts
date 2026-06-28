import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { supabase, setMockResult, resetMockState } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { useCharity } from "./useCharity";

// supabase and logger are mocked via moduleNameMapper in jest.config.mjs
const mockLogger = Logger as { error: jest.Mock };
const mockSupabase = supabase as { from: jest.Mock };

const mockCharity = {
  id: "charity-1",
  name: "Test Charity",
  mission: null,
  location: null,
  website: null,
  logo_url: null,
  banner_image_url: null,
  ntee_code: null,
  status: "verified",
  ein: "123456789",
  description: null,
  contact_email: null,
  founded: null,
  employees: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const mockCauses = [
  {
    id: "cause-1",
    charity_id: "charity-1",
    name: "Education",
    description: "Help kids",
    target_amount: 5000,
    raised_amount: 1000,
    category: "education",
    image_url: null,
    location: "New York",
    timeline: null,
    status: "active",
    created_at: "2024-01-01",
  },
];

describe("useCharity", () => {
  beforeEach(() => {
    resetMockState();
    mockLogger.error.mockClear();
    setMockResult("charity_profiles", { data: mockCharity, error: null });
    setMockResult("causes", { data: mockCauses, error: null });
  });

  it("fetches both charity and causes on mount", async () => {
    const { result } = renderHook(() => useCharity("charity-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.charity).toEqual(mockCharity);
    expect(result.current.causes).toEqual(mockCauses);
    expect(result.current.error).toBeNull();
    expect(mockSupabase.from).toHaveBeenCalledWith("charity_profiles");
    expect(mockSupabase.from).toHaveBeenCalledWith("causes");
  });

  it("refresh fetches both charity and causes", async () => {
    const { result } = renderHook(() => useCharity("charity-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const updatedCharity = { ...mockCharity, name: "Updated Charity" };
    const updatedCauses = [{ ...mockCauses[0], name: "Health" }];
    setMockResult("charity_profiles", { data: updatedCharity, error: null });
    setMockResult("causes", { data: updatedCauses, error: null });

    mockSupabase.from.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("charity_profiles");
    expect(mockSupabase.from).toHaveBeenCalledWith("causes");
    expect(result.current.charity).toEqual(updatedCharity);
    expect(result.current.causes).toEqual(updatedCauses);
  });

  it("refresh updates causes state alongside charity", async () => {
    const { result } = renderHook(() => useCharity("charity-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    const newCause = { ...mockCauses[0], id: "cause-2", name: "New Cause" };
    setMockResult("causes", { data: [newCause], error: null });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.causes).toEqual([newCause]);
  });

  it("refresh sets error when charity fetch fails", async () => {
    const { result } = renderHook(() => useCharity("charity-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    setMockResult("charity_profiles", {
      data: null,
      error: { message: "Charity not found" },
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Charity not found");
  });

  it("refresh sets error when causes fetch fails", async () => {
    const { result } = renderHook(() => useCharity("charity-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    setMockResult("causes", {
      data: null,
      error: { message: "Causes fetch failed" },
    });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("Causes fetch failed");
  });

  it("refresh sets loading false after completing", async () => {
    const { result } = renderHook(() => useCharity("charity-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.loading).toBe(false);
  });

  it("refresh sets causes to empty array when causes data is null", async () => {
    const { result } = renderHook(() => useCharity("charity-1"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    setMockResult("causes", { data: null, error: null });

    await act(async () => {
      await result.current.refresh();
    });

    expect(result.current.causes).toEqual([]);
  });
});
