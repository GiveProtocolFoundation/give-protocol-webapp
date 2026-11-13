import {
  DEFAULT_NTEE_CATEGORY,
  getTranslatableNteeCategory,
} from "./nteeCategories";

describe("getTranslatableNteeCategory", () => {
  it("maps the major NTEE letter to a translatable category", () => {
    expect(getTranslatableNteeCategory("B20")).toEqual({
      key: "browse.category.B",
      label: "Education",
    });
  });

  it("is case- and whitespace-insensitive", () => {
    expect(getTranslatableNteeCategory(" e30 ").label).toBe("Health");
  });

  it("falls back to the generic category for missing or unknown codes", () => {
    expect(getTranslatableNteeCategory(null)).toBe(DEFAULT_NTEE_CATEGORY);
    expect(getTranslatableNteeCategory()).toBe(DEFAULT_NTEE_CATEGORY);
    expect(getTranslatableNteeCategory("")).toBe(DEFAULT_NTEE_CATEGORY);
    expect(getTranslatableNteeCategory("Z99")).toBe(DEFAULT_NTEE_CATEGORY);
  });
});
