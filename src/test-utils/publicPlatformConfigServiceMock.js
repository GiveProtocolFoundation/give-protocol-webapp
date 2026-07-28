// Mock for @/services/publicPlatformConfigService
import { jest } from "@jest/globals";

export const getPublicPlatformConfig = jest.fn(() =>
  Promise.resolve({ supportedNetworks: [], supportedTokens: [] }),
);
