import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getConfig,
  updateConfig,
  getConfigAudit,
  configKeyLabel,
  configValueInputType,
} from "./adminPlatformConfigService";

describe("adminPlatformConfigService", () => {
  beforeEach(() => {
    (
      supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
    ).mockReset();
  });

  // ─── getConfig ──────────────────────────────────────────────────────────────

  describe("getConfig", () => {
    it("should call admin_get_config with no params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      await getConfig();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_config");
    });

    it("should map snake_case rows to camelCase PlatformConfigEntry", async () => {
      const mockRows = [
        {
          key: "min_donation_usd",
          value: 2,
          description: "Minimum donation amount in USD",
          updated_by: "admin-1",
          updated_at: "2026-04-01T10:00:00Z",
        },
        {
          key: "max_causes_per_charity",
          value: 3,
          description: "Max active causes per charity",
          updated_by: null,
          updated_at: null,
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await getConfig();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        key: "min_donation_usd",
        value: 2,
        description: "Minimum donation amount in USD",
        updatedBy: "admin-1",
        updatedAt: "2026-04-01T10:00:00Z",
      });
      expect(result[1]).toEqual({
        key: "max_causes_per_charity",
        value: 3,
        description: "Max active causes per charity",
        updatedBy: null,
        updatedAt: null,
      });
    });

    it("should handle JSON config values", async () => {
      const networksValue = [8453, 10, 42161];
      const mockRows = [
        {
          key: "supported_networks",
          value: networksValue,
          description: "Supported network chain IDs",
          updated_by: null,
          updated_at: null,
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await getConfig();

      expect(result[0].value).toEqual(networksValue);
    });

    it("should throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      await expect(getConfig()).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      await expect(getConfig()).rejects.toThrow("Network failure");
    });

    it("should return empty array when data is null", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const result = await getConfig();

      expect(result).toEqual([]);
    });
  });

  // ─── updateConfig ────────────────────────────────────────────────────────────

  describe("updateConfig", () => {
    it("should call admin_update_config with correct params for a number value", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const success = await updateConfig({ key: "min_donation_usd", value: 5 });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_config", {
        p_key: "min_donation_usd",
        p_value: 5,
      });
      expect(success).toBe(true);
    });

    it("should call admin_update_config with a JSON array value", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: null });

      const networks = [8453, 10];
      const success = await updateConfig({
        key: "supported_networks",
        value: networks,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_config", {
        p_key: "supported_networks",
        p_value: networks,
      });
      expect(success).toBe(true);
    });

    it("should return false on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Forbidden" } });

      const success = await updateConfig({
        key: "max_causes_per_charity",
        value: 10,
      });

      expect(success).toBe(false);
    });

    it("should return false on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      const success = await updateConfig({
        key: "validation_window_days",
        value: 60,
      });

      expect(success).toBe(false);
    });
  });

  // ─── getConfigAudit ──────────────────────────────────────────────────────────

  describe("getConfigAudit", () => {
    it("should call admin_get_config_audit with default limit", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      await getConfigAudit();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_config_audit", {
        p_limit: 50,
      });
    });

    it("should call admin_get_config_audit with custom limit", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: [], error: null });

      await getConfigAudit(10);

      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_config_audit", {
        p_limit: 10,
      });
    });

    it("should map snake_case rows to camelCase PlatformConfigAuditEntry", async () => {
      const mockRows = [
        {
          id: "audit-1",
          config_key: "min_donation_usd",
          old_value: 2,
          new_value: 5,
          admin_user_id: "admin-1",
          created_at: "2026-04-11T09:00:00Z",
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await getConfigAudit();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: "audit-1",
        configKey: "min_donation_usd",
        oldValue: 2,
        newValue: 5,
        adminUserId: "admin-1",
        createdAt: "2026-04-11T09:00:00Z",
      });
    });

    it("should handle null old/new values in audit rows", async () => {
      const mockRows = [
        {
          id: "audit-2",
          config_key: "supported_networks",
          old_value: null,
          new_value: [8453, 10],
          admin_user_id: null,
          created_at: "2026-04-10T12:00:00Z",
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: mockRows, error: null });

      const result = await getConfigAudit();

      expect(result[0].oldValue).toBeNull();
      expect(result[0].newValue).toEqual([8453, 10]);
      expect(result[0].adminUserId).toBeNull();
    });

    it("should throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: null, error: { message: "Access denied" } });

      await expect(getConfigAudit()).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      await expect(getConfigAudit()).rejects.toThrow("Network failure");
    });
  });

  // ─── configKeyLabel ──────────────────────────────────────────────────────────

  describe("configKeyLabel", () => {
    it("should return human-readable label for min_donation_usd", () => {
      expect(configKeyLabel("min_donation_usd")).toBe("Minimum Donation (USD)");
    });

    it("should return human-readable label for max_causes_per_charity", () => {
      expect(configKeyLabel("max_causes_per_charity")).toBe(
        "Max Active Causes per Charity",
      );
    });

    it("should return human-readable label for validation_window_days", () => {
      expect(configKeyLabel("validation_window_days")).toBe(
        "Validation Window (Days)",
      );
    });

    it("should return human-readable label for supported_networks", () => {
      expect(configKeyLabel("supported_networks")).toBe(
        "Supported Networks (JSON)",
      );
    });
  });

  // ─── configValueInputType ────────────────────────────────────────────────────

  describe("configValueInputType", () => {
    it("should return 'number' for numeric values", () => {
      expect(configValueInputType(42)).toBe("number");
      expect(configValueInputType(0)).toBe("number");
    });

    it("should return 'json' for array values", () => {
      expect(configValueInputType([1, 2, 3])).toBe("json");
    });

    it("should return 'json' for object values", () => {
      expect(configValueInputType({ key: "val" })).toBe("json");
    });

    it("should return 'json' for string values", () => {
      expect(configValueInputType("text")).toBe("json");
    });
  });
});
