import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  listCharities,
  updateCharityStatus,
  notifyCharityStatusChange,
} from "./adminCharityService";
import type { AdminCharityListRow } from "@/types/adminCharity";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;
const mockInvoke = supabase.functions.invoke as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeRow = (
  overrides: Partial<AdminCharityListRow> = {},
): AdminCharityListRow => ({
  id: "charity-uuid-1",
  user_id: "user-uuid-1",
  name: "Test Charity",
  category: "education",
  logo_url: "https://example.com/logo.png",
  mission: "Test mission",
  verification_id: "verif-uuid-1",
  verification_status: "pending",
  review_notes: null,
  reviewed_at: null,
  wallet_address: "0xabc",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  total_count: 1,
  ...overrides,
});

describe("adminCharityService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: null, error: null });
  });

  // ─── listCharities ──────────────────────────────────────────────────────────

  describe("listCharities", () => {
    it("should call admin_list_charities with default params when no filters given", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listCharities();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_charities", {
        p_status: null,
        p_category: null,
        p_search: null,
        p_page: 1,
        p_limit: 50,
      });
    });

    it("should pass status and search filters through to RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listCharities({
        status: "pending",
        search: "water",
        page: 2,
        limit: 25,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_charities", {
        p_status: "pending",
        p_category: null,
        p_search: "water",
        p_page: 2,
        p_limit: 25,
      });
    });

    it("should return empty result when RPC returns empty array", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await listCharities();

      expect(result.charities).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(0);
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied", code: "42501" },
      });

      await expect(listCharities()).rejects.toThrow("Access denied");
    });

    it("should rethrow when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      await expect(listCharities()).rejects.toThrow("Network error");
    });

    it("should map snake_case row to camelCase AdminCharityListItem", async () => {
      const row = makeRow({ total_count: 3 });
      mockRpc.mockResolvedValue({ data: [row], error: null });

      const result = await listCharities();

      expect(result.charities).toHaveLength(1);
      const charity = result.charities[0];
      expect(charity.id).toBe("charity-uuid-1");
      expect(charity.userId).toBe("user-uuid-1");
      expect(charity.name).toBe("Test Charity");
      expect(charity.category).toBe("education");
      expect(charity.logoUrl).toBe("https://example.com/logo.png");
      expect(charity.mission).toBe("Test mission");
      expect(charity.verificationId).toBe("verif-uuid-1");
      expect(charity.verificationStatus).toBe("pending");
      expect(charity.reviewNotes).toBeNull();
      expect(charity.reviewedAt).toBeNull();
      expect(charity.walletAddress).toBe("0xabc");
      expect(charity.createdAt).toBe("2026-01-01T00:00:00Z");
      expect(charity.updatedAt).toBe("2026-01-01T00:00:00Z");
    });

    it("should compute totalCount and totalPages from first row", async () => {
      const rows = [
        makeRow({ total_count: 3 }),
        makeRow({ id: "charity-uuid-2", name: "Charity 2", total_count: 3 }),
      ];
      mockRpc.mockResolvedValue({ data: rows, error: null });

      const result = await listCharities({ limit: 2 });

      expect(result.totalCount).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.charities).toHaveLength(2);
    });

    it("should preserve page and limit from filters in the result", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await listCharities({ page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });
  });

  // ─── updateCharityStatus ────────────────────────────────────────────────────

  describe("updateCharityStatus", () => {
    it("should call admin_update_charity_status with correct params", async () => {
      mockRpc.mockResolvedValue({ data: "verif-uuid-1", error: null });

      await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "verified",
        reason: "Documentation verified",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_charity_status", {
        p_charity_id: "charity-uuid-1",
        p_new_status: "verified",
        p_reason: "Documentation verified",
      });
    });

    it("should pass null reason when none given", async () => {
      mockRpc.mockResolvedValue({ data: "verif-uuid-1", error: null });

      await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "pending",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_update_charity_status", {
        p_charity_id: "charity-uuid-1",
        p_new_status: "pending",
        p_reason: null,
      });
    });

    it("should return the verification UUID on success", async () => {
      mockRpc.mockResolvedValue({ data: "verif-uuid-1", error: null });

      const result = await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "rejected",
        reason: "Invalid documents",
      });

      expect(result).toBe("verif-uuid-1");
    });

    it("should return null on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const result = await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "suspended",
        reason: "Fraud detected",
      });

      expect(result).toBeNull();
    });

    it("should return null when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      const result = await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "suspended",
        reason: "Fraud detected",
      });

      expect(result).toBeNull();
    });

    it("should support all valid status values", async () => {
      const statuses = [
        "pending",
        "verified",
        "approved",
        "rejected",
        "suspended",
      ] as const;
      for (const status of statuses) {
        mockRpc.mockResolvedValue({ data: "verif-uuid-1", error: null });
        const result = await updateCharityStatus({
          charityId: "charity-uuid-1",
          newStatus: status,
        });
        expect(result).toBe("verif-uuid-1");
        mockRpc.mockReset();
        mockInvoke.mockResolvedValue({ data: null, error: null });
      }
    });

    it("should invoke charity-status-email edge function on success", async () => {
      mockRpc.mockResolvedValue({ data: "verif-uuid-1", error: null });

      await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "verified",
        reason: "All documents verified",
      });

      // Allow the fire-and-forget promise to settle
      await Promise.resolve();

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "charity-status-email",
        {
          body: {
            charityId: "charity-uuid-1",
            newStatus: "verified",
            reason: "All documents verified",
          },
        },
      );
    });

    it("should not invoke email edge function when RPC fails", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "verified",
      });

      await Promise.resolve();

      expect(supabase.functions.invoke).not.toHaveBeenCalled();
    });

    it("should still return verification UUID even if email invocation fails", async () => {
      mockRpc.mockResolvedValue({ data: "verif-uuid-1", error: null });
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: "Email service unavailable" },
      });

      const result = await updateCharityStatus({
        charityId: "charity-uuid-1",
        newStatus: "rejected",
        reason: "Invalid documents",
      });

      expect(result).toBe("verif-uuid-1");
    });
  });

  // ─── notifyCharityStatusChange ──────────────────────────────────────────────

  describe("notifyCharityStatusChange", () => {
    it("should invoke charity-status-email with correct body", async () => {
      await notifyCharityStatusChange({
        charityId: "charity-uuid-1",
        newStatus: "suspended",
        reason: "Policy violation",
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "charity-status-email",
        {
          body: {
            charityId: "charity-uuid-1",
            newStatus: "suspended",
            reason: "Policy violation",
          },
        },
      );
    });

    it("should pass null reason when none provided", async () => {
      await notifyCharityStatusChange({
        charityId: "charity-uuid-1",
        newStatus: "verified",
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "charity-status-email",
        {
          body: {
            charityId: "charity-uuid-1",
            newStatus: "verified",
            reason: null,
          },
        },
      );
    });

    it("should not throw when edge function returns an error", async () => {
      mockInvoke.mockResolvedValue({
        data: null,
        error: { message: "Resend API error" },
      });

      await expect(
        notifyCharityStatusChange({
          charityId: "charity-uuid-1",
          newStatus: "rejected",
          reason: "No docs",
        }),
      ).resolves.toBeUndefined();
    });

    it("should not throw when edge function invocation throws", async () => {
      mockInvoke.mockRejectedValue(new Error("Network timeout"));

      await expect(
        notifyCharityStatusChange({
          charityId: "charity-uuid-1",
          newStatus: "suspended",
          reason: "Fraud",
        }),
      ).resolves.toBeUndefined();
    });
  });
});
