import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import { useAdminVolunteerValidation } from "./useAdminVolunteerValidation";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeMockRequestRow = (overrides: Record<string, unknown> = {}) => ({
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
  ...overrides,
});

const makeMockStatsRow = (overrides: Record<string, unknown> = {}) => ({
  total_pending: 10,
  total_approved: 50,
  total_rejected: 3,
  total_expired: 2,
  avg_response_time_hours: 5.0,
  expiration_rate: 0.02,
  rejection_rate: 0.05,
  pending_by_org: [],
  ...overrides,
});

describe("useAdminVolunteerValidation", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  // ─── fetchStats ─────────────────────────────────────────────────────────

  describe("fetchStats", () => {
    it("should update stats state on success", async () => {
      mockRpc.mockResolvedValue({ data: [makeMockStatsRow()], error: null });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.statsLoading).toBe(false);
      expect(result.current.stats).not.toBeNull();
      expect(result.current.stats?.totalPending).toBe(10);
      expect(result.current.stats?.totalApproved).toBe(50);
      expect(result.current.stats?.avgResponseTimeHours).toBe(5.0);
    });

    it("should set statsError and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await expect(result.current.fetchStats()).rejects.toThrow("RPC failed");
      });

      expect(result.current.stats).toBeNull();
      expect(result.current.statsLoading).toBe(false);
    });

    it("should set statsLoading to false after fetch", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await result.current.fetchStats();
      });

      expect(result.current.statsLoading).toBe(false);
    });
  });

  // ─── fetchRequests ───────────────────────────────────────────────────────

  describe("fetchRequests", () => {
    it("should update result with requests from supabase on success", async () => {
      mockRpc.mockResolvedValue({ data: [makeMockRequestRow()], error: null });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await result.current.fetchRequests();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.result.requests).toHaveLength(1);
      expect(result.current.result.requests[0]).toMatchObject({
        id: "req-1",
        volunteerId: "vol-1",
        volunteerDisplayName: "Alice Smith",
        hoursReported: 4.5,
        status: "pending",
      });
      expect(result.current.result.totalCount).toBe(1);
    });

    it("should pass filters to admin_list_validation_requests RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await result.current.fetchRequests({
          status: "pending",
          orgId: "org-1",
          page: 2,
          limit: 25,
        });
      });

      expect(mockRpc).toHaveBeenCalledWith(
        "admin_list_validation_requests",
        expect.objectContaining({
          p_status: "pending",
          p_org_id: "org-1",
          p_page: 2,
          p_limit: 25,
        }),
      );
    });

    it("should set requestsError and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await expect(result.current.fetchRequests()).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.result.requests).toEqual([]);
      expect(result.current.result.totalCount).toBe(0);
      expect(result.current.loading).toBe(false);
    });
  });

  // ─── submitOverride ──────────────────────────────────────────────────────

  describe("submitOverride", () => {
    it("should call admin_override_validation and refresh requests on success", async () => {
      // First call: override RPC; second call: list refresh
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: [makeMockRequestRow({ status: "approved" })],
          error: null,
        });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitOverride({
          requestId: "req-1",
          newStatus: "approved",
          reason: "Verified with coordinator",
        });
      });

      expect(success).toBe(true);
      expect(result.current.overriding).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith(
        "admin_override_validation",
        expect.objectContaining({
          p_request_id: "req-1",
          p_new_status: "approved",
          p_reason: "Verified with coordinator",
        }),
      );
    });

    it("should return false when override RPC returns error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.submitOverride({
          requestId: "req-1",
          newStatus: "rejected",
          reason: "Hours implausible",
        });
      });

      expect(success).toBe(false);
      expect(result.current.overriding).toBe(false);
    });

    it("should pass current filters when refreshing requests", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await result.current.submitOverride(
          { requestId: "req-1", newStatus: "approved", reason: "OK" },
          { status: "pending", page: 2, limit: 25 },
        );
      });

      // Second RPC call should be the list refresh with the provided filters
      expect(mockRpc).toHaveBeenNthCalledWith(
        2,
        "admin_list_validation_requests",
        expect.objectContaining({
          p_status: "pending",
          p_page: 2,
          p_limit: 25,
        }),
      );
    });
  });

  // ─── fetchSuspiciousPatterns ─────────────────────────────────────────────

  describe("fetchSuspiciousPatterns", () => {
    it("should update suspiciousPatterns state on success", async () => {
      const mockRows = [
        {
          volunteer_id: "vol-bad",
          volunteer_email: "bad@example.com",
          volunteer_display_name: "Bad Actor",
          org_id: "org-1",
          org_name: "Org",
          weekly_hours: 180,
          total_requests: 60,
        },
      ];
      mockRpc.mockResolvedValue({ data: mockRows, error: null });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await result.current.fetchSuspiciousPatterns();
      });

      expect(result.current.patternsLoading).toBe(false);
      expect(result.current.suspiciousPatterns).toHaveLength(1);
      expect(result.current.suspiciousPatterns[0]).toMatchObject({
        volunteerId: "vol-bad",
        weeklyHours: 180,
        totalRequests: 60,
      });
    });

    it("should set patternsError and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await expect(result.current.fetchSuspiciousPatterns()).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.suspiciousPatterns).toEqual([]);
      expect(result.current.patternsLoading).toBe(false);
    });

    it("should set patternsLoading to false after fetch", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminVolunteerValidation());

      await act(async () => {
        await result.current.fetchSuspiciousPatterns();
      });

      expect(result.current.patternsLoading).toBe(false);
    });
  });
});
