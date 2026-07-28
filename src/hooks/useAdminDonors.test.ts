import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import { useAdminDonors } from "./useAdminDonors";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

describe("useAdminDonors", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe("fetchDonors", () => {
    it("should update result with donors from supabase on success", async () => {
      const mockRow = {
        user_id: "user-1",
        email: "donor@example.com",
        display_name: "Test Donor",
        wallet_address: null,
        primary_auth_method: "email",
        user_status: "active",
        total_crypto_usd: 0,
        total_fiat_usd: 50,
        donation_count: 2,
        created_at: "2026-01-01T00:00:00Z",
        total_count: 1,
      };
      mockRpc.mockResolvedValue({ data: [mockRow], error: null });

      const { result } = renderHook(() => useAdminDonors());

      await act(async () => {
        await result.current.fetchDonors();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.result.donors).toHaveLength(1);
      expect(result.current.result.donors[0]).toMatchObject({
        userId: "user-1",
        email: "donor@example.com",
        displayName: "Test Donor",
        userStatus: "active",
        donationCount: 2,
      });
      expect(result.current.result.totalCount).toBe(1);
    });

    it("should pass status filter to admin_list_donors RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminDonors());

      await act(async () => {
        await result.current.fetchDonors({
          status: "suspended",
          page: 2,
          limit: 25,
        });
      });

      expect(mockRpc).toHaveBeenCalledWith(
        "admin_list_donors",
        expect.objectContaining({
          p_status: "suspended",
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

      const { result } = renderHook(() => useAdminDonors());

      await act(async () => {
        await expect(result.current.fetchDonors()).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.result.donors).toHaveLength(0);
      expect(result.current.result.totalCount).toBe(0);
    });
  });

  describe("fetchDonorDetail", () => {
    it("should set detail via admin_get_donor_detail RPC", async () => {
      const mockDetail = {
        profile: {
          userId: "user-1",
          email: "donor@example.com",
          displayName: "Test Donor",
          userStatus: "active",
          createdAt: "2026-01-01T00:00:00Z",
        },
        identity: {
          walletAddress: null,
          primaryAuthMethod: "email",
          walletLinkedAt: null,
        },
        donationSummary: {
          cryptoDonationCount: 0,
          cryptoTotalUsd: 0,
          fiatDonationCount: 2,
          fiatTotalUsd: 50,
        },
        recentCryptoDonations: [],
        recentFiatDonations: [],
        statusHistory: [],
      };
      mockRpc.mockResolvedValue({ data: mockDetail, error: null });

      const { result } = renderHook(() => useAdminDonors());

      await act(async () => {
        await result.current.fetchDonorDetail("user-1");
      });

      expect(result.current.detail).toEqual(mockDetail);
      expect(result.current.detailLoading).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith("admin_get_donor_detail", {
        p_user_id: "user-1",
      });
    });

    it("should show toast and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const { result } = renderHook(() => useAdminDonors());

      await act(async () => {
        await expect(result.current.fetchDonorDetail("user-1")).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.detail).toBeNull();
    });
  });

  describe("suspendDonor", () => {
    it("should call admin_update_user_status with suspended and refresh list", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: "audit-id-1", error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useAdminDonors());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.suspendDonor(
          "user-1",
          "Suspicious activity",
        );
      });

      expect(success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("admin_update_user_status", {
        p_user_id: "user-1",
        p_new_status: "suspended",
        p_reason: "Suspicious activity",
      });
    });

    it("should return false when updateDonorStatus fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminDonors());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.suspendDonor("user-1", "reason");
      });

      expect(success).toBe(false);
    });
  });

  describe("reinstateDonor", () => {
    it("should call admin_update_user_status with active", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: "audit-id-2", error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useAdminDonors());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.reinstateDonor("user-1");
      });

      expect(success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("admin_update_user_status", {
        p_user_id: "user-1",
        p_new_status: "active",
        p_reason: null,
      });
    });
  });

  describe("banDonor", () => {
    it("should call admin_update_user_status with banned", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: "audit-id-3", error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useAdminDonors());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.banDonor("user-1", "Fraud");
      });

      expect(success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("admin_update_user_status", {
        p_user_id: "user-1",
        p_new_status: "banned",
        p_reason: "Fraud",
      });
    });
  });
});
