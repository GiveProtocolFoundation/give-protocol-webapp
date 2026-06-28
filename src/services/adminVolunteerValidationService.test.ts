import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getValidationStats,
  listValidationRequests,
  overrideValidation,
  getSuspiciousPatterns,
  notifyVolunteerHoursOverride,
} from "./adminVolunteerValidationService";
import type { VolunteerHoursEmailContext } from "@/types/adminVolunteerValidation";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;
const mockInvoke = supabase.functions.invoke as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const baseEmailContext: VolunteerHoursEmailContext = {
  volunteerId: "vol-uuid-1",
  volunteerDisplayName: "Alice Smith",
  orgName: "Soup Kitchen",
  hoursReported: 4,
  activityDate: "2026-04-01",
};

describe("adminVolunteerValidationService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: null, error: null });
  });

  // ─── getValidationStats ────────────────────────────────────────────────────

  describe("getValidationStats", () => {
    it("should call admin_validation_stats with no params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      await getValidationStats();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_validation_stats");
    });

    it("should map a stats row to camelCase AdminValidationStats", async () => {
      const mockRow = {
        total_pending: 12,
        total_approved: 80,
        total_rejected: 5,
        total_expired: 3,
        avg_response_time_hours: 6.5,
        expiration_rate: 0.03,
        rejection_rate: 0.06,
        pending_by_org: [
          { org_id: "org-1", org_name: "Soup Kitchen", pending_count: 7 },
          { org_id: "org-2", org_name: null, pending_count: 5 },
        ],
      };
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [mockRow], error: null });

      const result = await getValidationStats();

      expect(result).not.toBeNull();
      expect(result?.totalPending).toBe(12);
      expect(result?.totalApproved).toBe(80);
      expect(result?.totalRejected).toBe(5);
      expect(result?.totalExpired).toBe(3);
      expect(result?.avgResponseTimeHours).toBe(6.5);
      expect(result?.expirationRate).toBe(0.03);
      expect(result?.rejectionRate).toBe(0.06);
      expect(result?.pendingByOrg).toHaveLength(2);
      expect(result?.pendingByOrg[0]).toEqual({
        orgId: "org-1",
        orgName: "Soup Kitchen",
        pendingCount: 7,
      });
      expect(result?.pendingByOrg[1]).toEqual({
        orgId: "org-2",
        orgName: null,
        pendingCount: 5,
      });
    });

    it("should return null on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      const result = await getValidationStats();

      expect(result).toBeNull();
    });

    it("should return null when data is empty array", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      const result = await getValidationStats();

      expect(result).toBeNull();
    });

    it("should return null on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      const result = await getValidationStats();

      expect(result).toBeNull();
    });
  });

  // ─── listValidationRequests ────────────────────────────────────────────────

  describe("listValidationRequests", () => {
    it("should call admin_list_validation_requests with default params when no filters", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      const result = await listValidationRequests();

      expect(supabase.rpc).toHaveBeenCalledWith(
        "admin_list_validation_requests",
        {
          p_status: null,
          p_org_id: null,
          p_volunteer_id: null,
          p_search: null,
          p_date_from: null,
          p_date_to: null,
          p_page: 1,
          p_limit: 50,
        },
      );
      expect(result.requests).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should pass all filters to RPC correctly", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      await listValidationRequests({
        status: "pending",
        orgId: "org-1",
        volunteerId: "vol-1",
        search: "John",
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-12-31T23:59:59Z",
        page: 2,
        limit: 25,
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "admin_list_validation_requests",
        {
          p_status: "pending",
          p_org_id: "org-1",
          p_volunteer_id: "vol-1",
          p_search: "John",
          p_date_from: "2026-01-01T00:00:00Z",
          p_date_to: "2026-12-31T23:59:59Z",
          p_page: 2,
          p_limit: 25,
        },
      );
    });

    it("should map snake_case rows to camelCase AdminValidationRequestItem", async () => {
      const mockRow = {
        id: "req-1",
        volunteer_id: "vol-1",
        volunteer_email: "alice@example.com",
        volunteer_display_name: "Alice Smith",
        org_id: "org-1",
        org_name: "Soup Kitchen",
        hours_reported: "4.5",
        activity_date: "2026-04-01",
        status: "pending",
        validator_user_id: null,
        validated_at: null,
        expires_at: "2026-04-08T00:00:00Z",
        created_at: "2026-04-01T12:00:00Z",
        total_count: 1,
      };
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [mockRow], error: null });

      const result = await listValidationRequests();

      expect(result.requests).toHaveLength(1);
      expect(result.requests[0]).toEqual({
        id: "req-1",
        volunteerId: "vol-1",
        volunteerEmail: "alice@example.com",
        volunteerDisplayName: "Alice Smith",
        orgId: "org-1",
        orgName: "Soup Kitchen",
        hoursReported: 4.5,
        activityDate: "2026-04-01",
        status: "pending",
        validatorUserId: null,
        validatedAt: null,
        expiresAt: "2026-04-08T00:00:00Z",
        createdAt: "2026-04-01T12:00:00Z",
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should compute totalPages correctly", async () => {
      const mockRows = Array.from({ length: 5 }, (_, i) => ({
        id: `req-${i}`,
        volunteer_id: `vol-${i}`,
        volunteer_email: null,
        volunteer_display_name: null,
        org_id: "org-1",
        org_name: "Org",
        hours_reported: 2,
        activity_date: "2026-04-01",
        status: "approved",
        validator_user_id: "val-1",
        validated_at: "2026-04-02T10:00:00Z",
        expires_at: null,
        created_at: "2026-04-01T08:00:00Z",
        total_count: 100,
      }));
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await listValidationRequests({ limit: 25 });

      expect(result.totalPages).toBe(4);
      expect(result.totalCount).toBe(100);
    });

    it("should return empty result on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      const result = await listValidationRequests();

      expect(result.requests).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should return empty result on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      const result = await listValidationRequests();

      expect(result.requests).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should handle null data gracefully", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const result = await listValidationRequests();

      expect(result.requests).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  // ─── overrideValidation ────────────────────────────────────────────────────

  describe("overrideValidation", () => {
    it("should call admin_override_validation with correct params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const success = await overrideValidation({
        requestId: "req-1",
        newStatus: "approved",
        reason: "Verified with charity coordinator",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_override_validation", {
        p_request_id: "req-1",
        p_new_status: "approved",
        p_reason: "Verified with charity coordinator",
      });
      expect(success).toBe(true);
    });

    it("should return true for rejected override", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const success = await overrideValidation({
        requestId: "req-2",
        newStatus: "rejected",
        reason: "Hours exceed reasonable limit",
      });

      expect(success).toBe(true);
    });

    it("should return false on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Request not found" },
      });

      const success = await overrideValidation({
        requestId: "req-nonexistent",
        newStatus: "approved",
        reason: "Test",
      });

      expect(success).toBe(false);
    });

    it("should return false on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      const success = await overrideValidation({
        requestId: "req-1",
        newStatus: "rejected",
        reason: "Test",
      });

      expect(success).toBe(false);
    });
  });

  // ─── getSuspiciousPatterns ─────────────────────────────────────────────────

  describe("getSuspiciousPatterns", () => {
    it("should call admin_suspicious_volunteer_patterns with no params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      await getSuspiciousPatterns();

      expect(supabase.rpc).toHaveBeenCalledWith(
        "admin_suspicious_volunteer_patterns",
      );
    });

    it("should map snake_case rows to camelCase patterns", async () => {
      const mockRows = [
        {
          volunteer_id: "vol-1",
          volunteer_email: "badactor@example.com",
          volunteer_display_name: "Bob Actor",
          org_id: "org-1",
          org_name: "Soup Kitchen",
          weekly_hours: 120,
          total_requests: 45,
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await getSuspiciousPatterns();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        volunteerId: "vol-1",
        volunteerEmail: "badactor@example.com",
        volunteerDisplayName: "Bob Actor",
        orgId: "org-1",
        orgName: "Soup Kitchen",
        weeklyHours: 120,
        totalRequests: 45,
      });
    });

    it("should handle volunteers with null email and display name", async () => {
      const mockRows = [
        {
          volunteer_id: "vol-2",
          volunteer_email: null,
          volunteer_display_name: null,
          org_id: "org-2",
          org_name: null,
          weekly_hours: 200,
          total_requests: 80,
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await getSuspiciousPatterns();

      expect(result[0].volunteerEmail).toBeNull();
      expect(result[0].volunteerDisplayName).toBeNull();
      expect(result[0].orgName).toBeNull();
    });

    it("should return empty array on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      const result = await getSuspiciousPatterns();

      expect(result).toEqual([]);
    });

    it("should return empty array on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      const result = await getSuspiciousPatterns();

      expect(result).toEqual([]);
    });

    it("should return empty array when data is null", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await getSuspiciousPatterns();

      expect(result).toEqual([]);
    });
  });

  // ─── notifyVolunteerHoursOverride ──────────────────────────────────────────

  describe("notifyVolunteerHoursOverride", () => {
    it("should invoke volunteer-hours-email with correct body for approved status", async () => {
      await notifyVolunteerHoursOverride(
        { requestId: "req-1", newStatus: "approved", reason: "Verified" },
        baseEmailContext,
      );

      expect(mockInvoke).toHaveBeenCalledWith("volunteer-hours-email", {
        body: {
          volunteerId: "vol-uuid-1",
          volunteerDisplayName: "Alice Smith",
          orgName: "Soup Kitchen",
          hoursReported: 4,
          activityDate: "2026-04-01",
          newStatus: "approved",
          reason: "Verified",
        },
      });
    });

    it("should invoke volunteer-hours-email with correct body for rejected status", async () => {
      await notifyVolunteerHoursOverride(
        { requestId: "req-2", newStatus: "rejected", reason: "Exceeds limit" },
        baseEmailContext,
      );

      expect(mockInvoke).toHaveBeenCalledWith("volunteer-hours-email", {
        body: {
          volunteerId: "vol-uuid-1",
          volunteerDisplayName: "Alice Smith",
          orgName: "Soup Kitchen",
          hoursReported: 4,
          activityDate: "2026-04-01",
          newStatus: "rejected",
          reason: "Exceeds limit",
        },
      });
    });

    it("should pass null for missing volunteerDisplayName and orgName", async () => {
      const contextNoNames: VolunteerHoursEmailContext = {
        volunteerId: "vol-uuid-2",
        volunteerDisplayName: null,
        orgName: null,
        hoursReported: 2,
        activityDate: "2026-04-10",
      };

      await notifyVolunteerHoursOverride(
        { requestId: "req-3", newStatus: "approved", reason: "OK" },
        contextNoNames,
      );

      expect(mockInvoke).toHaveBeenCalledWith("volunteer-hours-email", {
        body: {
          volunteerId: "vol-uuid-2",
          volunteerDisplayName: null,
          orgName: null,
          hoursReported: 2,
          activityDate: "2026-04-10",
          newStatus: "approved",
          reason: "OK",
        },
      });
    });

    it("should not throw when edge function returns an error", async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: "Function error" },
      });

      await expect(
        notifyVolunteerHoursOverride(
          { requestId: "req-1", newStatus: "approved", reason: "OK" },
          baseEmailContext,
        ),
      ).resolves.toBeUndefined();
    });

    it("should not throw when invoke rejects", async () => {
      mockInvoke.mockRejectedValue(new Error("Network timeout"));

      await expect(
        notifyVolunteerHoursOverride(
          { requestId: "req-1", newStatus: "rejected", reason: "Bad" },
          baseEmailContext,
        ),
      ).resolves.toBeUndefined();
    });
  });

  // ─── overrideValidation (email integration) ────────────────────────────────

  describe("overrideValidation with emailContext", () => {
    it("should fire notifyVolunteerHoursOverride when emailContext is provided on success", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const success = await overrideValidation(
        { requestId: "req-1", newStatus: "approved", reason: "Verified" },
        baseEmailContext,
      );

      expect(success).toBe(true);
      // Allow the fire-and-forget to run
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockInvoke).toHaveBeenCalledWith("volunteer-hours-email", {
        body: expect.objectContaining({
          volunteerId: "vol-uuid-1",
          newStatus: "approved",
        }),
      });
    });

    it("should not call invoke when emailContext is omitted", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      await overrideValidation({
        requestId: "req-1",
        newStatus: "approved",
        reason: "Verified",
      });

      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockInvoke).not.toHaveBeenCalled();
    });

    it("should not call invoke when the RPC fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "RPC error" },
      });

      const success = await overrideValidation(
        { requestId: "req-1", newStatus: "approved", reason: "Verified" },
        baseEmailContext,
      );

      expect(success).toBe(false);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });
});
