import { ART9_DONATION_CONSENT } from "./donationConsent";

describe("ART9_DONATION_CONSENT", () => {
  it("should export the approved version tag", () => {
    expect(ART9_DONATION_CONSENT.version).toBe("art9-donation-v1");
  });

  it("should export the v1 consent statement with {{charity}} placeholder", () => {
    expect(ART9_DONATION_CONSENT.statement).toContain("{{charity}}");
    expect(ART9_DONATION_CONSENT.statement).toContain(
      "I explicitly consent to Give Protocol processing this record",
    );
  });

  it("should be frozen (immutable)", () => {
    expect(() => {
      (ART9_DONATION_CONSENT as Record<string, unknown>).version = "changed";
    }).toThrow();
  });
});
