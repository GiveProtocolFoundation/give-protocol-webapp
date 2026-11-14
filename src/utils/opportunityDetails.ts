/** Raw string values of the optional opportunity detail inputs. */
export interface OpportunityDetailInput {
  volunteersNeeded: string;
  minimumAge: string;
  startDate: string;
  endDate: string;
}

/** Error codes for invalid detail inputs, keyed by form field name. */
export type OpportunityDetailErrors = Partial<
  Record<"volunteersNeeded" | "minimumAge" | "endDate", true>
>;

/**
 * Parses an optional integer field.
 * @param value - Raw input string, possibly empty
 * @returns The integer, null when empty, or NaN when not a number
 */
export function parseOptionalInt(value: string): number | null {
  if (value.trim() === "") return null;
  return Number.parseInt(value, 10);
}

/**
 * Validates the optional detail inputs of the create-opportunity form.
 * @param input - Raw detail input values
 * @returns Fields that failed validation (empty when all are valid)
 */
export function validateOpportunityDetails(
  input: OpportunityDetailInput,
): OpportunityDetailErrors {
  const errors: OpportunityDetailErrors = {};

  const volunteers = parseOptionalInt(input.volunteersNeeded);
  if (volunteers !== null && (Number.isNaN(volunteers) || volunteers < 1)) {
    errors.volunteersNeeded = true;
  }

  const age = parseOptionalInt(input.minimumAge);
  if (age !== null && (Number.isNaN(age) || age < 0 || age > 120)) {
    errors.minimumAge = true;
  }

  if (
    input.startDate !== "" &&
    input.endDate !== "" &&
    input.endDate < input.startDate
  ) {
    errors.endDate = true;
  }

  return errors;
}
