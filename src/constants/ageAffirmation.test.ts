import { AGE_AFFIRMATION_COPY } from "./ageAffirmation";

describe("AGE_AFFIRMATION_COPY", () => {
  it("should export the approved positive-path copy", () => {
    expect(AGE_AFFIRMATION_COPY.positive).toBe(
      "I confirm I am 16 years of age or older.",
    );
  });

  it("should export the approved negative-path copy", () => {
    expect(AGE_AFFIRMATION_COPY.negative).toBe(
      "Give Protocol is available to users who are 16 years of age or older. If you are under 16, we are unable to process your request at this time.",
    );
  });

  it("should set minimumAge to 16", () => {
    expect(AGE_AFFIRMATION_COPY.minimumAge).toBe(16);
  });

  it("should export a consent version tag", () => {
    expect(AGE_AFFIRMATION_COPY.consentVersion).toBe("age-gate-v1");
  });

  it("should be frozen (const assertion)", () => {
    expect(() => {
      (AGE_AFFIRMATION_COPY as Record<string, unknown>).positive = "changed";
    }).toThrow();
  });
});
