import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import { useAdminAuditLog } from "./useAdminAuditLog";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeMockAuditRow = (overrides: Record<string, unknown> = {}) => ({
  id: "audit-1",
  admin_user_id: "admin-1",
  action_type: "charity_status_change",
  entity_type: "charity",
  entity_id: "charity-1",
  old_values: null,
  new_values: { status: "verified" },
  ip_address: null,
  created_at: "2026-04-11T00:00:00Z",
  total_count: 1,
  ...overrides,
});

describe("useAdminAuditLog", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe("fetchAuditLog", () => {
    it("should update entries state on success", async () => {
      mockRpc.mockResolvedValue({ data: [makeMockAuditRow()], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.entries).toHaveLength(1);
      expect(result.current.entries[0]).toMatchObject({
        id: "audit-1",
        adminUserId: "admin-1",
        actionType: "charity_status_change",
        entityType: "charity",
      });
    });

    it("should call admin_get_audit_log RPC with default params when no filters", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(mockRpc).toHaveBeenCalledWith("admin_get_audit_log", {
        p_action_type: null,
        p_entity_type: null,
        p_entity_id: null,
        p_admin_user_id: null,
        p_date_from: null,
        p_date_to: null,
        p_page: 1,
        p_limit: 50,
      });
    });

    it("should pass actionType and entityType filters to RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog({
          actionType: "config_change",
          entityType: "platform_config",
          page: 2,
          limit: 25,
        });
      });

      expect(mockRpc).toHaveBeenCalledWith("admin_get_audit_log", {
        p_action_type: "config_change",
        p_entity_type: "platform_config",
        p_entity_id: null,
        p_admin_user_id: null,
        p_date_from: null,
        p_date_to: null,
        p_page: 2,
        p_limit: 25,
      });
    });

    it("should pass date range filters to RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog({
          dateFrom: "2026-01-01T00:00:00Z",
          dateTo: "2026-12-31T23:59:59Z",
        });
      });

      expect(mockRpc).toHaveBeenCalledWith("admin_get_audit_log", {
        p_action_type: null,
        p_entity_type: null,
        p_entity_id: null,
        p_admin_user_id: null,
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-12-31T23:59:59Z",
        p_page: 1,
        p_limit: 50,
      });
    });

    it("should set totalCount and totalPages from RPC result", async () => {
      const rows = Array.from({ length: 5 }, (_, i) =>
        makeMockAuditRow({ id: `audit-${i}`, total_count: 100 }),
      );
      mockRpc.mockResolvedValue({ data: rows, error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog({ limit: 50 });
      });

      expect(result.current.totalCount).toBe(100);
      expect(result.current.totalPages).toBe(2);
      expect(result.current.entries).toHaveLength(5);
    });

    it("should show toast and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await expect(result.current.fetchAuditLog()).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.entries).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.loading).toBe(false);
    });

    it("should set loading to false after fetch completes", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(result.current.loading).toBe(false);
    });

    it("should update page from result", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog({ page: 3 });
      });

      expect(result.current.page).toBe(3);
    });

    it("should handle null data gracefully", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(result.current.entries).toEqual([]);
      expect(result.current.totalCount).toBe(0);
    });

    it("should expose limit from result", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog({ limit: 25 });
      });

      expect(result.current.limit).toBe(25);
    });

    it("should map snake_case rows to camelCase entries", async () => {
      const mockRow = makeMockAuditRow({
        old_values: { status: "pending" },
        new_values: { status: "verified" },
        ip_address: "192.168.1.1",
      });
      mockRpc.mockResolvedValue({ data: [mockRow], error: null });

      const { result } = renderHook(() => useAdminAuditLog());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(result.current.entries[0]).toMatchObject({
        oldValues: { status: "pending" },
        newValues: { status: "verified" },
        ipAddress: "192.168.1.1",
        createdAt: "2026-04-11T00:00:00Z",
      });
    });
  });
});
