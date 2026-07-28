import { describe, it, expect, beforeEach } from "@jest/globals";
import { renderHook, act } from "@testing-library/react";
import { supabase } from "@/lib/supabase";
import { useAdminPlatformConfig } from "./useAdminPlatformConfig";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeMockConfigRow = (overrides: Record<string, unknown> = {}) => ({
  key: "min_donation_usd",
  value: 2,
  description: "Minimum donation amount in USD",
  updated_by: "admin-1",
  updated_at: "2026-04-01T10:00:00Z",
  ...overrides,
});

const makeMockAuditRow = (overrides: Record<string, unknown> = {}) => ({
  id: "audit-1",
  config_key: "min_donation_usd",
  old_value: 2,
  new_value: 5,
  admin_user_id: "admin-1",
  created_at: "2026-04-11T09:00:00Z",
  ...overrides,
});

describe("useAdminPlatformConfig", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  // ─── fetchConfig ─────────────────────────────────────────────────────────

  describe("fetchConfig", () => {
    it("should update configs state on success", async () => {
      mockRpc.mockResolvedValue({ data: [makeMockConfigRow()], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.fetchConfig();
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.configs).toHaveLength(1);
      expect(result.current.configs[0]).toMatchObject({
        key: "min_donation_usd",
        value: 2,
        updatedBy: "admin-1",
      });
    });

    it("should call admin_get_config RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.fetchConfig();
      });

      expect(mockRpc).toHaveBeenCalledWith("admin_get_config");
    });

    it("should show toast and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await expect(result.current.fetchConfig()).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.configs).toEqual([]);
      expect(result.current.loading).toBe(false);
    });

    it("should set loading to false after fetch completes", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.fetchConfig();
      });

      expect(result.current.loading).toBe(false);
    });
  });

  // ─── saveConfig ──────────────────────────────────────────────────────────

  describe("saveConfig", () => {
    it("should call admin_update_config and refresh configs on success", async () => {
      // First call: update RPC; second call: list refresh
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: [makeMockConfigRow({ value: 5 })],
          error: null,
        });

      const { result } = renderHook(() => useAdminPlatformConfig());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveConfig({
          key: "min_donation_usd",
          value: 5,
        });
      });

      expect(success).toBe(true);
      expect(result.current.saving).toBe(false);
      expect(mockRpc).toHaveBeenCalledWith("admin_update_config", {
        p_key: "min_donation_usd",
        p_value: 5,
      });
      expect(result.current.configs[0].value).toBe(5);
    });

    it("should return false when update RPC returns error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Forbidden" },
      });

      const { result } = renderHook(() => useAdminPlatformConfig());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveConfig({
          key: "max_causes_per_charity",
          value: 10,
        });
      });

      expect(success).toBe(false);
      expect(result.current.saving).toBe(false);
    });

    it("should set saving to false after save completes", async () => {
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: [], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.saveConfig({
          key: "validation_window_days",
          value: 60,
        });
      });

      expect(result.current.saving).toBe(false);
    });

    it("should handle JSON array config values", async () => {
      const networks = [8453, 10, 1284];
      mockRpc
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({
          data: [
            makeMockConfigRow({ key: "supported_networks", value: networks }),
          ],
          error: null,
        });

      const { result } = renderHook(() => useAdminPlatformConfig());

      let success: boolean | undefined;
      await act(async () => {
        success = await result.current.saveConfig({
          key: "supported_networks",
          value: networks,
        });
      });

      expect(success).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith("admin_update_config", {
        p_key: "supported_networks",
        p_value: networks,
      });
    });
  });

  // ─── fetchAuditLog ───────────────────────────────────────────────────────

  describe("fetchAuditLog", () => {
    it("should update auditLog state on success", async () => {
      mockRpc.mockResolvedValue({ data: [makeMockAuditRow()], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(result.current.auditLoading).toBe(false);
      expect(result.current.auditLog).toHaveLength(1);
      expect(result.current.auditLog[0]).toMatchObject({
        id: "audit-1",
        configKey: "min_donation_usd",
        oldValue: 2,
        newValue: 5,
        adminUserId: "admin-1",
      });
    });

    it("should call admin_get_config_audit with default limit", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(mockRpc).toHaveBeenCalledWith("admin_get_config_audit", {
        p_limit: 50,
      });
    });

    it("should call admin_get_config_audit with custom limit", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.fetchAuditLog(10);
      });

      expect(mockRpc).toHaveBeenCalledWith("admin_get_config_audit", {
        p_limit: 10,
      });
    });

    it("should show toast and re-throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await expect(result.current.fetchAuditLog()).rejects.toThrow(
          "RPC failed",
        );
      });

      expect(result.current.auditLog).toEqual([]);
      expect(result.current.auditLoading).toBe(false);
    });

    it("should set auditLoading to false after fetch", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useAdminPlatformConfig());

      await act(async () => {
        await result.current.fetchAuditLog();
      });

      expect(result.current.auditLoading).toBe(false);
    });
  });
});
