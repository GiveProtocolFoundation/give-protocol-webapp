import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getCharityGrowthReport,
  getDonorActivityReport,
  getVolunteerReport,
  getPlatformHealthSummary,
  charityGrowthToCsv,
  donorActivityToCsv,
  volunteerReportToCsv,
  platformHealthToCsv,
  auditLogToCsv,
  donationSummaryToCsv,
} from "./adminReportsService";
import type { AdminAuditLogEntry } from "@/types/adminAudit";
import type { AdminDonationSummaryRow } from "@/types/adminDonation";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

describe("adminReportsService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  // ─── getCharityGrowthReport ───────────────────────────────────────────────

  describe("getCharityGrowthReport", () => {
    it("should call admin_charity_growth_report RPC with correct params", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getCharityGrowthReport(
        "2026-01-01T00:00:00Z",
        "2026-03-31T23:59:59Z",
      );

      expect(supabase.rpc).toHaveBeenCalledWith("admin_charity_growth_report", {
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-03-31T23:59:59Z",
      });
    });

    it("should map snake_case rows to camelCase", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            period: "2026-01",
            new_registrations: 12,
            approved: 9,
            rejected: 2,
            active: 45,
            suspended: 1,
          },
        ],
        error: null,
      });

      const rows = await getCharityGrowthReport(
        "2026-01-01T00:00:00Z",
        "2026-01-31T23:59:59Z",
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        period: "2026-01",
        newRegistrations: 12,
        approved: 9,
        rejected: 2,
        active: 45,
        suspended: 1,
      });
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(
        getCharityGrowthReport(
          "2026-01-01T00:00:00Z",
          "2026-01-31T23:59:59Z",
        ),
      ).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      mockRpc.mockRejectedValue(new Error("Network failure"));

      await expect(
        getCharityGrowthReport(
          "2026-01-01T00:00:00Z",
          "2026-01-31T23:59:59Z",
        ),
      ).rejects.toThrow("Network failure");
    });

    it("should handle null data gracefully", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const rows = await getCharityGrowthReport(
        "2026-01-01T00:00:00Z",
        "2026-01-31T23:59:59Z",
      );

      expect(rows).toEqual([]);
    });
  });

  // ─── getDonorActivityReport ───────────────────────────────────────────────

  describe("getDonorActivityReport", () => {
    it("should call admin_donor_activity_report RPC with correct params", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getDonorActivityReport(
        "2026-01-01T00:00:00Z",
        "2026-03-31T23:59:59Z",
      );

      expect(supabase.rpc).toHaveBeenCalledWith("admin_donor_activity_report", {
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-03-31T23:59:59Z",
      });
    });

    it("should map snake_case rows to camelCase", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            period: "2026-02",
            new_donors: 50,
            active_donors: 120,
            dormant_donors: 30,
            avg_donation_usd: 75.5,
            repeat_donor_rate: 0.42,
          },
        ],
        error: null,
      });

      const rows = await getDonorActivityReport(
        "2026-01-01T00:00:00Z",
        "2026-02-28T23:59:59Z",
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        period: "2026-02",
        newDonors: 50,
        activeDonors: 120,
        dormantDonors: 30,
        avgDonationUsd: 75.5,
        repeatDonorRate: 0.42,
      });
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(
        getDonorActivityReport(
          "2026-01-01T00:00:00Z",
          "2026-01-31T23:59:59Z",
        ),
      ).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      mockRpc.mockRejectedValue(new Error("Network failure"));

      await expect(
        getDonorActivityReport(
          "2026-01-01T00:00:00Z",
          "2026-01-31T23:59:59Z",
        ),
      ).rejects.toThrow("Network failure");
    });
  });

  // ─── getVolunteerReport ───────────────────────────────────────────────────

  describe("getVolunteerReport", () => {
    it("should call admin_volunteer_report RPC with correct params", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getVolunteerReport("2026-01-01T00:00:00Z", "2026-03-31T23:59:59Z");

      expect(supabase.rpc).toHaveBeenCalledWith("admin_volunteer_report", {
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-03-31T23:59:59Z",
      });
    });

    it("should map snake_case rows to camelCase", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            period: "2026-03",
            hours_submitted: 200,
            hours_validated: 180,
            hours_rejected: 20,
            rejection_rate: 0.1,
            avg_validation_days: 2.5,
          },
        ],
        error: null,
      });

      const rows = await getVolunteerReport(
        "2026-03-01T00:00:00Z",
        "2026-03-31T23:59:59Z",
      );

      expect(rows).toHaveLength(1);
      expect(rows[0]).toEqual({
        period: "2026-03",
        hoursSubmitted: 200,
        hoursValidated: 180,
        hoursRejected: 20,
        rejectionRate: 0.1,
        avgValidationDays: 2.5,
      });
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(
        getVolunteerReport(
          "2026-01-01T00:00:00Z",
          "2026-01-31T23:59:59Z",
        ),
      ).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      mockRpc.mockRejectedValue(new Error("Network failure"));

      await expect(
        getVolunteerReport(
          "2026-01-01T00:00:00Z",
          "2026-01-31T23:59:59Z",
        ),
      ).rejects.toThrow("Network failure");
    });
  });

  // ─── getPlatformHealthSummary ─────────────────────────────────────────────

  describe("getPlatformHealthSummary", () => {
    it("should call admin_platform_health_summary RPC with period param", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getPlatformHealthSummary("30d");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "admin_platform_health_summary",
        {
          p_period: "30d",
        },
      );
    });

    it("should map snake_case rows to camelCase", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            metric: "total_donations",
            value: 1500,
            trend_7d: 50,
            trend_30d: 200,
            unit: "count",
          },
          {
            metric: "total_usd",
            value: 75000,
            trend_7d: null,
            trend_30d: 5000,
            unit: "USD",
          },
        ],
        error: null,
      });

      const rows = await getPlatformHealthSummary("7d");

      expect(rows).toHaveLength(2);
      expect(rows[0]).toEqual({
        metric: "total_donations",
        value: 1500,
        trend7d: 50,
        trend30d: 200,
        unit: "count",
      });
      expect(rows[1]).toEqual({
        metric: "total_usd",
        value: 75000,
        trend7d: null,
        trend30d: 5000,
        unit: "USD",
      });
    });

    it("should support all valid period values", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getPlatformHealthSummary("7d");
      await getPlatformHealthSummary("30d");
      await getPlatformHealthSummary("90d");

      expect(mockRpc).toHaveBeenCalledTimes(3);
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(getPlatformHealthSummary("30d")).rejects.toThrow(
        "RPC failed",
      );
    });

    it("should throw on thrown exception", async () => {
      mockRpc.mockRejectedValue(new Error("Network failure"));

      await expect(getPlatformHealthSummary("30d")).rejects.toThrow(
        "Network failure",
      );
    });
  });

  // ─── CSV helpers ──────────────────────────────────────────────────────────

  describe("charityGrowthToCsv", () => {
    it("should produce correct CSV with header", () => {
      const rows = [
        {
          period: "2026-01",
          newRegistrations: 10,
          approved: 8,
          rejected: 1,
          active: 40,
          suspended: 0,
        },
      ];
      const csv = charityGrowthToCsv(rows);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Period,New Registrations,Approved,Rejected,Active,Suspended",
      );
      expect(lines[1]).toBe("2026-01,10,8,1,40,0");
    });

    it("should return only header for empty array", () => {
      const csv = charityGrowthToCsv([]);
      expect(csv).toBe(
        "Period,New Registrations,Approved,Rejected,Active,Suspended",
      );
    });
  });

  describe("donorActivityToCsv", () => {
    it("should produce correct CSV with repeat rate as percentage", () => {
      const rows = [
        {
          period: "2026-02",
          newDonors: 50,
          activeDonors: 100,
          dormantDonors: 20,
          avgDonationUsd: 75.5,
          repeatDonorRate: 0.42,
        },
      ];
      const csv = donorActivityToCsv(rows);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Period,New Donors,Active Donors,Dormant Donors,Avg Donation USD,Repeat Donor Rate",
      );
      expect(lines[1]).toBe("2026-02,50,100,20,75.50,42.0%");
    });
  });

  describe("volunteerReportToCsv", () => {
    it("should produce correct CSV with rejection rate as percentage", () => {
      const rows = [
        {
          period: "2026-03",
          hoursSubmitted: 200,
          hoursValidated: 180,
          hoursRejected: 20,
          rejectionRate: 0.1,
          avgValidationDays: 2.5,
        },
      ];
      const csv = volunteerReportToCsv(rows);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Period,Hours Submitted,Hours Validated,Hours Rejected,Rejection Rate,Avg Validation Days",
      );
      expect(lines[1]).toBe("2026-03,200,180,20,10.0%,2.5");
    });
  });

  describe("platformHealthToCsv", () => {
    it("should produce correct CSV handling null trends", () => {
      const rows = [
        {
          metric: "total_donations",
          value: 1500,
          trend7d: 50,
          trend30d: null,
          unit: "count",
        },
      ];
      const csv = platformHealthToCsv(rows);
      const lines = csv.split("\n");

      expect(lines[0]).toBe("Metric,Value,Unit,Trend 7d,Trend 30d");
      expect(lines[1]).toBe('"total_donations",1500,count,50,');
    });
  });

  describe("auditLogToCsv", () => {
    it("should produce correct CSV from audit entries", () => {
      const entries: AdminAuditLogEntry[] = [
        {
          id: "audit-1",
          adminUserId: "admin-1",
          actionType: "charity_status_change",
          entityType: "charity",
          entityId: "charity-1",
          oldValues: null,
          newValues: null,
          ipAddress: "127.0.0.1",
          createdAt: "2026-04-12T00:00:00Z",
        },
      ];
      const csv = auditLogToCsv(entries);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "ID,Admin User ID,Action Type,Entity Type,Entity ID,IP Address,Created At",
      );
      expect(lines[1]).toBe(
        "audit-1,admin-1,charity_status_change,charity,charity-1,127.0.0.1,2026-04-12T00:00:00Z",
      );
    });

    it("should handle null ipAddress", () => {
      const entries: AdminAuditLogEntry[] = [
        {
          id: "audit-2",
          adminUserId: "admin-2",
          actionType: "config_change",
          entityType: "platform_config",
          entityId: "config-1",
          oldValues: null,
          newValues: null,
          ipAddress: null,
          createdAt: "2026-04-12T00:00:00Z",
        },
      ];
      const csv = auditLogToCsv(entries);
      const lines = csv.split("\n");

      expect(lines[1]).toContain(",config-1,,2026-04-12T00:00:00Z");
    });
  });

  describe("donationSummaryToCsv", () => {
    it("should produce correct CSV with quoted fields", () => {
      const rows: AdminDonationSummaryRow[] = [
        {
          groupKey: "2026-01",
          paymentMethod: "crypto",
          totalAmountUsd: 1234.56,
          donationCount: 10,
          charityId: "charity-1",
          charityName: "Water Foundation",
        },
      ];
      const csv = donationSummaryToCsv(rows);
      const lines = csv.split("\n");

      expect(lines[0]).toBe(
        "Group,Payment Method,Total USD,Count,Charity ID,Charity Name",
      );
      expect(lines[1]).toBe(
        '"2026-01",crypto,1234.56,10,charity-1,"Water Foundation"',
      );
    });

    it("should handle null charity fields", () => {
      const rows: AdminDonationSummaryRow[] = [
        {
          groupKey: "2026-02",
          paymentMethod: "fiat",
          totalAmountUsd: 500.0,
          donationCount: 5,
          charityId: null,
          charityName: null,
        },
      ];
      const csv = donationSummaryToCsv(rows);
      const lines = csv.split("\n");

      expect(lines[1]).toBe('"2026-02",fiat,500.00,5,,""');
    });
  });
});
