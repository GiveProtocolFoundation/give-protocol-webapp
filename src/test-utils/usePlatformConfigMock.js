// Mock for @/hooks/usePlatformConfig
import { jest } from "@jest/globals";

export const usePlatformConfig = jest.fn(() => ({
  supportedNetworks: null,
  supportedTokens: null,
  loading: false,
}));
