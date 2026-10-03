import { getRegistryInfo } from "./registryVerification";

describe("getRegistryInfo", () => {
  it("recognises the IRS Business Master File", () => {
    expect(getRegistryInfo("IRS_BMF")).toEqual({
      shortName: "IRS",
      idIsTaxId: true,
    });
  });

  it("normalises case, spaces and hyphens when matching", () => {
    expect(getRegistryInfo("irs bmf")?.shortName).toBe("IRS");
    expect(getRegistryInfo(" irs-bmf ")?.shortName).toBe("IRS");
  });

  it("labels unknown registries with their own name, never as the IRS", () => {
    expect(getRegistryInfo("CRA_LISTED")).toEqual({ shortName: "CRA LISTED" });
  });

  it("strips angle brackets and bounds the length of unknown names", () => {
    const info = getRegistryInfo("<b>X</b>_REGISTRY_WITH_A_VERY_LONG_NAME");
    expect(info?.shortName).not.toMatch(/[<>]/);
    expect(info?.shortName.length).toBeLessThanOrEqual(24);
  });

  it("returns null when there is no source", () => {
    expect(getRegistryInfo(null)).toBeNull();
    expect(getRegistryInfo(undefined)).toBeNull();
    expect(getRegistryInfo("   ")).toBeNull();
    expect(getRegistryInfo("<>")).toBeNull();
  });
});
