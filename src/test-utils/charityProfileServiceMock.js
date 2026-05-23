// Mock for @/services/charityProfileService
// Mapped via moduleNameMapper — each export is a jest.fn() for per-test overrides.
import { jest } from "@jest/globals";

export const getCharityProfileByEin = jest.fn(() => Promise.resolve(null));
export const claimCharityProfile = jest.fn(() => Promise.resolve(null));
export const getCharityWalletAddress = jest.fn(() => Promise.resolve(null));
export const fetchCharityProfileAssets = jest.fn(() => Promise.resolve(null));
export const fetchCharityProfileAssetsByEin = jest.fn(() =>
  Promise.resolve(null),
);
export const fetchCharityProfileBySignerEmail = jest.fn(() =>
  Promise.resolve(null),
);
export const fetchCharityProfileByName = jest.fn(() => Promise.resolve(null));
export const repairClaimedBy = jest.fn(() => Promise.resolve());
