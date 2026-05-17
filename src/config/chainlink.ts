/**
 * Chainlink Data Feed configuration
 * Contains price feed addresses for all supported chains and tokens
 */

import { CHAIN_IDS, type ChainId } from "./contracts";

/**
 * Chainlink Aggregator V3 Interface ABI (minimal)
 * Only includes functions needed for price reading
 */
export const AGGREGATOR_V3_ABI = [
  {
    inputs: [],
    name: "decimals",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "description",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { internalType: "uint80", name: "roundId", type: "uint80" },
      { internalType: "int256", name: "answer", type: "int256" },
      { internalType: "uint256", name: "startedAt", type: "uint256" },
      { internalType: "uint256", name: "updatedAt", type: "uint256" },
      { internalType: "uint80", name: "answeredInRound", type: "uint80" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Price feed configuration
 */
export interface PriceFeedConfig {
  /** Contract address of the Chainlink price feed */
  address: string;
  /** Human-readable description (e.g., "ETH / USD") */
  description: string;
  /** Decimals returned by the feed (usually 8 for USD pairs) */
  decimals: number;
  /** Heartbeat interval in seconds - max time between updates */
  heartbeat: number;
}

/**
 * L2 Sequencer Uptime Feed addresses
 * Used to check if L2 sequencer is up before trusting price data
 */
export const SEQUENCER_UPTIME_FEEDS: Partial<Record<ChainId, string>> = {
  [CHAIN_IDS.BASE]: "0xBCF85224fc0756B9Fa45aA7892530B47e10b6433",
  [CHAIN_IDS.OPTIMISM]: "0x371EAD81c9102C9BF4874A9075FFFf170F2Ee389",
};

/** Creates feed entries where wrapped token shares native token's feed */
function withWrapped(
  native: string,
  wrapped: string,
  config: PriceFeedConfig,
): Record<string, PriceFeedConfig> {
  return { [native]: config, [wrapped]: config };
}

const STABLECOIN_HEARTBEAT = 86400; // 24 hours

/**
 * Builds a `PriceFeedConfig` entry for a USD-pegged stablecoin using the standard 24-hour heartbeat.
 * @param address - On-chain Chainlink aggregator address for the feed.
 * @param symbol - Token symbol used in the feed description (e.g. `USDC`).
 * @returns The price feed configuration.
 */
function stablecoinFeed(address: string, symbol: string): PriceFeedConfig {
  return {
    address,
    description: `${symbol} / USD`,
    decimals: 8,
    heartbeat: STABLECOIN_HEARTBEAT,
  };
}

/**
 * Chainlink price feed addresses by chain
 * Maps token symbols to their USD price feed addresses
 */
export const CHAINLINK_FEEDS: Record<
  ChainId,
  Record<string, PriceFeedConfig>
> = {
  // Base Mainnet
  [CHAIN_IDS.BASE]: {
    ...withWrapped("ETH", "WETH", {
      address: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      description: "ETH / USD",
      decimals: 8,
      heartbeat: 1200, // 20 minutes
    }),
    USDC: stablecoinFeed("0x7e860098F58bBFC8648a4311b374B1D669a2bc6B", "USDC"),
    USDT: stablecoinFeed("0xf19d560eB8d2ADf07BD6D13ed03e1D11215721F9", "USDT"),
    DAI: stablecoinFeed("0x591e79239a7d679378eC8c847e5038150364C78F", "DAI"),
  },

  // Optimism Mainnet
  [CHAIN_IDS.OPTIMISM]: {
    ...withWrapped("ETH", "WETH", {
      address: "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
      description: "ETH / USD",
      decimals: 8,
      heartbeat: 1200,
    }),
    USDC: stablecoinFeed("0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3", "USDC"),
    USDT: stablecoinFeed("0xECef79E109e997bCA29c1c0897ec9d7b03647F5E", "USDT"),
    DAI: stablecoinFeed("0x8dBa75e83DA73cc766A7e5a0ee71F656BAb470d6", "DAI"),
    OP: {
      address: "0x0D276FC14719f9292D5C1eA2198673d1f4269246",
      description: "OP / USD",
      decimals: 8,
      heartbeat: 1200,
    },
  },

  // Moonbeam Mainnet
  [CHAIN_IDS.MOONBEAM]: {
    ...withWrapped("GLMR", "WGLMR", {
      address: "0x4497B606be93e773bbA5eaCFCb2ac5E2214220Eb",
      description: "GLMR / USD",
      decimals: 8,
      heartbeat: 3600,
    }),
    DOT: {
      address: "0x1466b4bD0C4B6B8e1164991909961e0EE6a66d8c",
      description: "DOT / USD",
      decimals: 8,
      heartbeat: 3600,
    },
    USDC: stablecoinFeed("0xA122591F60115D63421f66F752EF9f6e0bc73abC", "USDC"),
    USDT: stablecoinFeed("0x3bC50c8f56EaA6D7fBfB5C89DEe16b0FEc296F87", "USDT"),
  },

  // Base Sepolia (Testnet) - Use mainnet feeds as proxy
  [CHAIN_IDS.BASE_SEPOLIA]: {
    ...withWrapped("ETH", "WETH", {
      address: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
      description: "ETH / USD",
      decimals: 8,
      heartbeat: 3600,
    }),
  },

  // Optimism Sepolia (Testnet)
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    ...withWrapped("ETH", "WETH", {
      address: "0x61Ec26aA57019C486B10502285c5A3D4A4750AD7",
      description: "ETH / USD",
      decimals: 8,
      heartbeat: 3600,
    }),
  },

  // Moonbase Alpha (Testnet) - Limited feeds available
  [CHAIN_IDS.MOONBASE]: {
    DEV: {
      address: "0x0000000000000000000000000000000000000000", // No Chainlink feed, use fallback
      description: "DEV / USD",
      decimals: 8,
      heartbeat: 3600,
    },
  },
};

/**
 * Map CoinGecko token IDs to token symbols for Chainlink lookup
 */
export const COINGECKO_TO_SYMBOL: Record<string, string> = {
  ethereum: "ETH",
  moonbeam: "GLMR",
  "wrapped-moonbeam": "WGLMR",
  polkadot: "DOT",
  "usd-coin": "USDC",
  tether: "USDT",
  dai: "DAI",
  optimism: "OP",
};

/**
 * Get Chainlink feed config for a token on a specific chain
 * @param chainId - Chain ID
 * @param tokenSymbol - Token symbol (e.g., "ETH", "USDC")
 * @returns Feed configuration or undefined if not available
 */
export function getChainlinkFeed(
  chainId: ChainId | number,
  tokenSymbol: string,
): PriceFeedConfig | undefined {
  const chainFeeds = CHAINLINK_FEEDS[chainId as ChainId];
  if (!chainFeeds) return undefined;
  return chainFeeds[tokenSymbol.toUpperCase()];
}

/**
 * Check if a chain has a sequencer uptime feed (L2 chains)
 * @param chainId - Chain ID
 * @returns True if sequencer uptime feed is available
 */
export function hasSequencerFeed(chainId: ChainId | number): boolean {
  return chainId in SEQUENCER_UPTIME_FEEDS;
}

/**
 * Get sequencer uptime feed address for a chain
 * @param chainId - Chain ID
 * @returns Feed address or undefined
 */
export function getSequencerFeed(
  chainId: ChainId | number,
): string | undefined {
  return SEQUENCER_UPTIME_FEEDS[chainId as ChainId];
}
