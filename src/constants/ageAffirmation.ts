/**
 * Shared age-affirmation copy approved in GIV-435.
 * All surfaces (signup, donation, volunteer) import from here so
 * the legal wording stays in one authoritative place.
 */
export const AGE_AFFIRMATION_COPY = Object.freeze({
  /** Checkbox label / positive-path affirmation. */
  positive: "I confirm I am 16 years of age or older.",

  /** Rejection / negative-path message shown when affirmation is declined. */
  negative:
    "Give Protocol is available to users who are 16 years of age or older. If you are under 16, we are unable to process your request at this time.",

  /** Minimum age threshold used by the gate. */
  minimumAge: 16,

  /** Consent version tag persisted alongside the affirmation. */
  consentVersion: "age-gate-v1",
});
