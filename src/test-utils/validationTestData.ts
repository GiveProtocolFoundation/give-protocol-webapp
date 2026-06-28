// Test data for input validation tests
/* eslint-disable no-unused-vars */
import { expect } from "@jest/globals";

// Types for validation test cases
type ValidationTestCase = {
  value: string | number;
  reason?: string;
};

type SanitizationTestCase = {
  input: string;
  expected: string;
};

type ValidatorFunction = (input: string | number) => boolean;

/**
 * Test cases for input validation functions
 */
export const validationTestCases = {
  email: {
    valid: [
      "test@example.com",
      "user.name+tag@domain.co.uk",
      "user123@test-domain.org",
    ],
    invalid: [
      "",
      "invalid",
      "test@",
      "@example.com",
      "test@.com",
      "test@example",
    ],
  },
  password: {
    valid: ["Password123!", "SecurePass1@", "MyP@ssw0rd"],
    invalid: [
      { value: "", reason: "empty" },
      { value: "password", reason: "no uppercase, no number, no special" },
      { value: "PASSWORD", reason: "no lowercase, no number, no special" },
      { value: "Password", reason: "no number, no special" },
      { value: "Password1", reason: "no special character" },
      { value: "Pass1!", reason: "too short" },
      { value: "password123!", reason: "no uppercase" },
    ],
  },
  url: {
    valid: [
      "https://example.com",
      "https://www.example.com",
      "https://example.com/path",
      "https://subdomain.example.com/path/to/page",
      "https://api.example.co.uk/v1/endpoint",
    ],
    invalid: [
      { value: "", reason: "empty" },
      { value: "http://example.com", reason: "not HTTPS" },
      { value: "https://", reason: "incomplete" },
      { value: "https://example", reason: "no TLD" },
      { value: "example.com", reason: "no protocol" },
      { value: "ftp://example.com", reason: "wrong protocol" },
    ],
  },
  amount: {
    valid: [
      10,
      100.5,
      0.01,
      999999.99,
      1000000, // max amount
    ],
    invalid: [
      { value: 0, reason: "zero" },
      { value: -10, reason: "negative" },
      { value: 1000001, reason: "too large" },
      { value: 10.123, reason: "more than 2 decimal places" },
      { value: Infinity, reason: "infinity" },
      { value: -Infinity, reason: "negative infinity" },
      { value: Number.NaN, reason: "NaN" },
    ],
    decimalPrecision: {
      valid: [0.99, 1.0],
      invalid: [
        { value: 10.999, reason: "3 decimal places" },
        { value: 0.001, reason: "3 decimal places" },
      ],
    },
  },
  sanitization: {
    htmlRemoval: [
      {
        input: '<script>alert("test")</script>',
        expected: "scriptalert(test)/script",
      },
      { input: "<div>content</div>", expected: "divcontent/div" },
    ] as SanitizationTestCase[],
    quoteRemoval: [
      {
        input: "text with \"quotes\" and 'single quotes'",
        expected: "text with quotes and single quotes",
      },
    ] as SanitizationTestCase[],
    whitespaceHandling: [
      { input: "  test  ", expected: "test" },
      { input: "\n\ttest\n\t", expected: "test" },
      { input: "", expected: "" },
      { input: "   ", expected: "" },
      { input: "\n\t", expected: "" },
    ] as SanitizationTestCase[],
    safeContent: [
      { input: "normal text", expected: "normal text" },
      { input: "text with numbers 123", expected: "text with numbers 123" },
      {
        input: "text-with-dashes_and_underscores",
        expected: "text-with-dashes_and_underscores",
      },
    ] as SanitizationTestCase[],
  },
};

// Helper functions to reduce test duplication
/**
 * Helper function to test valid validation cases
 * @param validator - The validation function to test
 * @param cases - Array of test cases (strings, numbers, or objects with value property)
 */
export const testValidCases = (
  validator: ValidatorFunction,
  cases: (string | number | ValidationTestCase)[],
) => {
  if (!cases || !Array.isArray(cases)) {
    throw new Error("Test cases must be a valid array");
  }
  cases.forEach((testCase) => {
    const value =
      typeof testCase === "object" && testCase !== null
        ? testCase.value
        : testCase;
    expect(validator(value)).toBe(true);
  });
};

/**
 * Helper function to test invalid validation cases
 * @param validator - The validation function to test
 * @param cases - Array of test cases (strings, numbers, or objects with value property)
 */
export const testInvalidCases = (
  validator: ValidatorFunction,
  cases: (string | number | ValidationTestCase)[],
) => {
  if (!cases || !Array.isArray(cases)) {
    throw new Error("Test cases must be a valid array");
  }
  cases.forEach((testCase) => {
    const value =
      typeof testCase === "object" && testCase !== null
        ? testCase.value
        : testCase;
    expect(validator(value)).toBe(false);
  });
};

/** Valid email samples kept for backward compatibility with older test files. */
// Legacy exports for backward compatibility
export const validEmailCases = validationTestCases.email.valid;
/** Invalid email samples kept for backward compatibility, flattened to plain string values. */
export const invalidEmailCases = validationTestCases.email.invalid.map(
  (item) => (typeof item === "object" ? item.value : item),
);
/** Valid password samples kept for backward compatibility with older test files. */
export const validPasswordCases = validationTestCases.password.valid;
/** Invalid password samples kept for backward compatibility, flattened to plain string values. */
export const invalidPasswordCases = validationTestCases.password.invalid.map(
  (item) => (typeof item === "object" ? item.value : item),
);
export const validNameCases = [
  "John Doe",
  "Jane Smith",
  "María González",
  "Jean-Pierre Dubois",
  "李小明",
];
export const invalidNameCases = [
  "",
  "   ",
  "A",
  "Very Very Very Very Very Long Name That Exceeds Character Limits",
  "Name123",
  "Name!@#",
];
