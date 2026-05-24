// Mock for @/hooks/useTranslation
// Mapped via moduleNameMapper to intercept all useTranslation imports in tests
import { jest } from "@jest/globals";

export const useTranslation = jest.fn(() => ({
  t: (key, fallback, params) => {
    let text = fallback ?? key;
    if (params && typeof text === "string") {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, "g"), String(v));
      });
    }
    return text;
  },
  language: "en",
}));
