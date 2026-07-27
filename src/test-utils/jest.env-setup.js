// This file runs before modules are loaded to set up import.meta.env
// Required for modules that use Vite's import.meta.env

// react-router v7 references TextEncoder at module init time; jsdom doesn't
// expose Node's WHATWG globals, so we polyfill from Node's util module.
const { TextEncoder, TextDecoder } = require("util");
globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;

globalThis.import = {
  meta: {
    env: {
      VITE_SUPABASE_URL: "https://mock-supabase-url.supabase.co",
      VITE_SUPABASE_ANON_KEY: "mock-supabase-anon-key",
      VITE_DOCS_URL: "https://mock-docs-url.com",
      VITE_MOONBASE_RPC_URL: "https://rpc.api.moonbase.moonbeam.network",
      VITE_APP_DOMAIN: "localhost",
      VITE_NETWORK: "moonbase",
      VITE_NETWORK_ENDPOINT: "wss://wss.api.moonbase.moonbeam.network",
      VITE_ENABLE_GOOGLE_AUTH: "false",
      VITE_ENABLE_MAGIC_LINKS: "false",
      VITE_MAX_LOGIN_ATTEMPTS: "5",
      VITE_LOGIN_COOLDOWN_MINUTES: "15",
      VITE_CACHE_TTL_MINUTES: "5",
      VITE_API_TIMEOUT_MS: "10000",
      VITE_ENABLE_ANALYTICS: "false",
      VITE_ANALYTICS_SAMPLE_RATE: "0.1",
      VITE_MONITORING_API_KEY: "",
      VITE_MONITORING_APP_ID: "",
      VITE_MONITORING_ENVIRONMENT: "test",
      VITE_MONITORING_ENABLED_MONITORS:
        "webVital,error,resource,navigation,paint,api,custom,userAction",
      VITE_BASE_RPC_URL: "",
      VITE_OPTIMISM_RPC_URL: "",
      VITE_MOONBEAM_RPC_URL: "",
      VITE_BASE_SEPOLIA_RPC_URL: "",
      VITE_OPTIMISM_SEPOLIA_RPC_URL: "",
      VITE_DONATION_CONTRACT_ADDRESS:
        "0x1234567890123456789012345678901234567890",
      VITE_TOKEN_CONTRACT_ADDRESS: "0x4567890123456789012345678901234567890123",
      VITE_VERIFICATION_CONTRACT_ADDRESS:
        "0x2345678901234567890123456789012345678901",
      VITE_DISTRIBUTION_CONTRACT_ADDRESS:
        "0x3456789012345678901234567890123456789012",
      VITE_PORTFOLIO_FUNDS_CONTRACT_ADDRESS:
        "0x5678901234567890123456789012345678901234",
      MODE: "test",
      DEV: false,
      PROD: false,
    },
  },
};
