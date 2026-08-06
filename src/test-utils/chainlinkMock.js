// Mock for @/config/chainlink
// Provides realistic feed config so chainlinkPriceFeed.test.ts can exercise
// the service's full logic path (including provider creation and contract calls).

import { CHAIN_IDS } from "./contractsMock.js";

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
];

/** Build a basic feed entry. */
function feed(address, description, decimals = 8, heartbeat = 3600) {
  return { address, description, decimals, heartbeat };
}

/** L2 Sequencer Uptime Feed addresses. */
export const SEQUENCER_UPTIME_FEEDS = {
  [CHAIN_IDS.BASE]: "0xBCF85224fc0756B9Fa45aA7892530B47e10b6917",
  [CHAIN_IDS.OPTIMISM]: "0x371EAD81c9102C9BF4874A9075FFFf170F2Ee389",
};

/** Chainlink price feed addresses per chain + symbol. */
export const CHAINLINK_FEEDS = {
  [CHAIN_IDS.ETHEREUM]: {
    ETH: feed(
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "ETH / USD",
      8,
      3600,
    ),
    WETH: feed(
      "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419",
      "ETH / USD",
      8,
      3600,
    ),
    USDC: feed(
      "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6",
      "USDC / USD",
      8,
      86400,
    ),
    USDT: feed(
      "0x3E7d1eAB13ad0104d2750B8863b489D65364e32D",
      "USDT / USD",
      8,
      86400,
    ),
    DAI: feed(
      "0xAed0c38402a5d19df6E4c03F4E2DceD6e29c1ee9",
      "DAI / USD",
      8,
      3600,
    ),
  },
  [CHAIN_IDS.BASE]: {
    ETH: feed(
      "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      "ETH / USD",
      8,
      1200,
    ),
    WETH: feed(
      "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
      "ETH / USD",
      8,
      1200,
    ),
    USDC: feed(
      "0x7e860098F58bBFC8648a4311b374B1D669a2bc6B",
      "USDC / USD",
      8,
      86400,
    ),
  },
  [CHAIN_IDS.OPTIMISM]: {
    ETH: feed(
      "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
      "ETH / USD",
      8,
      1200,
    ),
    WETH: feed(
      "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
      "ETH / USD",
      8,
      1200,
    ),
    OP: feed("0x0D276FC14719f9292D5C1eA2198673d1f4269246", "OP / USD", 8, 1200),
    USDC: feed(
      "0x16a9FA2FDa030272Ce99B29CF780dFA30361E0f3",
      "USDC / USD",
      8,
      86400,
    ),
  },
  [CHAIN_IDS.BASE_SEPOLIA]: {
    ETH: feed(
      "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
      "ETH / USD",
      8,
      3600,
    ),
    WETH: feed(
      "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
      "ETH / USD",
      8,
      3600,
    ),
  },
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    ETH: feed(
      "0x61Ec26aA57019C486B10502285c5A3D4A4750AD7",
      "ETH / USD",
      8,
      3600,
    ),
    WETH: feed(
      "0x61Ec26aA57019C486B10502285c5A3D4A4750AD7",
      "ETH / USD",
      8,
      3600,
    ),
  },
};

/** CoinGecko ID → Chainlink symbol mapping. */
export const COINGECKO_TO_SYMBOL = {
  ethereum: "ETH",
  "wrapped-ether": "WETH",
  "usd-coin": "USDC",
  tether: "USDT",
  dai: "DAI",
  optimism: "OP",
};

/** Mock: returns the feed config for a chain + symbol pair */
export function getChainlinkFeed(chainId, symbol) {
  const chainFeeds = CHAINLINK_FEEDS[chainId];
  if (!chainFeeds) return undefined;
  return chainFeeds[symbol];
}

/** Mock: checks whether a sequencer feed exists for the given chain */
export function hasSequencerFeed(chainId) {
  return chainId in SEQUENCER_UPTIME_FEEDS;
}

/** Mock: returns the sequencer uptime feed address for a chain */
export function getSequencerFeed(chainId) {
  return SEQUENCER_UPTIME_FEEDS[chainId];
}
