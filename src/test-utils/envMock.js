// Mock for @/config/env module
// This provides the ENV object that would normally come from import.meta.env

/**
 * Mock getEnv that returns undefined for all keys.
 * @param {string} _key - The env var key
 * @returns {undefined} Always returns undefined in tests
 */
export function getEnv(_key) {
  return undefined;
}

export const ENV = {
  SUPABASE_URL: "https://mock-supabase-url.supabase.co", // skipcq: SCT-A000 - Test placeholder URL, not a real endpoint
  SUPABASE_ANON_KEY: "mock-supabase-anon-key", // skipcq: SCT-A000 - Test placeholder, not a real key
  APP_DOMAIN: "localhost",
  NETWORK: "base",
  NETWORK_ENDPOINT: "",
  ENABLE_GOOGLE_AUTH: false,
  ENABLE_MAGIC_LINKS: false,
  SHOW_TESTNETS: true,
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_COOLDOWN_MINUTES: 15,
  CACHE_TTL_MINUTES: 5,
  API_TIMEOUT_MS: 10000,
  ENABLE_ANALYTICS: false,
  ANALYTICS_SAMPLE_RATE: 0.1,
  MONITORING_API_KEY: "", // skipcq: SCT-A000 - Test placeholder, not a real key
  MONITORING_APP_ID: "", // skipcq: SCT-A000 - Test placeholder, not a real ID
  MONITORING_ENVIRONMENT: "test",
  MONITORING_ENABLED_MONITORS: [
    "webVital",
    "error",
    "resource",
    "navigation",
    "paint",
    "api",
    "custom",
    "userAction",
  ],
};

// skipcq: SCT-A000 - Placeholder test address, not a real secret
const TEST_ADDRESS = "0x1234567890123456789012345678901234567890";

/**
 * Get contract addresses for a specific chain from environment variables.
 * Test mock returns placeholder addresses so contract-deployment checks
 * behave consistently with the contracts mock.
 * @param {number} _chainId - The chain ID
 * @returns {object} Contract addresses for the chain
 */
export function getChainContractAddresses(_chainId) {
  return {
    DONATION: TEST_ADDRESS,
    VERIFICATION: TEST_ADDRESS,
    DISTRIBUTION: undefined,
    PORTFOLIO_FUNDS: undefined,
    EXECUTOR: undefined,
    TOKEN: TEST_ADDRESS,
  };
}
