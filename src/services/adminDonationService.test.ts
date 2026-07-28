import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  listDonations,
  getDonationSummary,
  flagDonation,
  resolveFlag,
  summaryToCsv,
} from "./adminDonationService";

describe("adminDonationService", () => {
  beforeEach(() => {
    (
      supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
    ).mockReset();
  });

  describe("listDonations", () => {
    it("should call admin_list_donations with default params when no filters", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      const result = await listDonations();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_donations", {
        p_payment_method: null,
        p_charity_id: null,
        p_donor_user_id: null,
        p_search: null,
        p_date_from: null,
        p_date_to: null,
        p_min_amount_usd: null,
        p_max_amount_usd: null,
        p_flagged: null,
        p_page: 1,
        p_limit: 50,
      });
      expect(result.donations).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should pass all filters to RPC correctly", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      await listDonations({
        paymentMethod: "crypto",
        charityId: "charity-1",
        donorUserId: "user-1",
        search: "0xabc",
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-12-31T23:59:59Z",
        minAmountUsd: 10,
        maxAmountUsd: 1000,
        flagged: true,
        page: 2,
        limit: 25,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_donations", {
        p_payment_method: "crypto",
        p_charity_id: "charity-1",
        p_donor_user_id: "user-1",
        p_search: "0xabc",
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-12-31T23:59:59Z",
        p_min_amount_usd: 10,
        p_max_amount_usd: 1000,
        p_flagged: true,
        p_page: 2,
        p_limit: 25,
      });
    });

    it("should map snake_case rows to camelCase donations", async () => {
      const mockRow = {
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
      };
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [mockRow], error: null });

      const result = await listDonations();

      expect(result.donations).toHaveLength(1);
      expect(result.donations[0]).toEqual({
        id: "don-1",
        paymentMethod: "crypto",
        amount: 0.5,
        amountUsd: 150.0,
        currency: null,
        charityId: "charity-1",
        charityName: "Clean Water Foundation",
        donorUserId: "user-1",
        donorEmail: "donor@example.com",
        donorDisplayName: "Test Donor",
        txHash: "0xabc123",
        processorId: null,
        status: "confirmed",
        isFlagged: false,
        openFlagCount: 0,
        createdAt: "2026-01-15T10:00:00Z",
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should map fiat donation row correctly", async () => {
      const mockRow = {
        id: "fiat-1",
        payment_method: "fiat",
        amount: 5000,
        amount_usd: 50.0,
        currency: "USD",
        charity_id: "charity-2",
        charity_name: "Education For All",
        donor_user_id: "user-2",
        donor_email: null,
        donor_display_name: null,
        tx_hash: null,
        processor_id: "PAY-XYZ",
        status: "completed",
        is_flagged: true,
        open_flag_count: 1,
        created_at: "2026-02-01T08:00:00Z",
        total_count: 1,
      };
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [mockRow], error: null });

      const result = await listDonations({ paymentMethod: "fiat" });

      expect(result.donations[0].paymentMethod).toBe("fiat");
      expect(result.donations[0].processorId).toBe("PAY-XYZ");
      expect(result.donations[0].txHash).toBeNull();
      expect(result.donations[0].isFlagged).toBe(true);
      expect(result.donations[0].openFlagCount).toBe(1);
    });

    it("should compute totalPages correctly", async () => {
      const mockRows = Array.from({ length: 5 }, (_, i) => ({
        id: `don-${i}`,
        payment_method: "crypto",
        amount: 1.0,
        amount_usd: 300.0,
        currency: null,
        charity_id: "charity-1",
        charity_name: "Test Charity",
        donor_user_id: `user-${i}`,
        donor_email: null,
        donor_display_name: null,
        tx_hash: `0xhash${i}`,
        processor_id: null,
        status: "confirmed",
        is_flagged: false,
        open_flag_count: 0,
        created_at: "2026-01-01T00:00:00Z",
        total_count: 100,
      }));
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await listDonations({ limit: 25 });

      expect(result.totalPages).toBe(4);
      expect(result.totalCount).toBe(100);
      expect(result.limit).toBe(25);
    });

    it("should throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      await expect(listDonations()).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      await expect(listDonations()).rejects.toThrow("Network failure");
    });

    it("should handle null data gracefully", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const result = await listDonations();

      expect(result.donations).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("getDonationSummary", () => {
    it("should call admin_donation_summary with correct params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      const result = await getDonationSummary(
        "2026-01-01T00:00:00Z",
        "2026-12-31T23:59:59Z",
        "charity",
      );

      expect(supabase.rpc).toHaveBeenCalledWith("admin_donation_summary", {
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-12-31T23:59:59Z",
        p_group_by: "charity",
      });
      expect(result).toEqual([]);
    });

    it("should map summary rows to camelCase", async () => {
      const mockRows = [
        {
          group_key: "charity-1",
          payment_method: "crypto",
          total_amount_usd: 1500.0,
          donation_count: 10,
          charity_id: "charity-1",
          charity_name: "Clean Water Foundation",
        },
        {
          group_key: "charity-1",
          payment_method: "fiat",
          total_amount_usd: 500.0,
          donation_count: 5,
          charity_id: "charity-1",
          charity_name: "Clean Water Foundation",
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await getDonationSummary(
        "2026-01-01T00:00:00Z",
        "2026-12-31T23:59:59Z",
        "charity",
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        groupKey: "charity-1",
        paymentMethod: "crypto",
        totalAmountUsd: 1500.0,
        donationCount: 10,
        charityId: "charity-1",
        charityName: "Clean Water Foundation",
      });
    });

    it("should throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      await expect(
        getDonationSummary(
          "2026-01-01T00:00:00Z",
          "2026-12-31T23:59:59Z",
          "month",
        ),
      ).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      await expect(
        getDonationSummary(
          "2026-01-01T00:00:00Z",
          "2026-12-31T23:59:59Z",
          "day",
        ),
      ).rejects.toThrow("Network error");
    });
  });

  describe("flagDonation", () => {
    it("should call admin_flag_donation with correct params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "flag-uuid-1", error: null });

      const flagId = await flagDonation({
        donationId: "don-1",
        donationType: "crypto",
        reason: "Suspicious transaction pattern",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_flag_donation", {
        p_donation_id: "don-1",
        p_donation_type: "crypto",
        p_reason: "Suspicious transaction pattern",
      });
      expect(flagId).toBe("flag-uuid-1");
    });

    it("should return null on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      const flagId = await flagDonation({
        donationId: "don-1",
        donationType: "fiat",
        reason: "Duplicate charge",
      });

      expect(flagId).toBeNull();
    });

    it("should return null on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      const flagId = await flagDonation({
        donationId: "don-1",
        donationType: "crypto",
        reason: "Test",
      });

      expect(flagId).toBeNull();
    });
  });

  describe("resolveFlag", () => {
    it("should call admin_resolve_flag with correct params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const success = await resolveFlag({
        flagId: "flag-1",
        resolutionNote: "Verified legitimate transaction",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_resolve_flag", {
        p_flag_id: "flag-1",
        p_resolution_note: "Verified legitimate transaction",
      });
      expect(success).toBe(true);
    });

    it("should pass null resolutionNote when not provided", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      await resolveFlag({ flagId: "flag-1" });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_resolve_flag", {
        p_flag_id: "flag-1",
        p_resolution_note: null,
      });
    });

    it("should return false on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Not found" } });

      const success = await resolveFlag({ flagId: "flag-nonexistent" });

      expect(success).toBe(false);
    });

    it("should return false on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      const success = await resolveFlag({ flagId: "flag-1" });

      expect(success).toBe(false);
    });
  });

  describe("summaryToCsv", () => {
    it("should generate correct CSV with header and data rows", () => {
      const rows = [
        {
          groupKey: "charity-1",
          paymentMethod: "crypto" as const,
          totalAmountUsd: 1500.5,
          donationCount: 10,
          charityId: "charity-1",
          charityName: "Clean Water Foundation",
        },
        {
          groupKey: "2026-01",
          paymentMethod: "fiat" as const,
          totalAmountUsd: 250.0,
          donationCount: 5,
          charityId: null,
          charityName: null,
        },
      ];

      const csv = summaryToCsv(rows);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Group,Payment Method,Total USD,Count,Charity ID,Charity Name",
      );
      expect(lines[1]).toBe(
        '"charity-1",crypto,1500.50,10,charity-1,"Clean Water Foundation"',
      );
      expect(lines[2]).toBe('"2026-01",fiat,250.00,5,,""');
    });

    it("should return only header row for empty input", () => {
      const csv = summaryToCsv([]);
      expect(csv).toBe(
        "Group,Payment Method,Total USD,Count,Charity ID,Charity Name",
      );
    });
  });
});
