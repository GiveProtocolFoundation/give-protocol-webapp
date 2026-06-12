/**
 * Shared copy for the age-affirmation gate (GIV-435 approved text).
 * Import this constant on every surface that shows the age affirmation
 * checkbox or decline message so that copy stays consistent site-wide.
 */
export const AGE_AFFIRMATION_COPY = {
  /** Checkbox label — positive path */
  positive: "I confirm I am 16 years of age or older.",
  /** Message shown on decline / failure */
  negative:
    "Give Protocol is available to users who are 16 years of age or older. If you are under 16, we are unable to process your request at this time.",
} as const;
