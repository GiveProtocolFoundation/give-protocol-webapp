import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  volunteerDraftKey,
  loadDraft,
  saveDraft,
  clearDraft,
} from "./volunteerApplicationDraft";

describe("volunteerDraftKey", () => {
  it("scopes the key to the given opportunity", () => {
    expect(volunteerDraftKey("opp-1")).toBe(
      "volunteer-application-draft:opp-1",
    );
  });
});

describe("saveDraft / loadDraft / clearDraft", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a draft through localStorage", () => {
    const key = volunteerDraftKey("opp-1");
    saveDraft(key, { firstName: "Jane", skills: ["React"] });
    expect(loadDraft(key)).toEqual({ firstName: "Jane", skills: ["React"] });
  });

  it("returns null when no draft exists", () => {
    expect(loadDraft(volunteerDraftKey("missing"))).toBeNull();
  });

  it("removes a draft", () => {
    const key = volunteerDraftKey("opp-1");
    saveDraft(key, { firstName: "Jane" });
    clearDraft(key);
    expect(loadDraft(key)).toBeNull();
  });

  it("returns null for malformed stored JSON", () => {
    const key = volunteerDraftKey("opp-1");
    localStorage.setItem(key, "{not-json");
    expect(loadDraft(key)).toBeNull();
  });

  it("does not throw when localStorage.getItem fails", () => {
    const key = volunteerDraftKey("opp-1");
    const spy = jest
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(loadDraft(key)).toBeNull();
    spy.mockRestore();
  });

  it("does not throw when localStorage.setItem fails", () => {
    const key = volunteerDraftKey("opp-1");
    const spy = jest
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("quota exceeded");
      });
    expect(() => saveDraft(key, { firstName: "Jane" })).not.toThrow();
    spy.mockRestore();
  });

  it("does not throw when localStorage.removeItem fails", () => {
    const key = volunteerDraftKey("opp-1");
    const spy = jest
      .spyOn(Storage.prototype, "removeItem")
      .mockImplementation(() => {
        throw new Error("blocked");
      });
    expect(() => clearDraft(key)).not.toThrow();
    spy.mockRestore();
  });
});
