// Mock for @/hooks/useTranslation
// Mapped via moduleNameMapper to intercept all useTranslation imports in tests
import { jest } from "@jest/globals";
import en from "../i18n/resources/en.ts";

const translations = en.translation;

const tFn = (key, fallback, options) => {
  let text = fallback ?? translations[key] ?? key;
  if (options && typeof text === "string") {
    Object.entries(options).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
    });
  }
  return text;
};

export const useTranslation = jest.fn(() => ({
  t: tFn,
  language: "en",
}));
