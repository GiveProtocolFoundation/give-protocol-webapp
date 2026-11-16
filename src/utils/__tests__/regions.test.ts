import {
  REGION_IDS,
  getCountriesInRegion,
  getRegionForCountry,
  isRegionId,
} from "../regions";

describe("regions", () => {
  describe("getRegionForCountry", () => {
    it.each([
      ["US", "na"],
      ["CA", "na"],
      ["MX", "lac"],
      ["JM", "lac"],
      ["GB", "eca"],
      ["TR", "eca"],
      ["GH", "ssa"],
      ["CD", "ssa"],
      ["EG", "mena"],
      ["IN", "sa"],
      ["JP", "eap"],
      ["AU", "eap"],
    ])("maps %s to %s", (code, region) => {
      expect(getRegionForCountry(code)).toBe(region);
    });

    it("ignores letter case and surrounding whitespace", () => {
      expect(getRegionForCountry(" gh ")).toBe("ssa");
    });

    it("reports a missing country as unspecified", () => {
      expect(getRegionForCountry(null)).toBe("unspecified");
      expect(getRegionForCountry(undefined)).toBe("unspecified");
      expect(getRegionForCountry("")).toBe("unspecified");
    });

    it("reports a country UNICEF does not list as unspecified", () => {
      expect(getRegionForCountry("PR")).toBe("unspecified");
      expect(getRegionForCountry("HK")).toBe("unspecified");
      expect(getRegionForCountry("ZZ")).toBe("unspecified");
    });
  });

  describe("getCountriesInRegion", () => {
    it("lists 202 distinct countries across the seven regions", () => {
      const all = REGION_IDS.flatMap((region) => getCountriesInRegion(region));
      expect(all).toHaveLength(202);
      expect(new Set(all).size).toBe(202);
    });

    it("lists only real ISO 3166-1 alpha-2 codes", () => {
      const names = new Intl.DisplayNames(["en"], { type: "region" });
      const all = REGION_IDS.flatMap((region) => getCountriesInRegion(region));
      all.forEach((code) => {
        expect(code).toMatch(/^[A-Z]{2}$/);
        expect(names.of(code)).not.toBe(code);
      });
    });

    it("agrees with getRegionForCountry for every listed country", () => {
      REGION_IDS.forEach((region) => {
        getCountriesInRegion(region).forEach((code) => {
          expect(getRegionForCountry(code)).toBe(region);
        });
      });
    });
  });

  describe("isRegionId", () => {
    it("accepts the seven region ids", () => {
      REGION_IDS.forEach((region) => {
        expect(isRegionId(region)).toBe(true);
      });
    });

    it("rejects unspecified, the old values and arbitrary text", () => {
      expect(isRegionId("unspecified")).toBe(false);
      expect(isRegionId("all")).toBe(false);
      expect(isRegionId("africa")).toBe(false);
      expect(isRegionId("")).toBe(false);
    });
  });
});
