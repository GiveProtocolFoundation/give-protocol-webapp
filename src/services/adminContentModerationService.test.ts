import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  listOpportunities,
  listCauses,
  moderateContent,
  cascadeCharityModeration,
} from "./adminContentModerationService";
import type {
  AdminOpportunityListRow,
  AdminCauseListRow,
} from "@/types/adminContentModeration";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeOpportunityRow = (
  overrides: Partial<AdminOpportunityListRow> = {},
): AdminOpportunityListRow => ({
  id: "opp-uuid-1",
  charity_id: "charity-uuid-1",
  charity_name: "Test Charity",
  title: "Help Build a School",
  status: "active",
  moderation_status: "visible",
  moderation_reason: null,
  moderated_at: null,
  updated_at: "2026-01-01T00:00:00Z",
  total_count: 1,
  ...overrides,
});

const makeCauseRow = (
  overrides: Partial<AdminCauseListRow> = {},
): AdminCauseListRow => ({
  id: "cause-uuid-1",
  charity_id: "charity-uuid-1",
  charity_name: "Test Charity",
  title: "Clean Water Initiative",
  status: "active",
  moderation_status: "visible",
  moderation_reason: null,
  moderated_at: null,
  updated_at: "2026-01-01T00:00:00Z",
  total_count: 1,
  ...overrides,
});

describe("adminContentModerationService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  // ─── listOpportunities ──────────────────────────────────────────────────────

  describe("listOpportunities", () => {
    it("should call admin_list_opportunities with default params when no filters given", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listOpportunities();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_opportunities", {
        p_moderation_status: null,
        p_search: null,
        p_charity_id: null,
        p_page: 1,
        p_limit: 50,
      });
    });

    it("should pass filters through to RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listOpportunities({
        moderationStatus: "flagged",
        search: "school",
        page: 2,
        limit: 25,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_opportunities", {
        p_moderation_status: "flagged",
        p_search: "school",
        p_charity_id: null,
        p_page: 2,
        p_limit: 25,
      });
    });

    it("should return empty result when RPC returns empty array", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await listOpportunities();

      expect(result.opportunities).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
      expect(result.totalPages).toBe(0);
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(listOpportunities()).rejects.toThrow("RPC failed");
    });

    it("should throw when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      await expect(listOpportunities()).rejects.toThrow("Network error");
    });

    it("should map snake_case row to camelCase AdminOpportunityListItem", async () => {
      const row = makeOpportunityRow({ total_count: 1 });
      mockRpc.mockResolvedValue({ data: [row], error: null });

      const result = await listOpportunities();

      expect(result.opportunities).toHaveLength(1);
      const opp = result.opportunities[0];
      expect(opp.id).toBe("opp-uuid-1");
      expect(opp.charityId).toBe("charity-uuid-1");
      expect(opp.charityName).toBe("Test Charity");
      expect(opp.title).toBe("Help Build a School");
      expect(opp.status).toBe("active");
      expect(opp.moderationStatus).toBe("visible");
      expect(opp.moderationReason).toBeNull();
      expect(opp.moderatedAt).toBeNull();
      expect(opp.updatedAt).toBe("2026-01-01T00:00:00Z");
    });

    it("should compute totalCount and totalPages from first row", async () => {
      const rows = [
        makeOpportunityRow({ total_count: 3 }),
        makeOpportunityRow({
          id: "opp-uuid-2",
          title: "Opp 2",
          total_count: 3,
        }),
      ];
      mockRpc.mockResolvedValue({ data: rows, error: null });

      const result = await listOpportunities({ limit: 2 });

      expect(result.totalCount).toBe(3);
      expect(result.totalPages).toBe(2);
      expect(result.opportunities).toHaveLength(2);
    });

    it("should preserve page and limit from filters", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await listOpportunities({ page: 3, limit: 10 });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });
  });

  // ─── listCauses ─────────────────────────────────────────────────────────────

  describe("listCauses", () => {
    it("should call admin_list_causes with default params when no filters given", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listCauses();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_causes", {
        p_moderation_status: null,
        p_search: null,
        p_charity_id: null,
        p_page: 1,
        p_limit: 50,
      });
    });

    it("should pass filters through to RPC", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listCauses({
        moderationStatus: "hidden",
        search: "water",
        page: 2,
        limit: 20,
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_causes", {
        p_moderation_status: "hidden",
        p_search: "water",
        p_charity_id: null,
        p_page: 2,
        p_limit: 20,
      });
    });

    it("should return empty result when RPC returns empty array", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await listCauses();

      expect(result.causes).toHaveLength(0);
      expect(result.totalCount).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it("should throw on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      await expect(listCauses()).rejects.toThrow("RPC failed");
    });

    it("should throw when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      await expect(listCauses()).rejects.toThrow("Network error");
    });

    it("should map snake_case row to camelCase AdminCauseListItem", async () => {
      const row = makeCauseRow({
        moderation_status: "flagged",
        moderation_reason: "Spam content",
        total_count: 1,
      });
      mockRpc.mockResolvedValue({ data: [row], error: null });

      const result = await listCauses();

      const cause = result.causes[0];
      expect(cause.id).toBe("cause-uuid-1");
      expect(cause.charityId).toBe("charity-uuid-1");
      expect(cause.charityName).toBe("Test Charity");
      expect(cause.title).toBe("Clean Water Initiative");
      expect(cause.moderationStatus).toBe("flagged");
      expect(cause.moderationReason).toBe("Spam content");
    });

    it("should compute totalCount and totalPages from first row", async () => {
      const rows = [
        makeCauseRow({ total_count: 4 }),
        makeCauseRow({ id: "cause-uuid-2", title: "Cause 2", total_count: 4 }),
      ];
      mockRpc.mockResolvedValue({ data: rows, error: null });

      const result = await listCauses({ limit: 2 });

      expect(result.totalCount).toBe(4);
      expect(result.totalPages).toBe(2);
    });
  });

  // ─── moderateContent ────────────────────────────────────────────────────────

  describe("moderateContent", () => {
    it("should call admin_moderate_content with correct params for hide", async () => {
      mockRpc.mockResolvedValue({ data: "audit-uuid-1", error: null });

      await moderateContent({
        contentType: "opportunity",
        contentId: "opp-uuid-1",
        action: "hide",
        reason: "Violates policy",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_moderate_content", {
        p_content_type: "opportunity",
        p_content_id: "opp-uuid-1",
        p_action: "hide",
        p_reason: "Violates policy",
      });
    });

    it("should call admin_moderate_content with correct params for flag", async () => {
      mockRpc.mockResolvedValue({ data: "audit-uuid-2", error: null });

      await moderateContent({
        contentType: "cause",
        contentId: "cause-uuid-1",
        action: "flag",
        reason: "Needs review",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_moderate_content", {
        p_content_type: "cause",
        p_content_id: "cause-uuid-1",
        p_action: "flag",
        p_reason: "Needs review",
      });
    });

    it("should pass null reason when none given", async () => {
      mockRpc.mockResolvedValue({ data: "audit-uuid-1", error: null });

      await moderateContent({
        contentType: "opportunity",
        contentId: "opp-uuid-1",
        action: "unhide",
      });

      expect(supabase.rpc).toHaveBeenCalledWith("admin_moderate_content", {
        p_content_type: "opportunity",
        p_content_id: "opp-uuid-1",
        p_action: "unhide",
        p_reason: null,
      });
    });

    it("should return the audit UUID on success", async () => {
      mockRpc.mockResolvedValue({ data: "audit-uuid-1", error: null });

      const result = await moderateContent({
        contentType: "opportunity",
        contentId: "opp-uuid-1",
        action: "hide",
        reason: "Policy violation",
      });

      expect(result).toBe("audit-uuid-1");
    });

    it("should return null on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const result = await moderateContent({
        contentType: "cause",
        contentId: "cause-uuid-1",
        action: "flag",
      });

      expect(result).toBeNull();
    });

    it("should return null when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      const result = await moderateContent({
        contentType: "opportunity",
        contentId: "opp-uuid-1",
        action: "unflag",
      });

      expect(result).toBeNull();
    });

    it("should support all valid action values", async () => {
      const actions = ["hide", "unhide", "flag", "unflag"] as const;
      for (const action of actions) {
        mockRpc.mockResolvedValue({ data: "audit-uuid-1", error: null });
        const result = await moderateContent({
          contentType: "opportunity",
          contentId: "opp-uuid-1",
          action,
        });
        expect(result).toBe("audit-uuid-1");
        mockRpc.mockReset();
      }
    });
  });

  // ─── cascadeCharityModeration ───────────────────────────────────────────────

  describe("cascadeCharityModeration", () => {
    it("should call admin_cascade_charity_moderation with correct params", async () => {
      mockRpc.mockResolvedValue({ data: 5, error: null });

      await cascadeCharityModeration({
        charityId: "charity-uuid-1",
        action: "hide",
        reason: "Charity suspended",
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "admin_cascade_charity_moderation",
        {
          p_charity_id: "charity-uuid-1",
          p_action: "hide",
          p_reason: "Charity suspended",
        },
      );
    });

    it("should pass null reason when none given", async () => {
      mockRpc.mockResolvedValue({ data: 3, error: null });

      await cascadeCharityModeration({
        charityId: "charity-uuid-1",
        action: "unhide",
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "admin_cascade_charity_moderation",
        {
          p_charity_id: "charity-uuid-1",
          p_action: "unhide",
          p_reason: null,
        },
      );
    });

    it("should return the affected row count on success", async () => {
      mockRpc.mockResolvedValue({ data: 7, error: null });

      const result = await cascadeCharityModeration({
        charityId: "charity-uuid-1",
        action: "flag",
        reason: "Under investigation",
      });

      expect(result).toBe(7);
    });

    it("should return null on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const result = await cascadeCharityModeration({
        charityId: "charity-uuid-1",
        action: "hide",
      });

      expect(result).toBeNull();
    });

    it("should return null when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      const result = await cascadeCharityModeration({
        charityId: "charity-uuid-1",
        action: "unflag",
      });

      expect(result).toBeNull();
    });
  });
});
