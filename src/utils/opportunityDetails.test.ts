import { describe, it, expect } from "@jest/globals";
import {
  parseOptionalInt,
  validateOpportunityDetails,
} from "./opportunityDetails";

const valid = {
  volunteersNeeded: "",
  minimumAge: "",
  startDate: "",
  endDate: "",
};

describe("parseOptionalInt", () => {
  it("returns null for empty input", () => {
    expect(parseOptionalInt("")).toBeNull();
    expect(parseOptionalInt("  ")).toBeNull();
  });

  it("parses integers and flags non-numbers as NaN", () => {
    expect(parseOptionalInt("12")).toBe(12);
    expect(Number.isNaN(parseOptionalInt("abc"))).toBe(true);
  });
});

describe("validateOpportunityDetails", () => {
  it("accepts empty and valid values", () => {
    expect(validateOpportunityDetails(valid)).toEqual({});
    expect(
      validateOpportunityDetails({
        volunteersNeeded: "3",
        minimumAge: "18",
        startDate: "2026-11-01",
        endDate: "2026-11-01",
      }),
    ).toEqual({});
  });

  it("rejects non-positive or non-numeric volunteers needed", () => {
    expect(
      validateOpportunityDetails({ ...valid, volunteersNeeded: "0" }),
    ).toEqual({ volunteersNeeded: true });
    expect(
      validateOpportunityDetails({ ...valid, volunteersNeeded: "x" }),
    ).toEqual({ volunteersNeeded: true });
  });

  it("rejects ages outside 0-120", () => {
    expect(validateOpportunityDetails({ ...valid, minimumAge: "-1" })).toEqual({
      minimumAge: true,
    });
    expect(validateOpportunityDetails({ ...valid, minimumAge: "121" })).toEqual(
      { minimumAge: true },
    );
    expect(validateOpportunityDetails({ ...valid, minimumAge: "0" })).toEqual(
      {},
    );
  });

  it("rejects an end date before the start date", () => {
    expect(
      validateOpportunityDetails({
        ...valid,
        startDate: "2026-11-02",
        endDate: "2026-11-01",
      }),
    ).toEqual({ endDate: true });
  });

  it("allows an end date without a start date", () => {
    expect(
      validateOpportunityDetails({ ...valid, endDate: "2026-11-01" }),
    ).toEqual({});
  });
});
