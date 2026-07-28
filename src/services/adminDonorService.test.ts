import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  listDonors,
  getDonorDetail,
  updateDonorStatus,
} from "./adminDonorService";

describe("adminDonorService", () => {
  beforeEach(() => {
    (
      supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
    ).mockReset();
  });

  describe("listDonors", () => {
    it("should call admin_list_donors RPC with default params when no filters", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await listDonors();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_donors", {
        p_status: null,
        p_auth_method: null,
        p_search: null,
        p_date_from: null,
        p_date_to: null,
        p_min_donated: null,
        p_page: 1,
        p_limit: 50,
      });
      expect(result.donors).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should pass filters to RPC correctly", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: [],
        error: null,
      });

      await listDonors({
        status: "suspended",
        authMethod: "wallet",
        search: "0xabc",
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-12-31T23:59:59Z",
        minDonated: 100,
        page: 2,
        limit: 25,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_donors", {
        p_status: "suspended",
        p_auth_method: "wallet",
        p_search: "0xabc",
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-12-31T23:59:59Z",
        p_min_donated: 100,
        p_page: 2,
        p_limit: 25,
      });
    });

    it("should map snake_case rows to camelCase donors", async () => {
      const mockRow = {
        user_id: "user-1",
        email: "donor@example.com",
        display_name: "Test Donor",
        wallet_address: null,
        primary_auth_method: "email",
        user_status: "active",
        total_crypto_usd: 50.0,
        total_fiat_usd: 25.5,
        donation_count: 3,
        created_at: "2026-01-01T00:00:00Z",
        total_count: 1,
      };
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: [mockRow],
        error: null,
      });

      const result = await listDonors();

      expect(result.donors).toHaveLength(1);
      expect(result.donors[0]).toEqual({
        userId: "user-1",
        email: "donor@example.com",
        displayName: "Test Donor",
        walletAddress: null,
        primaryAuthMethod: "email",
        userStatus: "active",
        totalCryptoUsd: 50.0,
        totalFiatUsd: 25.5,
        donationCount: 3,
        createdAt: "2026-01-01T00:00:00Z",
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should compute totalPages correctly", async () => {
      const mockRows = Array.from({ length: 5 }, (_, i) => ({
        user_id: `user-${i}`,
        email: `donor${i}@example.com`,
        display_name: `Donor ${i}`,
        wallet_address: null,
        primary_auth_method: "email",
        user_status: "active",
        total_crypto_usd: 0,
        total_fiat_usd: 0,
        donation_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        total_count: 100,
      }));
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: mockRows,
        error: null,
      });

      const result = await listDonors({ limit: 25 });

      expect(result.totalPages).toBe(4);
      expect(result.limit).toBe(25);
      expect(result.totalCount).toBe(100);
    });

    it("should throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(listDonors()).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      await expect(listDonors()).rejects.toThrow("Network failure");
    });

    it("should handle null data gracefully", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await listDonors();

      expect(result.donors).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("getDonorDetail", () => {
    it("should call admin_get_donor_detail RPC with correct user_id", async () => {
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
          fiatTotalUsd: 50.0,
        },
        recentCryptoDonations: [],
        recentFiatDonations: [],
        statusHistory: [],
      };
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: mockDetail,
        error: null,
      });

      const result = await getDonorDetail("user-1");

      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_donor_detail", {
        p_user_id: "user-1",
      });
      expect(result).toEqual(mockDetail);
    });

    it("should throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(getDonorDetail("user-1")).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      await expect(getDonorDetail("user-1")).rejects.toThrow("Network error");
    });
  });

  describe("updateDonorStatus", () => {
    it("should call admin_update_user_status RPC with correct params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: "audit-uuid-1",
        error: null,
      });

      const auditId = await updateDonorStatus({
        userId: "user-1",
        newStatus: "suspended",
        reason: "Suspicious activity",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_user_status", {
        p_user_id: "user-1",
        p_new_status: "suspended",
        p_reason: "Suspicious activity",
      });
      expect(auditId).toBe("audit-uuid-1");
    });

    it("should pass null reason when not provided", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: "audit-uuid-2",
        error: null,
      });

      await updateDonorStatus({ userId: "user-1", newStatus: "active" });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_user_status", {
        p_user_id: "user-1",
        p_new_status: "active",
        p_reason: null,
      });
    });

    it("should return null on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const auditId = await updateDonorStatus({
        userId: "user-1",
        newStatus: "banned",
        reason: "Fraud",
      });

      expect(auditId).toBeNull();
    });

    it("should return null on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      const auditId = await updateDonorStatus({
        userId: "user-1",
        newStatus: "suspended",
        reason: "Test",
      });

      expect(auditId).toBeNull();
    });
  });
});
