// Mock for @/hooks/useTranslation
// Mapped via moduleNameMapper to intercept all useTranslation imports in tests
import { jest } from "@jest/globals";
import en from "../i18n/resources/en.ts";

const translations = en.translation;

/**
 * @param {string} key - Translation key to look up
 * @param {string | Record<string, string | number>} [fallbackOrOptions] - Either a
 *   string fallback (CLAUDE.md convention: t(key, "Fallback")) or an i18next-style
 *   options object (t(key, {count: 5})). When an object is detected as the second
 *   argument it is treated as interpolation options, not a fallback.
 * @param {Record<string, string | number>} [options] - Interpolation values when
 *   using the three-argument form: t(key, "fallback", {count: 5})
 * @returns {string} Resolved translation string
 */
const tFn = (key, fallbackOrOptions, options) => {
  let resolvedFallback;
  let resolvedOptions;

  if (
    fallbackOrOptions !== null &&
    fallbackOrOptions !== undefined &&
    typeof fallbackOrOptions === "object" &&
    !Array.isArray(fallbackOrOptions)
  ) {
    // Second arg is an options object (i18next calling convention)
    resolvedOptions = fallbackOrOptions;
  } else {
    resolvedFallback = fallbackOrOptions;
    resolvedOptions = options;
  }

  let text = resolvedFallback ?? translations[key] ?? key;
  if (resolvedOptions && typeof text === "string") {
    Object.entries(resolvedOptions).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    });
  }
  return text;
};

export const useTranslation = jest.fn(() => ({
  t: tFn,
  language: "en",
}));
