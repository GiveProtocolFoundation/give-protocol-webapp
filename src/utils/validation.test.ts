import {
  validateEmail,
  validatePassword,
  validateAuthInput,
  validateAmount,
  isValidAmount,
  sanitizeInput,
  validateUrl,
  validatePhoneNumber,
  validateName,
} from "./validation";

describe("validateEmail", () => {
  it("should accept valid email addresses", () => {
    expect(validateEmail("user@example.com")).toBe(true);
    expect(validateEmail("name+tag@sub.domain.org")).toBe(true);
    expect(validateEmail("user.name@example.co.uk")).toBe(true);
  });

  it("should reject emails without @", () => {
    expect(validateEmail("notanemail")).toBe(false);
    expect(validateEmail("missingatsign.com")).toBe(false);
  });

  it("should reject emails with invalid domain", () => {
    expect(validateEmail("user@")).toBe(false);
    expect(validateEmail("user@nodot")).toBe(false);
  });

  it("should reject empty string", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("should reject emails with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false);
    expect(validateEmail("user@ example.com")).toBe(false);
  });
});

describe("validatePassword", () => {
  it("should accept passwords with exactly 8 characters", () => {
    expect(validatePassword("12345678")).toBe(true);
  });

  it("should accept passwords longer than 8 characters", () => {
    expect(validatePassword("correcthorsebatterystaple")).toBe(true);
    expect(validatePassword("Str0ng!Pass#2024")).toBe(true);
  });

  it("should reject passwords shorter than 8 characters", () => {
    expect(validatePassword("")).toBe(false);
    expect(validatePassword("short")).toBe(false);
    expect(validatePassword("1234567")).toBe(false);
  });
});

describe("validateAuthInput", () => {
  it("should not throw for valid email and password", () => {
    expect(() =>
      validateAuthInput("user@example.com", "password123"),
    ).not.toThrow();
  });

  it("should throw when email is invalid", () => {
    expect(() => validateAuthInput("bademail", "password123")).toThrow(
      /valid email/i,
    );
  });

  it("should throw when password is too short", () => {
    expect(() => validateAuthInput("user@example.com", "short")).toThrow(
      /8 characters/i,
    );
  });
});

describe("sanitizeInput", () => {
  it("should remove HTML angle brackets and quotes from XSS payload", () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
      "scriptalert(xss)/script",
    );
  });

  it("should remove single quotes", () => {
    expect(sanitizeInput("O'Reilly")).toBe("OReilly");
  });

  it("should remove double quotes", () => {
    expect(sanitizeInput('"quoted"')).toBe("quoted");
  });

  it("should leave safe characters untouched", () => {
    expect(sanitizeInput("hello world 123")).toBe("hello world 123");
  });
});

describe("validateUrl", () => {
  it("should accept valid HTTPS URLs", () => {
    expect(validateUrl("https://example.com")).toBe(true);
    expect(validateUrl("https://sub.domain.org/path?q=1")).toBe(true);
  });

  it("should reject HTTP URLs", () => {
    expect(validateUrl("http://example.com")).toBe(false);
  });

  it("should reject non-URLs", () => {
    expect(validateUrl("not a url")).toBe(false);
    expect(validateUrl("")).toBe(false);
  });
});

describe("validatePhoneNumber", () => {
  it("should accept valid US phone formats", () => {
    expect(validatePhoneNumber("555-123-4567")).toBe(true);
    expect(validatePhoneNumber("(555) 123-4567")).toBe(true);
    expect(validatePhoneNumber("+15551234567")).toBe(true);
  });

  it("should reject obviously invalid phone numbers", () => {
    expect(validatePhoneNumber("abc")).toBe(false);
    expect(validatePhoneNumber("")).toBe(false);
  });
});

describe("validateName", () => {
  it("should accept names within 2-100 characters", () => {
    expect(validateName("Jo")).toBe(true);
    expect(validateName("Alice Smith")).toBe(true);
    expect(validateName("A".repeat(100))).toBe(true);
  });

  it("should reject names shorter than 2 characters", () => {
    expect(validateName("A")).toBe(false);
    expect(validateName("")).toBe(false);
    expect(validateName("  ")).toBe(false);
  });

  it("should reject names longer than 100 characters", () => {
    expect(validateName("A".repeat(101))).toBe(false);
  });
});

describe("validateAmount", () => {
  it("should accept valid amounts", () => {
    expect(validateAmount(1)).toBe(true);
    expect(validateAmount(100)).toBe(true);
    expect(validateAmount(1000)).toBe(true);
    expect(validateAmount(999999)).toBe(true);
    expect(validateAmount(1000000)).toBe(true);
  });

  it("should accept decimal amounts", () => {
    expect(validateAmount(0.01)).toBe(true);
    expect(validateAmount(123.45)).toBe(true);
    expect(validateAmount(999999.99)).toBe(true);
  });

  it("should reject zero", () => {
    expect(validateAmount(0)).toBe(false);
  });

  it("should reject negative amounts", () => {
    expect(validateAmount(-1)).toBe(false);
    expect(validateAmount(-100)).toBe(false);
  });

  it("should reject amounts above maximum", () => {
    expect(validateAmount(1000001)).toBe(false);
    expect(validateAmount(10000000)).toBe(false);
  });

  it("should reject NaN", () => {
    expect(validateAmount(Number.NaN)).toBe(false);
  });

  it("should reject Infinity", () => {
    expect(validateAmount(Infinity)).toBe(false);
    expect(validateAmount(-Infinity)).toBe(false);
  });

  it("should accept very small positive amounts", () => {
    expect(validateAmount(0.0001)).toBe(true);
    expect(validateAmount(0.000001)).toBe(true);
  });

  it("should accept amount exactly at boundary", () => {
    expect(validateAmount(1000000)).toBe(true);
    expect(validateAmount(0.000000000000000001)).toBe(true);
  });
});

describe("isValidAmount", () => {
  it("should accept valid amounts", () => {
    expect(isValidAmount(1)).toBe(true);
    expect(isValidAmount(100)).toBe(true);
    expect(isValidAmount(1000)).toBe(true);
    expect(isValidAmount(999999)).toBe(true);
    expect(isValidAmount(1000000)).toBe(true);
  });

  it("should accept decimal amounts", () => {
    expect(isValidAmount(0.01)).toBe(true);
    expect(isValidAmount(123.45)).toBe(true);
    expect(isValidAmount(999999.99)).toBe(true);
  });

  it("should reject zero", () => {
    expect(isValidAmount(0)).toBe(false);
  });

  it("should reject negative amounts", () => {
    expect(isValidAmount(-1)).toBe(false);
    expect(isValidAmount(-100)).toBe(false);
  });

  it("should reject amounts above maximum", () => {
    expect(isValidAmount(1000001)).toBe(false);
    expect(isValidAmount(10000000)).toBe(false);
  });

  it("should reject NaN", () => {
    expect(isValidAmount(Number.NaN)).toBe(false);
  });

  it("should accept very small positive amounts", () => {
    expect(isValidAmount(0.0001)).toBe(true);
    expect(isValidAmount(0.000001)).toBe(true);
  });

  it("should accept amount exactly at boundary", () => {
    expect(isValidAmount(1000000)).toBe(true);
  });
});
