import { describe, it, expect } from "@jest/globals";
import { BRAND_THEME } from "./brandTheme";

describe("BRAND_THEME", () => {
  it("should have color scales", () => {
    expect(BRAND_THEME.colors.brand[600]).toBe("#059669");
    expect(BRAND_THEME.colors.semantic.danger).toBeTruthy();
    expect(BRAND_THEME.colors.neutral[900]).toBeTruthy();
  });

  it("should have typography config", () => {
    expect(BRAND_THEME.fonts.heading).toBe("DM Serif Display");
    expect(BRAND_THEME.fonts.body).toBe("DM Sans");
  });

  it("should have layout tokens", () => {
    expect(BRAND_THEME.radii.button).toBe("10px");
    expect(BRAND_THEME.radii.card).toBe("12px");
  });

  it("should have dark mode config", () => {
    expect(BRAND_THEME.darkMode.bgDeep).toBeTruthy();
    expect(BRAND_THEME.darkMode.bgSurface).toBeTruthy();
  });

  it("should have navbar config", () => {
    expect(BRAND_THEME.navbar.height).toBe(60);
  });
});
