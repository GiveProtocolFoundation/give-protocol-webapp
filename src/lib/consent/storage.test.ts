import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import {
  readConsent,
  writeConsent,
  clearConsent,
  CONSENT_STORAGE_KEY,
} from "./storage.js";

describe("consent/storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe("readConsent", () => {
    it("returns null when localStorage is empty", () => {
      expect(readConsent()).toBeNull();
    });

    it("returns the stored record when valid", () => {
      const record = {
        version: 1,
        decidedAt: "2026-01-01T00:00:00.000Z",
        categories: { essential: true, analytics: true },
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));

      const result = readConsent();
      expect(result).toEqual(record);
    });

    it("returns null when version does not match", () => {
      const record = {
        version: 0,
        decidedAt: "2026-01-01T00:00:00.000Z",
        categories: { essential: true, analytics: true },
      };
      localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));

      expect(readConsent()).toBeNull();
    });

    it("returns null when JSON is corrupt", () => {
      localStorage.setItem(CONSENT_STORAGE_KEY, "not-json{{{");
      expect(readConsent()).toBeNull();
    });
  });

  describe("writeConsent", () => {
    it("persists a consent record with analytics:true", () => {
      const result = writeConsent({ analytics: true });

      expect(result.version).toBe(1);
      expect(result.categories.essential).toBe(true);
      expect(result.categories.analytics).toBe(true);
      expect(result.decidedAt).toBeTruthy();

      const stored = JSON.parse(
        localStorage.getItem(CONSENT_STORAGE_KEY) ?? "",
      );
      expect(stored.categories.analytics).toBe(true);
    });

    it("persists a consent record with analytics:false", () => {
      const result = writeConsent({ analytics: false });

      expect(result.categories.essential).toBe(true);
      expect(result.categories.analytics).toBe(false);
    });

    it("roundtrips correctly through readConsent", () => {
      writeConsent({ analytics: true });
      const read = readConsent();

      expect(read).not.toBeNull();
      expect(read?.categories.analytics).toBe(true);
      expect(read?.categories.essential).toBe(true);
    });
  });

  describe("clearConsent", () => {
    it("removes the consent record from localStorage", () => {
      writeConsent({ analytics: true });
      expect(readConsent()).not.toBeNull();

      clearConsent();
      expect(readConsent()).toBeNull();
      expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
    });
  });
});
