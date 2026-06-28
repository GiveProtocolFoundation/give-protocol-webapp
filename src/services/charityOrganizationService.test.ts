import { describe, it, expect, beforeEach } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import { searchCharityOrganizations } from "./charityOrganizationService";

describe("charityOrganizationService", () => {
  beforeEach(() => {
    (
      supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
    ).mockReset();
  });

  describe("searchCharityOrganizations", () => {
    it("should return empty result when query is too short and no state filter", async () => {
      const result = await searchCharityOrganizations({
        search_query: "a",
        filter_state: null,
        filter_ntee: null,
        filter_country: null,
        result_limit: 20,
        result_offset: 0,
      });

      expect(result).toEqual({ organizations: [], hasMore: false });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("should return empty result when query is empty and no state filter", async () => {
      const result = await searchCharityOrganizations({
        search_query: "",
        filter_state: null,
        filter_ntee: null,
        filter_country: null,
        result_limit: 20,
        result_offset: 0,
      });

      expect(result).toEqual({ organizations: [], hasMore: false });
      expect(supabase.rpc).not.toHaveBeenCalled();
    });

    it("should call RPC with correct params, passing null for empty filters", async () => {
      const mockData = [
        {
          ein: "12-3456789",
          name: "Test Charity",
          city: "New York",
          state: "NY",
          zip: "10001",
          ntee_cd: "B20",
          deductibility: "1",
          is_on_platform: false,
          platform_charity_id: null,
          rank: 1,
          country: "US",
          registry_source: "IRS_BMF",
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await searchCharityOrganizations({
        search_query: "test",
        filter_state: "",
        filter_ntee: "",
        filter_country: "",
        result_limit: 20,
        result_offset: 0,
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "search_charity_organizations",
        {
          search_query: "test",
          filter_state: null,
          filter_ntee: null,
          filter_country: null,
          result_limit: 21,
          result_offset: 0,
        },
      );
      expect(result.organizations).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });

    it("should search by state filter alone without a query", async () => {
      const mockData = [
        {
          ein: "98-7654321",
          name: "State Charity",
          city: "Austin",
          state: "TX",
          zip: "73301",
          ntee_cd: null,
          deductibility: "1",
          is_on_platform: true,
          platform_charity_id: "abc",
          rank: 1,
          country: "US",
          registry_source: "IRS_BMF",
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await searchCharityOrganizations({
        search_query: "",
        filter_state: "TX",
        filter_ntee: null,
        filter_country: null,
        result_limit: 20,
        result_offset: 0,
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "search_charity_organizations",
        {
          search_query: null,
          filter_state: "TX",
          filter_ntee: null,
          filter_country: null,
          result_limit: 21,
          result_offset: 0,
        },
      );
      expect(result.organizations).toHaveLength(1);
    });

    it("should search by country filter alone without a query", async () => {
      const mockData = [
        {
          ein: "RFC123456789",
          name: "Cruz Roja Mexicana",
          city: "Ciudad de México",
          state: "CMX",
          zip: "06600",
          ntee_cd: "P20",
          deductibility: "1",
          is_on_platform: false,
          platform_charity_id: null,
          rank: 1,
          country: "MX",
          registry_source: "SAT_DONATARIAS",
        },
      ];
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await searchCharityOrganizations({
        search_query: "",
        filter_state: null,
        filter_ntee: null,
        filter_country: "MX",
        result_limit: 20,
        result_offset: 0,
      });

      expect(supabase.rpc).toHaveBeenCalledWith(
        "search_charity_organizations",
        {
          search_query: null,
          filter_state: null,
          filter_ntee: null,
          filter_country: "MX",
          result_limit: 21,
          result_offset: 0,
        },
      );
      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].country).toBe("MX");
    });

    it("should return empty result when only country filter set but no matching orgs", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await searchCharityOrganizations({
        search_query: null,
        filter_state: null,
        filter_ntee: null,
        filter_country: "MX",
        result_limit: 20,
        result_offset: 0,
      });

      expect(result).toEqual({ organizations: [], hasMore: false });
    });

    it("should set hasMore to true when more rows than limit are returned", async () => {
      const mockData = Array.from({ length: 21 }, (_, i) => ({
        ein: `00-000000${i}`,
        name: `Charity ${i}`,
        city: null,
        state: "CA",
        zip: null,
        ntee_cd: null,
        deductibility: null,
        is_on_platform: false,
        platform_charity_id: null,
        rank: i,
        country: "US",
        registry_source: "IRS_BMF",
      }));
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: mockData,
        error: null,
      });

      const result = await searchCharityOrganizations({
        search_query: "charity",
        filter_state: null,
        filter_ntee: null,
        filter_country: null,
        result_limit: 20,
        result_offset: 0,
      });

      expect(result.hasMore).toBe(true);
      expect(result.organizations).toHaveLength(20);
    });

    it("should throw on RPC error so the caller can surface it to the user", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: { message: "RPC failed" },
      });

      await expect(
        searchCharityOrganizations({
          search_query: "test",
          filter_state: null,
          filter_ntee: null,
          filter_country: null,
          result_limit: 20,
          result_offset: 0,
        }),
      ).rejects.toThrow("RPC failed");
    });

    it("should propagate network errors to the caller", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockRejectedValue(new Error("Network error"));

      await expect(
        searchCharityOrganizations({
          search_query: "test",
          filter_state: null,
          filter_ntee: null,
          filter_country: null,
          result_limit: 20,
          result_offset: 0,
        }),
      ).rejects.toThrow("Network error");
    });

    it("should handle null data gracefully", async () => {
      (
        supabase.rpc as ReturnType<typeof import("@jest/globals").jest.fn>
      ).mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await searchCharityOrganizations({
        search_query: "test",
        filter_state: null,
        filter_ntee: null,
        filter_country: null,
        result_limit: 20,
        result_offset: 0,
      });

      expect(result).toEqual({ organizations: [], hasMore: false });
    });
  });
});
