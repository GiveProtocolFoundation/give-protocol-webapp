import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getAdminAuditLog,
  insertAuditEntry,
  logRead,
  _resetDedupWindow,
} from "./adminAuditService";

describe("adminAuditService", () => {
  beforeEach(() => {
    (
      supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
    ).mockReset();
  });

  describe("getAdminAuditLog", () => {
    it("should call admin_get_audit_log RPC with default params when no filters", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await getAdminAuditLog();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_audit_log", {
        p_action_type: null,
        p_entity_type: null,
        p_entity_id: null,
        p_admin_user_id: null,
        p_date_from: null,
        p_date_to: null,
        p_page: 1,
        p_limit: 50,
      });
      expect(result.entries).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should pass filters to RPC correctly", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: [],
        error: null,
      });

      await getAdminAuditLog({
        actionType: "charity_status_change",
        entityType: "charity",
        page: 2,
        limit: 25,
        dateFrom: "2026-01-01T00:00:00Z",
        dateTo: "2026-12-31T23:59:59Z",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_get_audit_log", {
        p_action_type: "charity_status_change",
        p_entity_type: "charity",
        p_entity_id: null,
        p_admin_user_id: null,
        p_date_from: "2026-01-01T00:00:00Z",
        p_date_to: "2026-12-31T23:59:59Z",
        p_page: 2,
        p_limit: 25,
      });
    });

    it("should map snake_case rows to camelCase entries", async () => {
      const mockRow = {
        id: "audit-1",
        admin_user_id: "admin-1",
        action_type: "charity_status_change",
        entity_type: "charity",
        entity_id: "charity-1",
        old_values: { status: "pending" },
        new_values: { status: "verified" },
        ip_address: "192.168.1.1",
        created_at: "2026-04-11T00:00:00Z",
        total_count: 1,
      };
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: [mockRow],
        error: null,
      });

      const result = await getAdminAuditLog();

      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]).toEqual({
        id: "audit-1",
        adminUserId: "admin-1",
        actionType: "charity_status_change",
        entityType: "charity",
        entityId: "charity-1",
        oldValues: { status: "pending" },
        newValues: { status: "verified" },
        ipAddress: "192.168.1.1",
        createdAt: "2026-04-11T00:00:00Z",
      });
      expect(result.totalCount).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it("should compute totalPages correctly", async () => {
      const mockRows = Array.from({ length: 3 }, (_, i) => ({
        id: `audit-${i}`,
        admin_user_id: "admin-1",
        action_type: "config_change",
        entity_type: "platform_config",
        entity_id: `config-${i}`,
        old_values: null,
        new_values: null,
        ip_address: null,
        created_at: "2026-04-11T00:00:00Z",
        total_count: 75,
      }));
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: mockRows,
        error: null,
      });

      const result = await getAdminAuditLog({ limit: 25 });

      expect(result.totalPages).toBe(3);
      expect(result.limit).toBe(25);
    });

    it("should return empty result on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const result = await getAdminAuditLog();

      expect(result.entries).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should return empty result on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      const result = await getAdminAuditLog();

      expect(result.entries).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it("should handle null data gracefully", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await getAdminAuditLog();

      expect(result.entries).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });

  describe("insertAuditEntry", () => {
    it("should call insert_admin_audit_entry RPC with correct params", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: "new-audit-id",
        error: null,
      });

      const auditId = await insertAuditEntry(
        "charity_status_change",
        "charity",
        "charity-1",
        { status: "pending" },
        { status: "verified" },
      );

      expect(supabase.rpc).toHaveBeenCalledWith("insert_admin_audit_entry", {
        p_action_type: "charity_status_change",
        p_entity_type: "charity",
        p_entity_id: "charity-1",
        p_old_values: { status: "pending" },
        p_new_values: { status: "verified" },
        p_ip_address: null,
      });
      expect(auditId).toBe("new-audit-id");
    });

    it("should pass null for optional old/new values", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: "new-audit-id",
        error: null,
      });

      await insertAuditEntry("config_change", "platform_config", "config-1");

      expect(supabase.rpc).toHaveBeenCalledWith("insert_admin_audit_entry", {
        p_action_type: "config_change",
        p_entity_type: "platform_config",
        p_entity_id: "config-1",
        p_old_values: null,
        p_new_values: null,
        p_ip_address: null,
      });
    });

    it("should return null on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const auditId = await insertAuditEntry(
        "user_status_change",
        "user",
        "user-1",
      );

      expect(auditId).toBeNull();
    });

    it("should return null on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      const auditId = await insertAuditEntry(
        "user_suspend",
        "user",
        "user-1",
      );

      expect(auditId).toBeNull();
    });
  });

  describe("logRead", () => {
    beforeEach(() => {
      _resetDedupWindow();
    });

    it("should call insert_admin_audit_read_entry RPC with view_pii_list for null entityId", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "read-audit-1", error: null });

      const result = await logRead("user", null, {
        page: 1,
        limit: 50,
        filterKeys: ["status"],
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_admin_audit_read_entry",
        {
          p_action_type: "view_pii_list",
          p_entity_type: "user",
          p_entity_id: null,
          p_context: {
            page: 1,
            limit: 50,
            filter_keys: ["status"],
            result_count: undefined,
            source: undefined,
          },
        },
      );
      expect(result).toBe("read-audit-1");
    });

    it("should call RPC with view_pii for concrete entityId", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "read-audit-2", error: null });

      const result = await logRead("charity", "charity-123");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_admin_audit_read_entry",
        {
          p_action_type: "view_pii",
          p_entity_type: "charity",
          p_entity_id: "charity-123",
          p_context: null,
        },
      );
      expect(result).toBe("read-audit-2");
    });

    it("should deduplicate identical calls within 1s window", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "read-audit-3", error: null });

      const first = await logRead("user", null, { page: 1, limit: 50 });
      const second = await logRead("user", null, { page: 1, limit: 50 });

      expect(first).toBe("read-audit-3");
      expect(second).toBeNull();
      // RPC should only be called once (the second is deduped)
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });

    it("should allow calls with different parameters", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "read-audit-4", error: null });

      const first = await logRead("user", null, { page: 1, limit: 50 });
      const second = await logRead("user", null, { page: 2, limit: 50 });

      expect(first).toBe("read-audit-4");
      expect(second).toBe("read-audit-4");
      expect(supabase.rpc).toHaveBeenCalledTimes(2);
    });

    it("should not include filter values in context, only keys", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "read-audit-5", error: null });

      await logRead("donation", null, {
        page: 1,
        limit: 50,
        filterKeys: ["paymentMethod", "flagged"],
      });

      const rpcCall = (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mock.calls[0];
      const context = rpcCall[1].p_context;

      // Only filter keys, no filter values
      expect(context.filter_keys).toEqual(["paymentMethod", "flagged"]);
      expect(context).not.toHaveProperty("paymentMethod");
      expect(context).not.toHaveProperty("flagged");
    });

    it("should return null and not throw on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const result = await logRead("user", "user-1");

      expect(result).toBeNull();
    });

    it("should return null and not throw on exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network failure"));

      const result = await logRead("charity", null);

      expect(result).toBeNull();
    });

    it("should pass null context when no context provided", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "read-audit-6", error: null });

      await logRead("volunteer", "vol-1");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_admin_audit_read_entry",
        {
          p_action_type: "view_pii",
          p_entity_type: "volunteer",
          p_entity_id: "vol-1",
          p_context: null,
        },
      );
    });

    it("should sort filter keys for stable dedup", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({ data: "read-audit-7", error: null });

      const first = await logRead("user", null, {
        page: 1,
        filterKeys: ["status", "authMethod"],
      });
      const second = await logRead("user", null, {
        page: 1,
        filterKeys: ["authMethod", "status"],
      });

      expect(first).toBe("read-audit-7");
      // Same keys in different order should dedup
      expect(second).toBeNull();
      expect(supabase.rpc).toHaveBeenCalledTimes(1);
    });
  });
});
