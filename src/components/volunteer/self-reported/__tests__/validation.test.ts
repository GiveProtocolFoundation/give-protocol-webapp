import { describe, it, expect } from "@jest/globals";
import {
  validateSelfReportedHoursForm,
  isFormValid,
} from "../validation";
import type { ValidationErrors } from "../validation";
import {
  ActivityType,
  MIN_HOURS_PER_RECORD,
  MAX_HOURS_PER_RECORD,
  MIN_DESCRIPTION_LENGTH,
  MAX_DESCRIPTION_LENGTH,
} from "@/types/selfReportedHours";
import type { SelfReportedHoursInput } from "@/types/selfReportedHours";

/** Builds a valid form input, optionally overriding specific fields. */
const makeValidInput = (
  overrides: Partial<SelfReportedHoursInput> = {},
): SelfReportedHoursInput => ({
  activityDate: "2025-01-15",
  hours: 4,
  activityType: ActivityType.DIRECT_SERVICE,
  description: "A".repeat(MIN_DESCRIPTION_LENGTH),
  organizationName: "Test Organization",
  ...overrides,
});

describe("validateSelfReportedHoursForm", () => {
  describe("activityDate validation", () => {
    it("returns error when date is empty", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ activityDate: "" }),
        "other",
      );
      expect(errors.activityDate).toBe("Activity date is required");
    });

    it("returns error when date is in the future", () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);
      const futureDateStr = futureDate.toISOString().split("T")[0];

      const errors = validateSelfReportedHoursForm(
        makeValidInput({ activityDate: futureDateStr }),
        "other",
      );
      expect(errors.activityDate).toBe("Date cannot be in the future");
    });

    it("returns no error for a valid past date", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ activityDate: "2025-01-15" }),
        "other",
      );
      expect(errors.activityDate).toBeUndefined();
    });
  });

  describe("hours validation", () => {
    it("returns error when hours are below minimum", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ hours: MIN_HOURS_PER_RECORD - 0.1 }),
        "other",
      );
      expect(errors.hours).toBe(
        `Hours must be between ${MIN_HOURS_PER_RECORD} and ${MAX_HOURS_PER_RECORD}`,
      );
    });

    it("returns error when hours exceed maximum", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ hours: MAX_HOURS_PER_RECORD + 1 }),
        "other",
      );
      expect(errors.hours).toBe(
        `Hours must be between ${MIN_HOURS_PER_RECORD} and ${MAX_HOURS_PER_RECORD}`,
      );
    });

    it("returns no error for hours at minimum boundary", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ hours: MIN_HOURS_PER_RECORD }),
        "other",
      );
      expect(errors.hours).toBeUndefined();
    });

    it("returns no error for hours at maximum boundary", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ hours: MAX_HOURS_PER_RECORD }),
        "other",
      );
      expect(errors.hours).toBeUndefined();
    });

    it("returns no error for a typical hour value", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ hours: 8 }),
        "other",
      );
      expect(errors.hours).toBeUndefined();
    });
  });

  describe("description validation", () => {
    it("returns error when description is empty", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ description: "" }),
        "other",
      );
      expect(errors.description).toBe(
        `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
      );
    });

    it("returns error when description is too short", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ description: "Short" }),
        "other",
      );
      expect(errors.description).toBe(
        `Description must be at least ${MIN_DESCRIPTION_LENGTH} characters`,
      );
    });

    it("returns error when description exceeds max length", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ description: "A".repeat(MAX_DESCRIPTION_LENGTH + 1) }),
        "other",
      );
      expect(errors.description).toBe(
        `Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`,
      );
    });

    it("returns no error for description at minimum length", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ description: "A".repeat(MIN_DESCRIPTION_LENGTH) }),
        "other",
      );
      expect(errors.description).toBeUndefined();
    });

    it("returns no error for description at maximum length", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ description: "A".repeat(MAX_DESCRIPTION_LENGTH) }),
        "other",
      );
      expect(errors.description).toBeUndefined();
    });
  });

  describe("organization validation (verified mode)", () => {
    it("returns error when no org is selected in verified mode", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({
          charityOrgId: undefined,
          organizationName: undefined,
        }),
        "verified",
      );
      expect(errors.organization).toBe(
        "Please select an organization from the registry",
      );
    });

    it("returns no error when charityOrgId is provided in verified mode", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ charityOrgId: "org-123" }),
        "verified",
      );
      expect(errors.organization).toBeUndefined();
    });

    it("returns no error when only organizationName is set in verified mode (GIV-959)", () => {
      // The live search RPC may omit `id` (schema drift), leaving the
      // selection recorded only by name — a completed selection must still
      // pass client-side validation.
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ charityOrgId: undefined }),
        "verified",
      );
      expect(errors.organization).toBeUndefined();
    });
  });

  describe("organization validation (other mode)", () => {
    it("returns error when organizationName is empty in other mode", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ organizationName: "" }),
        "other",
      );
      expect(errors.organizationName).toBe("Organization name is required");
    });

    it("returns error when organizationName is whitespace only in other mode", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ organizationName: "   " }),
        "other",
      );
      expect(errors.organizationName).toBe("Organization name is required");
    });

    it("returns no error when organizationName is provided in other mode", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ organizationName: "Local Charity" }),
        "other",
      );
      expect(errors.organizationName).toBeUndefined();
    });
  });

  describe("full form validation", () => {
    it("returns empty errors for fully valid form in other mode", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput(),
        "other",
      );
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it("returns empty errors for fully valid form in verified mode", () => {
      const errors = validateSelfReportedHoursForm(
        makeValidInput({ charityOrgId: "org-123" }),
        "verified",
      );
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it("returns multiple errors for invalid form", () => {
      const errors = validateSelfReportedHoursForm(
        {
          activityDate: "",
          hours: 0,
          activityType: ActivityType.DIRECT_SERVICE,
          description: "",
          organizationName: "",
        },
        "other",
      );
      expect(errors.activityDate).toBeDefined();
      expect(errors.hours).toBeDefined();
      expect(errors.description).toBeDefined();
      expect(errors.organizationName).toBeDefined();
    });
  });
});

describe("isFormValid", () => {
  it("returns true when errors object is empty", () => {
    const errors: ValidationErrors = {};
    expect(isFormValid(errors)).toBe(true);
  });

  it("returns false when errors object has entries", () => {
    const errors: ValidationErrors = { activityDate: "Required" };
    expect(isFormValid(errors)).toBe(false);
  });

  it("returns false when multiple errors exist", () => {
    const errors: ValidationErrors = {
      activityDate: "Required",
      hours: "Invalid",
      description: "Too short",
    };
    expect(isFormValid(errors)).toBe(false);
  });
});
