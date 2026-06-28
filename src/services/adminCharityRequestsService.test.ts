import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import { listCharityRequests } from "./adminCharityRequestsService";
import type { AdminCharityRequestRow } from "@/types/adminCharityRequests";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const makeRow = (
  overrides: Partial<AdminCharityRequestRow> = {},
): AdminCharityRequestRow => ({
  ein: "123456789",
  request_count: 3,
  first_requested_at: "2026-01-01T00:00:00Z",
  latest_requested_at: "2026-04-01T00:00:00Z",
  latest_requester_email: "donor@example.com",
  total_count: 1,
  ...overrides,
});

describe("adminCharityRequestsService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe("listCharityRequests", () => {
    it("calls admin_list_charity_requests RPC with default pagination", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listCharityRequests();

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_charity_requests", {
        p_limit: 100,
        p_offset: 0,
      });
    });

    it("forwards custom limit and offset", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await listCharityRequests(25, 50);

      expect(supabase.rpc).toHaveBeenCalledWith("admin_list_charity_requests", {
        p_limit: 25,
        p_offset: 50,
      });
    });

    it("returns empty result when RPC returns no rows", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      const result = await listCharityRequests();

      expect(result.requests).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("returns empty result on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Access denied" },
      });

      const result = await listCharityRequests();

      expect(result.requests).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it("returns empty result when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));

      const result = await listCharityRequests();

      expect(result.requests).toHaveLength(0);
    });

    it("maps snake_case row to camelCase item", async () => {
      const row = makeRow({ total_count: 2 });
      mockRpc.mockResolvedValue({ data: [row, makeRow()], error: null });

      const result = await listCharityRequests();

      expect(result.requests).toHaveLength(2);
      const first = result.requests[0];
      expect(first.ein).toBe("123456789");
      expect(first.requestCount).toBe(3);
      expect(first.firstRequestedAt).toBe("2026-01-01T00:00:00Z");
      expect(first.latestRequestedAt).toBe("2026-04-01T00:00:00Z");
      expect(first.latestRequesterEmail).toBe("donor@example.com");
      expect(result.totalCount).toBe(2);
    });

    it("preserves null requester email", async () => {
      mockRpc.mockResolvedValue({
        data: [makeRow({ latest_requester_email: null })],
        error: null,
      });

      const result = await listCharityRequests();

      expect(result.requests[0].latestRequesterEmail).toBeNull();
    });
  });
});
