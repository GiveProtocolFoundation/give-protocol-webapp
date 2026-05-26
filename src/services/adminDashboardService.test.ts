import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getAdminDashboardStats,
  getAdminRecentActivity,
  getAdminAlerts,
} from "./adminDashboardService";

describe("adminDashboardService", () => {
  beforeEach(() => {
    (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockReset();
  });

  // -------------------------------------------------------------------------
  // getAdminDashboardStats
  // -------------------------------------------------------------------------
  describe("getAdminDashboardStats", () => {
    it("should call get_admin_dashboard_stats RPC with no args", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: {
          totalDonors: 100,
          totalCharities: 20,
          verifiedCharities: 15,
          pendingCharities: 5,
          totalVolunteers: 50,
          cryptoVolumeUsd: 10000,
          fiatVolumeUsd: 5000,
          totalVolumeUsd: 15000,
          trends: {
            donations7d: 10,
            donations30d: 40,
            registrations7d: 5,
            registrations30d: 20,
          },
        },
        error: null,
      });

      const result = await getAdminDashboardStats();

      expect(supabase.rpc).toHaveBeenCalledWith("get_admin_dashboard_stats");
      expect(result).not.toBeNull();
      expect(result?.totalDonors).toBe(100);
      expect(result?.verifiedCharities).toBe(15);
      expect(result?.totalVolumeUsd).toBe(15000);
      expect(result?.trends.donations7d).toBe(10);
    });

    it("should throw when RPC returns an error", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: null,
        error: { message: "Admin access required", code: "42501" },
      });

      await expect(getAdminDashboardStats()).rejects.toThrow(
        "Admin stats RPC failed: Admin access required (code: 42501)",
      );
    });

    it("should throw when RPC throws", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockRejectedValue(
        new Error("Network error"),
      );

      await expect(getAdminDashboardStats()).rejects.toThrow("Network error");
    });
  });

  // -------------------------------------------------------------------------
  // getAdminRecentActivity
  // -------------------------------------------------------------------------
  describe("getAdminRecentActivity", () => {
    const mockRow = {
      id: "event-1",
      event_type: "donation",
      description: "Crypto donation to Test Charity",
      actor_id: "donor-1",
      actor_name: "John Doe",
      entity_id: "charity-1",
      entity_type: "donation",
      amount_usd: 500,
      event_time: "2026-04-11T10:00:00Z",
      total_count: 1,
    };

    it("should call get_admin_recent_activity with default page/limit", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: [mockRow],
        error: null,
      });

      const result = await getAdminRecentActivity();

      expect(supabase.rpc).toHaveBeenCalledWith("get_admin_recent_activity", {
        p_limit: 50,
        p_offset: 0,
      });
      expect(result.events).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.page).toBe(1);
    });

    it("should calculate correct offset for page 2", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdminRecentActivity(2, 25);

      expect(supabase.rpc).toHaveBeenCalledWith("get_admin_recent_activity", {
        p_limit: 25,
        p_offset: 25,
      });
    });

    it("should map snake_case rows to camelCase events", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: [mockRow],
        error: null,
      });

      const result = await getAdminRecentActivity();
      const event = result.events[0];

      expect(event.id).toBe("event-1");
      expect(event.eventType).toBe("donation");
      expect(event.actorId).toBe("donor-1");
      expect(event.actorName).toBe("John Doe");
      expect(event.amountUsd).toBe(500);
      expect(event.eventTime).toBe("2026-04-11T10:00:00Z");
    });

    it("should return empty result when RPC returns error", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: null,
        error: { message: "permission denied" },
      });

      const result = await getAdminRecentActivity();

      expect(result.events).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should return empty result when RPC throws", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockRejectedValue(
        new Error("connection refused"),
      );

      const result = await getAdminRecentActivity();

      expect(result.events).toEqual([]);
    });

    it("should compute totalPages correctly", async () => {
      const rows = Array.from({ length: 5 }, (_, i) => ({
        ...mockRow,
        id: `event-${i}`,
        total_count: 130,
      }));

      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: rows,
        error: null,
      });

      const result = await getAdminRecentActivity(1, 50);

      expect(result.totalCount).toBe(130);
      expect(result.totalPages).toBe(3); // ceil(130 / 50)
    });
  });

  // -------------------------------------------------------------------------
  // getAdminAlerts
  // -------------------------------------------------------------------------
  describe("getAdminAlerts", () => {
    const mockAlertRow = {
      alert_type: "pending_verification",
      severity: "high",
      title: "Pending Charity Verification",
      description: "Charity awaiting verification: Green Earth",
      entity_id: "charity-1",
      entity_type: "charity_verification",
      created_at: "2026-04-10T08:00:00Z",
      count: 3,
    };

    it("should call get_admin_alerts RPC with no args", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: [mockAlertRow],
        error: null,
      });

      await getAdminAlerts();

      expect(supabase.rpc).toHaveBeenCalledWith("get_admin_alerts");
    });

    it("should map snake_case alert rows to camelCase AdminAlert", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: [mockAlertRow],
        error: null,
      });

      const alerts = await getAdminAlerts();

      expect(alerts).toHaveLength(1);
      expect(alerts[0].alertType).toBe("pending_verification");
      expect(alerts[0].severity).toBe("high");
      expect(alerts[0].entityId).toBe("charity-1");
      expect(alerts[0].createdAt).toBe("2026-04-10T08:00:00Z");
      expect(alerts[0].count).toBe(3);
    });

    it("should return empty array when no alerts", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: [],
        error: null,
      });

      const alerts = await getAdminAlerts();

      expect(alerts).toEqual([]);
    });

    it("should return empty array on RPC error", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: null,
        error: { message: "Admin access required" },
      });

      const alerts = await getAdminAlerts();

      expect(alerts).toEqual([]);
    });

    it("should return empty array when RPC throws", async () => {
      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockRejectedValue(
        new Error("timeout"),
      );

      const alerts = await getAdminAlerts();

      expect(alerts).toEqual([]);
    });

    it("should handle multiple alert types in a single response", async () => {
      const rows = [
        mockAlertRow,
        {
          alert_type: "expired_validation",
          severity: "medium",
          title: "Expired Validation Request",
          description: "Validation request expired for volunteer: Jane",
          entity_id: "vr-1",
          entity_type: "validation_request",
          created_at: "2026-01-01T00:00:00Z",
          count: 2,
        },
      ];

      (supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>).mockResolvedValue({
        data: rows,
        error: null,
      });

      const alerts = await getAdminAlerts();

      expect(alerts).toHaveLength(2);
      expect(alerts[0].alertType).toBe("pending_verification");
      expect(alerts[1].alertType).toBe("expired_validation");
      expect(alerts[1].severity).toBe("medium");
    });
  });
});
