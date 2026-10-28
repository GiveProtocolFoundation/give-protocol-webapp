import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  getTeosStatus,
  getOfficerVerifications,
  getLatestRefreshLog,
  getTeosVerificationSummary,
} from "./teosVerificationService";

const mockRpc = supabase.rpc as ReturnType<
  typeof import("@jest/globals").jest.fn
>;
const mockFrom = supabase.from as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

describe("teosVerificationService", () => {
  beforeEach(() => {
    mockRpc.mockReset();
    mockFrom.mockReset();
  });

  describe("getTeosStatus", () => {
    it("should return null for empty EIN without calling RPC", async () => {
      const result = await getTeosStatus("");
      expect(result).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("should call RPC with normalized EIN (hyphens stripped)", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getTeosStatus("12-3456789");

      expect(mockRpc).toHaveBeenCalledWith("get_teos_status", {
        p_ein: "123456789",
      });
    });

    it("should return mapped TeosStatus when RPC returns data", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            ein: "123456789",
            name: "Test Charity",
            pub78_status: "eligible",
            deductibility: "PC",
            revocation_date: null,
            reinstatement_date: null,
            last_checked_at: "2026-10-27T03:00:00Z",
            is_in_pub78: true,
            is_revoked: false,
            is_reinstated: false,
          },
        ],
        error: null,
      });

      const result = await getTeosStatus("123456789");

      expect(result).toEqual({
        ein: "123456789",
        name: "Test Charity",
        pub78Status: "eligible",
        deductibility: "PC",
        revocationDate: null,
        reinstatementDate: null,
        lastCheckedAt: "2026-10-27T03:00:00Z",
        isInPub78: true,
        isRevoked: false,
        isReinstated: false,
      });
    });

    it("should handle revoked status", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            ein: "987654321",
            name: "Revoked Org",
            pub78_status: "revoked",
            deductibility: null,
            revocation_date: "2025-06-15",
            reinstatement_date: null,
            last_checked_at: "2026-10-27T03:00:00Z",
            is_in_pub78: false,
            is_revoked: true,
            is_reinstated: false,
          },
        ],
        error: null,
      });

      const result = await getTeosStatus("987654321");

      expect(result).toEqual({
        ein: "987654321",
        name: "Revoked Org",
        pub78Status: "revoked",
        deductibility: null,
        revocationDate: "2025-06-15",
        reinstatementDate: null,
        lastCheckedAt: "2026-10-27T03:00:00Z",
        isInPub78: false,
        isRevoked: true,
        isReinstated: false,
      });
    });

    it("should return null when RPC returns empty array", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });
      const result = await getTeosStatus("000000000");
      expect(result).toBeNull();
    });

    it("should return null when RPC returns null data", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      const result = await getTeosStatus("000000000");
      expect(result).toBeNull();
    });

    it("should return null on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Permission denied" },
      });
      const result = await getTeosStatus("123456789");
      expect(result).toBeNull();
    });

    it("should return null when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));
      const result = await getTeosStatus("123456789");
      expect(result).toBeNull();
    });

    it("should default pub78Status to not_found when null", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            ein: "111111111",
            name: "Unknown Org",
            pub78_status: null,
            deductibility: null,
            revocation_date: null,
            reinstatement_date: null,
            last_checked_at: null,
            is_in_pub78: false,
            is_revoked: false,
            is_reinstated: false,
          },
        ],
        error: null,
      });

      const result = await getTeosStatus("111111111");
      expect(result?.pub78Status).toBe("not_found");
    });
  });

  describe("getOfficerVerifications", () => {
    it("should return empty array for empty EIN without calling RPC", async () => {
      const result = await getOfficerVerifications("");
      expect(result).toEqual([]);
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("should call RPC with normalized EIN", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      await getOfficerVerifications("12-3456789");

      expect(mockRpc).toHaveBeenCalledWith(
        "get_charity_officer_verification",
        { p_ein: "123456789" },
      );
    });

    it("should return mapped officer verifications", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            rep_id: "rep-uuid-1",
            rep_name: "Jane Doe",
            rep_title: "Executive Director",
            check_result: "verified",
            last_checked_at: "2026-10-27T03:00:00Z",
            verified_at: "2026-10-27T03:00:00Z",
            is_active: true,
          },
        ],
        error: null,
      });

      const result = await getOfficerVerifications("123456789");

      expect(result).toEqual([
        {
          repId: "rep-uuid-1",
          repName: "Jane Doe",
          repTitle: "Executive Director",
          checkResult: "verified",
          lastCheckedAt: "2026-10-27T03:00:00Z",
          verifiedAt: "2026-10-27T03:00:00Z",
          isActive: true,
        },
      ]);
    });

    it("should return empty array on RPC error", async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: "Query failed" },
      });

      const result = await getOfficerVerifications("123456789");
      expect(result).toEqual([]);
    });

    it("should return empty array when RPC throws", async () => {
      mockRpc.mockRejectedValue(new Error("Network error"));
      const result = await getOfficerVerifications("123456789");
      expect(result).toEqual([]);
    });

    it("should default checkResult to pending when null", async () => {
      mockRpc.mockResolvedValue({
        data: [
          {
            rep_id: "rep-uuid-2",
            rep_name: "John Smith",
            rep_title: null,
            check_result: null,
            last_checked_at: null,
            verified_at: null,
            is_active: true,
          },
        ],
        error: null,
      });

      const result = await getOfficerVerifications("123456789");
      expect(result[0].checkResult).toBe("pending");
    });
  });

  describe("getLatestRefreshLog", () => {
    it("should return null on error", async () => {
      // Mock the from chain to return an error
      const mockChain = {
        select: () => mockChain,
        order: () => mockChain,
        limit: () => mockChain,
        single: () =>
          Promise.resolve({ data: null, error: { message: "Table not found" } }),
      };
      mockFrom.mockReturnValue(mockChain);

      const result = await getLatestRefreshLog();
      expect(result).toBeNull();
    });
  });

  describe("getTeosVerificationSummary", () => {
    it("should return summary with all null/empty when no data", async () => {
      mockRpc.mockResolvedValue({ data: [], error: null });

      // Mock from for getLatestRefreshLog
      const mockChain = {
        select: () => mockChain,
        order: () => mockChain,
        limit: () => mockChain,
        single: () => Promise.resolve({ data: null, error: null }),
      };
      mockFrom.mockReturnValue(mockChain);

      const result = await getTeosVerificationSummary("123456789");

      expect(result).toEqual({
        teosStatus: null,
        officerVerifications: [],
        lastRefresh: null,
      });
    });
  });
});
