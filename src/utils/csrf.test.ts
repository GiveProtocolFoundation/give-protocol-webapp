import { describe, it, expect, beforeEach } from "@jest/globals";
import { CSRFProtection } from "./csrf";

describe("CSRFProtection", () => {
  beforeEach(() => {
    // Reset internal state by re-initializing
    document.cookie = "csrf-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    CSRFProtection.initialize();
  });

  describe("initialize", () => {
    it("should generate a token and set a cookie", () => {
      CSRFProtection.initialize();
      const token = CSRFProtection.getToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });
  });

  describe("getToken", () => {
    it("should return the token", () => {
      const token = CSRFProtection.getToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should return the same token on subsequent calls", () => {
      const token1 = CSRFProtection.getToken();
      const token2 = CSRFProtection.getToken();
      expect(token1).toBe(token2);
    });
  });

  describe("validate", () => {
    it("should return true for matching token", () => {
      const token = CSRFProtection.getToken();
      expect(CSRFProtection.validate(token)).toBe(true);
    });

    it("should return false for non-matching token", () => {
      expect(CSRFProtection.validate("invalid-token")).toBe(false);
    });
  });

  describe("getHeaders", () => {
    it("should return an object with X-CSRF-Token header", () => {
      const headers = CSRFProtection.getHeaders();
      expect(headers).toHaveProperty("X-CSRF-Token");
      expect(typeof headers["X-CSRF-Token"]).toBe("string");
      expect(headers["X-CSRF-Token"].length).toBeGreaterThan(0);
    });

    it("should return the same token as getToken", () => {
      const token = CSRFProtection.getToken();
      const headers = CSRFProtection.getHeaders();
      expect(headers["X-CSRF-Token"]).toBe(token);
    });
  });
});
