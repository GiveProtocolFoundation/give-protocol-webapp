import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getAdminAuditLog,
  insertAuditEntry,
  logRead,
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

      const auditId = await insertAuditEntry("user_suspend", "user", "user-1");

      expect(auditId).toBeNull();
    });
  });

  describe("logRead", () => {
    it("should call insert_admin_audit_read_entry with entity_id for single-entity view", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: "read-audit-id",
        error: null,
      });

      const auditId = await logRead("user", "user-123", {
        source: "admin_get_donor_detail",
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_admin_audit_read_entry",
        {
          p_entity_type: "user",
          p_entity_id: "user-123",
          p_context: { source: "admin_get_donor_detail" },
        },
      );
      expect(auditId).toBe("read-audit-id");
    });

    it("should call with null entity_id for list views", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: "list-audit-id",
        error: null,
      });

      const auditId = await logRead("user", null, {
        source: "admin_list_donors",
        page: 1,
        limit: 50,
        result_count: 25,
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_admin_audit_read_entry",
        {
          p_entity_type: "user",
          p_entity_id: null,
          p_context: {
            source: "admin_list_donors",
            page: 1,
            limit: 50,
            result_count: 25,
          },
        },
      );
      expect(auditId).toBe("list-audit-id");
    });

    it("should pass null context when not provided", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: "audit-id",
        error: null,
      });

      await logRead("charity");

      expect(supabase.rpc).toHaveBeenCalledWith(
        "insert_admin_audit_read_entry",
        {
          p_entity_type: "charity",
          p_entity_id: null,
          p_context: null,
        },
      );
    });

    it("should return null on RPC error", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "Access denied: admin role required" },
      });

      const auditId = await logRead("user", "user-1", {
        source: "admin_get_donor_detail",
      });

      expect(auditId).toBeNull();
    });

    it("should return null on thrown exception", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      const auditId = await logRead("volunteer", null, {
        source: "admin_list_volunteers",
      });

      expect(auditId).toBeNull();
    });
  });
});
