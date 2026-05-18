// Mock for @/services/walletDesignationService
// Mapped via moduleNameMapper — each export is a jest.fn() so tests can
// override per case via the imported reference.
import { jest } from "@jest/globals";

export const requestNonce = jest.fn(() =>
  Promise.resolve({ ok: false, error: "not mocked" }),
);
export const submitSignature = jest.fn(() =>
  Promise.resolve({ ok: false, error: "not mocked" }),
);
export const recheckPending = jest.fn(() =>
  Promise.resolve({ ok: true, data: { results: [] } }),
);
export const confirmWalletByToken = jest.fn(() =>
  Promise.resolve({ ok: false, error: "not mocked" }),
);
export const getDesignationState = jest.fn(() => Promise.resolve(null));
