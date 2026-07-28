import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import { useAdminDonations } from "./useAdminDonations";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeMockRow = (overrides: Record<string, unknown> = {}) => ({
  id: "don-1",
  payment_method: "crypto",
  amount: 0.5,
  amount_usd: 150.0,
  currency: null,
  charity_id: "charity-1",
  charity_name: "Clean Water Foundation",
  donor_user_id: "user-1",
  donor_email: "donor@example.com",
  donor_display_name: "Test Donor",
  tx_hash: "0xabc123",
  processor_id: null,
  status: "confirmed",
  is_flagged: false,
  open_flag_count: 0,
  created_at: "2026-01-15T10:00:00Z",
  total_count: 1,
  ...overrides,
});

describe("useAdminDonations", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe("fetchDonations", () => {
    it("should update result with donations from supabase on success", async () => {
      mockRpc.mockResolvedValue({ data: [makeMockRow()], error: null });

      const { result } = renderHook(() => useAdminDonations());

      await act(async () => {
        await result.current.fetchDonations();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.result.donations).toHaveLength(1);
      expect(result.current.result.donations[0]).toMatchObject({
        id: "don-1",
        paymentMethod: "crypto",
        amountUsd: 150.0,
        charityName: "Clean Water Foundation",
        donorEmail: "donor@example.com",
        isFlagged: false,
      });
      expect(result.current.result.totalCount).toBe(1);
    });

    it("should pass filters to admin_list_donations RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminDonations());

      await act(async () => {
        await result.current.fetchDonations({
          paymentMethod: "fiat",
          flagged: true,
          page: 2,
          limit: 25,
        });
      });

      expect(mockRpc).toHaveBeenCalledWith(
        "admin_list_donations",
        expect.objectContaining({
          p_payment_method: "fiat",
          p_flagged: true,
          p_page: 2,
          p_limit: 25,
        }),
      );
    });

    it("should show toast and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminDonations());

      await act(async () => {
        await expect(result.current.fetchDonations()).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.result.donations).toHaveLength(0);
      expect(result.current.result.totalCount).toBe(0);
    });
  });

  describe("fetchSummary", () => {
    it("should update summary with data from admin_donation_summary", async () => {
      const mockSummaryRows = [
        {
          group_key: "charity-1",
          payment_method: "crypto",
          total_amount_usd: 1500.0,
          donation_count: 10,
          charity_id: "charity-1",
          charity_name: "Clean Water Foundation",
        },
      ];
      mockRpc.mockResolvedValue({ data: mockSummaryRows, error: null });

      const { result } = renderHook(() => useAdminDonations());

      await act(async () => {
        await result.current.fetchSummary(
          "2026-01-01T00:00:00Z",
          "2026-12-31T23:59:59Z",
          "charity",
        );
      });

      expect(result.current.summaryLoading).toBe(false);
      expect(result.current.summary).toHaveLength(1);
      expect(result.current.summary[0]).toMatchObject({
        groupKey: "charity-1",
        paymentMethod: "crypto",
        totalAmountUsd: 1500.0,
        donationCount: 10,
      });
    });

    it("should show toast and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminDonations());

      await act(async () => {
        await expect(
          result.current.fetchSummary(
            "2026-01-01T00:00:00Z",
            "2026-12-31T23:59:59Z",
            "month",
          ),
        ).rejects.toThrow("RPC failed");
      });

      expect(result.current.summary).toEqual([]);
    });
  });

  describe("submitFlag", () => {
    it("should call admin_flag_donation and refresh list on success", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: "flag-uuid-1", error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useAdminDonations());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitFlag({
          donationId: "don-1",
          donationType: "crypto",
          reason: "Suspicious transaction",
        });
      });

      expect(success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("admin_flag_donation", {
        p_donation_id: "don-1",
        p_donation_type: "crypto",
        p_reason: "Suspicious transaction",
      });
    });

    it("should return false when flagDonation fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminDonations());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitFlag({
          donationId: "don-1",
          donationType: "fiat",
          reason: "Duplicate charge",
        });
      });

      expect(success).toBe(false);
    });
  });

  describe("submitResolveFlag", () => {
    it("should call admin_resolve_flag and refresh list on success", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useAdminDonations());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitResolveFlag({
          flagId: "flag-1",
          resolutionNote: "Verified legitimate",
        });
      });

      expect(success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("admin_resolve_flag", {
        p_flag_id: "flag-1",
        p_resolution_note: "Verified legitimate",
      });
    });

    it("should return false when resolveFlag fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const { result } = renderHook(() => useAdminDonations());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitResolveFlag({
          flagId: "flag-nonexistent",
        });
      });

      expect(success).toBe(false);
    });
  });
});
