import { matchesQuery } from "./matchesQuery";

describe("matchesQuery", () => {
  it("matches everything for a blank query", () => {
    expect(matchesQuery("  ", ["anything"])).toBe(true);
  });

  it("matches case-insensitively across fields and ignores undefined", () => {
    expect(matchesQuery("WATER", ["Clean water", undefined])).toBe(true);
    expect(matchesQuery("water", [undefined, "Education"])).toBe(false);
  });
});
