import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  supabase,
  setMockResult,
  resetMockState,
} from "@/test-utils/supabaseMock";
import {
  getOwnCountry,
  setOwnCountry,
  filterGiversByRegion,
} from "../giverCountryService";
import { REGION_IDS, getCountriesInRegion } from "@/utils/regions";

jest.mock("@/utils/logger", () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockRpc = supabase.rpc as unknown as jest.Mock;

describe("giverCountryService", () => {
  beforeEach(() => {
    resetMockState();
    mockRpc.mockReset();
  });

  describe("getOwnCountry", () => {
    it("returns the saved country", async () => {
      setMockResult("profiles", { data: { country: "GH" }, error: null });
      await expect(getOwnCountry("user-1")).resolves.toBe("GH");
    });

    it("returns null when no country is saved", async () => {
      setMockResult("profiles", { data: { country: null }, error: null });
      await expect(getOwnCountry("user-1")).resolves.toBeNull();
    });

    it("returns null when there is no profile row", async () => {
      setMockResult("profiles", { data: null, error: null });
      await expect(getOwnCountry("user-1")).resolves.toBeNull();
    });

    it("throws when the profile cannot be read", async () => {
      setMockResult("profiles", { data: null, error: { message: "boom" } });
      await expect(getOwnCountry("user-1")).rejects.toThrow(
        "Failed to load country",
      );
    });
  });

  describe("setOwnCountry", () => {
    it("saves a country for the user", async () => {
      setMockResult("profiles", { data: null, error: null });
      await expect(setOwnCountry("user-1", "KE")).resolves.toBeUndefined();
      expect(supabase.from).toHaveBeenCalledWith("profiles");
    });

    it("clears the country with null", async () => {
      setMockResult("profiles", { data: null, error: null });
      await expect(setOwnCountry("user-1", null)).resolves.toBeUndefined();
    });

    it("throws when the update fails", async () => {
      setMockResult("profiles", { data: null, error: { message: "boom" } });
      await expect(setOwnCountry("user-1", "KE")).rejects.toThrow(
        "Failed to save country",
      );
    });
  });

  describe("filterGiversByRegion", () => {
    it("does not narrow the list for all regions, no region or an unknown value", async () => {
      await expect(
        filterGiversByRegion(["a"], "showDonations", "all"),
      ).resolves.toBeNull();
      await expect(
        filterGiversByRegion(["a"], "showDonations", undefined),
      ).resolves.toBeNull();
      await expect(
        filterGiversByRegion(["a"], "showDonations", "atlantis"),
      ).resolves.toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("returns an empty set without calling the database when there are no givers", async () => {
      const result = await filterGiversByRegion([], "showDonations", "ssa");
      expect(result).toEqual(new Set());
      expect(mockRpc).not.toHaveBeenCalled();
    });

    it("asks for the countries in a region and returns the matching ids", async () => {
      mockRpc.mockResolvedValue({
        data: [{ id: "a" }, { id: "c" }],
        error: null,
      });

      const result = await filterGiversByRegion(
        ["a", "b", "c"],
        "showVolunteerHours",
        "ssa",
      );

      expect(result).toEqual(new Set(["a", "c"]));
      expect(mockRpc).toHaveBeenCalledWith("filter_givers_by_country", {
        p_ids: ["a", "b", "c"],
        p_field: "showVolunteerHours",
        p_countries: [...getCountriesInRegion("ssa")],
        p_invert: false,
      });
    });

    it("asks for everyone outside every listed region when the region is unspecified", async () => {
      mockRpc.mockResolvedValue({ data: [{ id: "b" }], error: null });

      const result = await filterGiversByRegion(
        ["a", "b"],
        "showDonations",
        "unspecified",
      );

      expect(result).toEqual(new Set(["b"]));
      const args = mockRpc.mock.calls[0][1] as {
        p_countries: string[];
        p_invert: boolean;
      };
      expect(args.p_invert).toBe(true);
      expect(args.p_countries).toHaveLength(
        REGION_IDS.flatMap((id) => getCountriesInRegion(id)).length,
      );
    });

    it("treats a null result as no matches", async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      await expect(
        filterGiversByRegion(["a"], "showDonations", "na"),
      ).resolves.toEqual(new Set());
    });

    it("throws instead of returning an unfiltered list when the lookup fails", async () => {
      mockRpc.mockResolvedValue({ data: null, error: { message: "boom" } });
      await expect(
        filterGiversByRegion(["a"], "showDonations", "na"),
      ).rejects.toThrow("Failed to filter by region");
    });
  });
});
