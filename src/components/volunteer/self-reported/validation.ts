import {
  SelfReportedHoursInput,
  MIN_HOURS_PER_RECORD,
  MAX_HOURS_PER_RECORD,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/types/selfReportedHours";

type OrgMode = "verified" | "other";

/** Field-level validation errors for the self-reported hours form. */
export interface ValidationErrors {
  activityDate?: string;
  hours?: string;
  description?: string;
  organization?: string;
  organizationName?: string;
}

/**
 * Validates activity date
 * @param date - The activity date string
 * @returns Error message or undefined
 */
function validateActivityDate(date: string): string | undefined {
  if (!date) {
    return "Activity date is required";
  }
  if (new Date(date) > new Date()) {
    return "Date cannot be in the future";
  }
  return undefined;
}

/**
 * Validates hours
 * @param hours - Number of hours
 * @returns Error message or undefined
 */
function validateHours(hours: number): string | undefined {
  if (hours < MIN_HOURS_PER_RECORD || hours > MAX_HOURS_PER_RECORD) {
    return `Hours must be between ${MIN_HOURS_PER_RECORD} and ${MAX_HOURS_PER_RECORD}`;
  }
  return undefined;
}

/**
 * Validates description
 * @param description - The description text
 * @returns Error message or undefined
 */
function validateDescription(
  description: string | undefined,
): string | undefined {
  if (!description || description.length < MIN_DESCRIPTION_LENGTH) {
    return `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`;
  }
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`;
  }
  return undefined;
}

/**
 * Validates organization selection
 * @param formData - The form data
 * @param orgMode - The organization mode
 * @returns Error message or undefined
 */
function validateOrganization(
  formData: SelfReportedHoursInput,
  orgMode: OrgMode,
): { organization?: string; organizationName?: string } {
  const errors: { organization?: string; organizationName?: string } = {};

  if (orgMode === "verified" && !formData.charityOrgId) {
    errors.organization = "Please select an organization from the registry";
  }

  if (orgMode === "other" && !formData.organizationName?.trim()) {
    errors.organizationName = "Organization name is required";
  }

  return errors;
}

/**
 * Validates self-reported hours form data
 * @param formData - The form data to validate
 * @param orgMode - The organization mode (verified or other)
 * @returns Validation errors object (empty if valid)
 */
export function validateSelfReportedHoursForm(
  formData: SelfReportedHoursInput,
  orgMode: OrgMode,
): ValidationErrors {
  const errors: ValidationErrors = {};

  const dateError = validateActivityDate(formData.activityDate);
  if (dateError) errors.activityDate = dateError;

  const hoursError = validateHours(formData.hours);
  if (hoursError) errors.hours = hoursError;

  const descriptionError = validateDescription(formData.description);
  if (descriptionError) errors.description = descriptionError;

  const orgErrors = validateOrganization(formData, orgMode);
  Object.assign(errors, orgErrors);

  return errors;
}

/**
 * Checks if validation errors object has any errors
 * @param errors - The validation errors object
 * @returns True if no errors
 */
export function isFormValid(errors: ValidationErrors): boolean {
  return Object.keys(errors).length === 0;
}
