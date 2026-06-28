// Mock for @/utils/validation
// Mapped via moduleNameMapper — all exports are jest.fn() for per-test overrides.
import { jest } from "@jest/globals";

export const validateEmail = jest.fn((email) => {
  if (typeof email !== "string" || email.length > 254) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local, domain] = parts;
  return local.length > 0 && /^[^.\s][^.\s]*(\.[^.\s]+)+$/.test(domain);
});
export const validatePassword = jest.fn(
  (password) => typeof password === "string" && password.length >= 8,
);
export const validateRequired = jest.fn(
  (value) => value !== "" && value !== null && value !== undefined,
);
export const validateName = jest.fn(
  (name) => typeof name === "string" && name.trim().length >= 2,
);
export const validateUrl = jest.fn((url) => {
  try {
    return Boolean(new URL(url));
  } catch {
    return false;
  }
});
export const validatePhoneNumber = jest.fn(
  (phone) => typeof phone === "string" && phone.replaceAll(/\D/g, "").length >= 7,
);
export const validateAmount = jest.fn((amount) => amount > 0);
export const sanitizeInput = jest.fn((input) => input);
export const validateAuthInput = jest.fn();
export const validateFileUpload = jest.fn();
export const isValidAmount = jest.fn((amount) => amount > 0);
