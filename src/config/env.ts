// Parse string array
const parseStringArray = (value: string | string[]): string[] => {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    return value.split(",").map((item) => item.trim());
  }
  return [];
};

/**
 * Gets the value of an environment variable by key.
 * Uses import.meta.env in Vite runtime and falls back to process.env in Node/test environments.
 * @param key - The environment variable name
 * @returns The variable value, or undefined if not set
 */
// Helper to get environment variable with fallback to process.env for test environments
export const getEnv = (key: string): string | undefined => {
  // Check if import.meta.env is available (Vite runtime)
  if (import.meta?.env) {
    return import.meta.env[key];
  }
  // Fallback to process.env for test environments
  if (process?.env) {
    return process.env[key];
  }
  return undefined;
};

/**
 * Contract address set for a single chain
 */
export interface ChainContractAddresses {
  DONATION: string | undefined;
  VERIFICATION: string | undefined;
  DISTRIBUTION: string | undefined;
  PORTFOLIO_FUNDS: string | undefined;
  EXECUTOR: string | undefined;
  TOKEN: string | undefined;
}

// Env var prefix for each supported chain ID
const CHAIN_ENV_PREFIX: Record<number, string> = {
  // Testnets
  84532: "VITE_BASE_SEPOLIA",
  11155420: "VITE_OPTIMISM_SEPOLIA",
  // Mainnets
  1: "VITE_ETHEREUM",
  8453: "VITE_BASE",
  10: "VITE_OPTIMISM",
  42161: "VITE_ARBITRUM",
  137: "VITE_POLYGON",
  43114: "VITE_AVALANCHE",
};

/**
 * Get contract addresses for a specific chain from environment variables.
 * @param chainId - The chain ID to get addresses for
 * @returns Contract addresses for the chain
 */
export function getChainContractAddresses(
  chainId: number,
): ChainContractAddresses {
  const prefix = CHAIN_ENV_PREFIX[chainId];

  const empty: ChainContractAddresses = {
    DONATION: undefined,
    VERIFICATION: undefined,
    DISTRIBUTION: undefined,
    PORTFOLIO_FUNDS: undefined,
    EXECUTOR: undefined,
    TOKEN: undefined,
  };

  if (!prefix) {
    return empty;
  }

  /** Resolves a contract address env var for the given suffix (e.g. "DONATION"). */
  const getAddr = (suffix: string): string | undefined =>
    getEnv(`${prefix}_${suffix}_ADDRESS`);

  return {
    DONATION: getAddr("DONATION"),
    VERIFICATION: getAddr("VERIFICATION"),
    DISTRIBUTION: getAddr("DISTRIBUTION"),
    PORTFOLIO_FUNDS: getAddr("PORTFOLIO_FUNDS"),
    EXECUTOR: getAddr("EXECUTOR"),
    TOKEN: getAddr("TOKEN"),
  };
}

// Create and validate environment configuration
/** Validated environment configuration object built from VITE_* variables at startup. */
export const ENV = {
  // Required variables
  SUPABASE_URL: getEnv("VITE_SUPABASE_URL"),
  SUPABASE_ANON_KEY: getEnv("VITE_SUPABASE_ANON_KEY"),
  APP_DOMAIN: getEnv("VITE_APP_DOMAIN") || "localhost",

  // Optional variables with defaults
  NETWORK: getEnv("VITE_NETWORK") || "base",
  NETWORK_ENDPOINT: getEnv("VITE_NETWORK_ENDPOINT") || "",

  // Feature flags
  ENABLE_GOOGLE_AUTH: getEnv("VITE_ENABLE_GOOGLE_AUTH") === "true",
  ENABLE_MAGIC_LINKS: getEnv("VITE_ENABLE_MAGIC_LINKS") === "true",
  SHOW_TESTNETS: getEnv("VITE_SHOW_TESTNETS") === "true",
  SHOW_DEMO_SKILLS: getEnv("VITE_SHOW_DEMO_SKILLS") === "true",

  // Security settings
  MAX_LOGIN_ATTEMPTS: Number(getEnv("VITE_MAX_LOGIN_ATTEMPTS") || 5),
  LOGIN_COOLDOWN_MINUTES: Number(getEnv("VITE_LOGIN_COOLDOWN_MINUTES") || 15),

  // Performance settings
  CACHE_TTL_MINUTES: Number(getEnv("VITE_CACHE_TTL_MINUTES") || 5),
  API_TIMEOUT_MS: Number(getEnv("VITE_API_TIMEOUT_MS") || 10000),

  // Analytics settings
  ENABLE_ANALYTICS: getEnv("VITE_ENABLE_ANALYTICS") === "true",
  ANALYTICS_SAMPLE_RATE: Number(getEnv("VITE_ANALYTICS_SAMPLE_RATE") || 0.1),

  // Monitoring settings
  MONITORING_API_KEY: getEnv("VITE_MONITORING_API_KEY") || "",
  MONITORING_APP_ID: getEnv("VITE_MONITORING_APP_ID") || "",
  MONITORING_ENVIRONMENT:
    getEnv("VITE_MONITORING_ENVIRONMENT") || "development",
  MONITORING_ENABLED_MONITORS: parseStringArray(
    getEnv("VITE_MONITORING_ENABLED_MONITORS") ||
      "webVital,error,resource,navigation,paint,api,custom,userAction",
  ),
} as const;

// Validate required environment variables
if (!ENV.SUPABASE_URL || !ENV.SUPABASE_ANON_KEY) {
  console.error("Missing required Supabase environment variables:", {
    SUPABASE_URL: ENV.SUPABASE_URL ? "defined" : "undefined",
    SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY ? "defined" : "undefined",
  });
}

/** Inferred type of the ENV configuration object. */
export type EnvVars = typeof ENV;
