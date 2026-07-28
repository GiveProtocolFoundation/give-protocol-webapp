import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import { listAdminUsers } from "./adminSettingsService";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeMockAdminUserRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: "user-admin-1",
  email: "admin@example.com",
  display_name: "Alice Admin",
  created_at: "2026-01-01T10:00:00Z",
  ...overrides,
});

describe("adminSettingsService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe("listAdminUsers", () => {
    it("should call admin_list_admin_users RPC with no params", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listAdminUsers();

      expect(mockRpc).toHaveBeenCalledWith("admin_list_admin_users");
    });

    it("should map snake_case rows to camelCase AdminUserEntry", async () => {
      mockRpc.mockResolvedValue({
        data: [makeMockAdminUserRow()],
        error: null,
      });

      const result = await listAdminUsers();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        userId: "user-admin-1",
        email: "admin@example.com",
        displayName: "Alice Admin",
        joinedAt: "2026-01-01T10:00:00Z",
      });
    });

    it("should handle null email and displayName", async () => {
      mockRpc.mockResolvedValue({
        data: [makeMockAdminUserRow({ email: null, display_name: null })],
        error: null,
      });

      const result = await listAdminUsers();

      expect(result[0].email).toBeNull();
      expect(result[0].displayName).toBeNull();
    });

    it("should handle multiple admin users", async () => {
      const mockRows = [
        makeMockAdminUserRow({
          user_id: "admin-1",
          email: "admin1@example.com",
        }),
        makeMockAdminUserRow({
          user_id: "admin-2",
          email: "admin2@example.com",
        }),
        makeMockAdminUserRow({
          user_id: "admin-3",
          email: "admin3@example.com",
        }),
      ];
      mockRpc.mockResolvedValue({ data: mockRows, error: null });

      const result = await listAdminUsers();

      expect(result).toHaveLength(3);
      expect(result.map((u) => u.userId)).toEqual([
        "admin-1",
        "admin-2",
        "admin-3",
      ]);
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(listAdminUsers()).rejects.toThrow("RPC failed");
    });

    it("should throw on thrown exception", async () => {
      mockRpc.mockRejectedValue(new Error("Network failure"));

      await expect(listAdminUsers()).rejects.toThrow("Network failure");
    });

    it("should return empty array when data is null", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });

      const result = await listAdminUsers();

      expect(result).toEqual([]);
    });

    it("should return empty array when data is empty", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await listAdminUsers();

      expect(result).toEqual([]);
    });
  });
});
