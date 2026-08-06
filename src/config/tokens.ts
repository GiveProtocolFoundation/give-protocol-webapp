/**
 * Token configuration for multi-chain donations
 * Defines supported tokens, their metadata, and contract addresses per chain
 */

import { CHAIN_IDS, type ChainId } from "./contracts";

/** Configuration for a single supported token on a given chain. */
export interface TokenConfig {
  /** Token symbol (e.g., "ETH", "USDC") */
  symbol: string;
  /** Full token name */
  name: string;
  /** Smart contract address */
  address: string;
  /** Number of decimal places */
  decimals: number;
  /** CoinGecko API ID for price fetching */
  coingeckoId: string;
  /** URL to token icon/logo */
  icon: string;
  /** Whether this is the native token */
  isNative: boolean;
  /** Minimum donation amount in token units (optional, for dust prevention) */
  minDonation?: number;
}

/** A fiat currency supported for price display. */
export interface FiatCurrency {
  /** Currency code (e.g., "USD", "EUR") */
  code: string;
  /** Currency name */
  name: string;
  /** Currency symbol */
  symbol: string;
  /** CoinGecko API ID (e.g., "usd", "eur") */
  coingeckoId: string;
}

/** Shared token metadata for tokens that appear across multiple chains */
const ETH_METADATA = {
  symbol: "ETH",
  name: "Ethereum",
  decimals: 18,
  coingeckoId: "ethereum",
  icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  isNative: true,
} as const;

const WETH_METADATA = {
  symbol: "WETH",
  name: "Wrapped Ether",
  decimals: 18,
  coingeckoId: "ethereum",
  icon: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  isNative: false,
} as const;

const USDC_METADATA = {
  symbol: "USDC",
  name: "USD Coin",
  decimals: 6,
  coingeckoId: "usd-coin",
  icon: "https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png",
  isNative: false,
} as const;

const USDT_METADATA = {
  symbol: "USDT",
  name: "Tether USD",
  decimals: 6,
  coingeckoId: "tether",
  icon: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
  isNative: false,
} as const;

const DAI_METADATA = {
  symbol: "DAI",
  name: "Dai Stablecoin",
  decimals: 18,
  coingeckoId: "dai",
  icon: "https://assets.coingecko.com/coins/images/9956/small/4943.png",
  isNative: false,
} as const;

/**
 * Supported tokens on Base mainnet
 */
export const BASE_TOKENS: TokenConfig[] = [
  {
    ...ETH_METADATA,
    address: "0x0000000000000000000000000000000000000000", // Native token
  },
  {
    ...WETH_METADATA,
    address: "0x4200000000000000000000000000000000000006", // Base WETH
  },
  {
    ...USDC_METADATA,
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Native Circle USDC on Base
    minDonation: 1, // $1 minimum
  },
  {
    ...USDT_METADATA,
    address: "0xfde4c96C8593536E31f229d6156B4D8d02642F84", // USDT on Base (bridged)
    minDonation: 1,
  },
  {
    ...DAI_METADATA,
    address: "0x50c5725949A6f0C72e6C4a641F24049b1AE50DB8", // DAI on Base
    minDonation: 1,
  },
];

/**
 * Supported tokens on Base Sepolia testnet
 */
export const BASE_SEPOLIA_TOKENS: TokenConfig[] = [
  {
    ...ETH_METADATA,
    name: "Ethereum (Testnet)",
    address: "0x0000000000000000000000000000000000000000",
  },
  {
    ...WETH_METADATA,
    name: "Wrapped Ether (Testnet)",
    address: "0x4200000000000000000000000000000000000006",
  },
];

/**
 * Supported tokens on Optimism mainnet
 */
export const OPTIMISM_TOKENS: TokenConfig[] = [
  {
    ...ETH_METADATA,
    address: "0x0000000000000000000000000000000000000000", // Native token
  },
  {
    ...WETH_METADATA,
    address: "0x4200000000000000000000000000000000000006", // Optimism WETH
  },
  {
    ...USDC_METADATA,
    symbol: "USDC.e",
    name: "Bridged USD Coin",
    address: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607", // Bridged USDC on Optimism
    minDonation: 1,
  },
  {
    ...USDC_METADATA,
    address: "0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85", // Native Circle USDC on Optimism
    minDonation: 1,
  },
  {
    ...USDT_METADATA,
    address: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58", // USDT on Optimism
    minDonation: 1,
  },
  {
    ...DAI_METADATA,
    address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1", // DAI on Optimism
    minDonation: 1,
  },
  {
    symbol: "OP",
    name: "Optimism",
    address: "0x4200000000000000000000000000000000000042", // OP token
    decimals: 18,
    coingeckoId: "optimism",
    icon: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
    isNative: false,
    minDonation: 10, // 10 OP minimum
  },
];

/**
 * Supported tokens on Optimism Sepolia testnet
 */
export const OPTIMISM_SEPOLIA_TOKENS: TokenConfig[] = [
  {
    ...ETH_METADATA,
    name: "Ethereum (Testnet)",
    address: "0x0000000000000000000000000000000000000000",
  },
  {
    ...WETH_METADATA,
    name: "Wrapped Ether (Testnet)",
    address: "0x4200000000000000000000000000000000000006",
  },
];

/**
 * Supported tokens on Ethereum mainnet
 */
export const ETHEREUM_TOKENS: TokenConfig[] = [
  {
    ...ETH_METADATA,
    address: "0x0000000000000000000000000000000000000000",
  },
  {
    ...WETH_METADATA,
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
  },
  {
    ...USDC_METADATA,
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    minDonation: 1,
  },
  {
    ...USDT_METADATA,
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    minDonation: 1,
  },
  {
    ...DAI_METADATA,
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    minDonation: 1,
  },
];

/**
 * Supported tokens on Arbitrum mainnet
 */
export const ARBITRUM_TOKENS: TokenConfig[] = [
  {
    ...ETH_METADATA,
    address: "0x0000000000000000000000000000000000000000",
  },
  {
    ...WETH_METADATA,
    address: "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
  },
  {
    ...USDC_METADATA,
    address: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    minDonation: 1,
  },
  {
    ...USDT_METADATA,
    address: "0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9",
    minDonation: 1,
  },
  {
    ...DAI_METADATA,
    address: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1",
    minDonation: 1,
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    address: "0x912CE59144191C1204E64559FE8253a0e49E6548",
    decimals: 18,
    coingeckoId: "arbitrum",
    icon: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
    isNative: false,
    minDonation: 10,
  },
];

/**
 * Supported tokens on Polygon mainnet
 */
export const POLYGON_TOKENS: TokenConfig[] = [
  {
    symbol: "POL",
    name: "POL",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    coingeckoId: "matic-network",
    icon: "https://assets.coingecko.com/coins/images/4713/small/polygon.png",
    isNative: true,
  },
  {
    ...WETH_METADATA,
    address: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  },
  {
    ...USDC_METADATA,
    address: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    minDonation: 1,
  },
  {
    ...USDT_METADATA,
    address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    minDonation: 1,
  },
  {
    ...DAI_METADATA,
    address: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
    minDonation: 1,
  },
];

/**
 * Supported tokens on Avalanche C-Chain
 */
export const AVALANCHE_TOKENS: TokenConfig[] = [
  {
    symbol: "AVAX",
    name: "Avalanche",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    coingeckoId: "avalanche-2",
    icon: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
    isNative: true,
  },
  {
    symbol: "WAVAX",
    name: "Wrapped AVAX",
    address: "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    decimals: 18,
    coingeckoId: "avalanche-2",
    icon: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
    isNative: false,
  },
  {
    ...USDC_METADATA,
    address: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    minDonation: 1,
  },
  {
    ...USDT_METADATA,
    address: "0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7",
    minDonation: 1,
  },
  {
    ...DAI_METADATA,
    symbol: "DAI.e",
    name: "Dai Stablecoin (bridged)",
    address: "0xd586E7F844cEa2F87f50152665BCbc2C279D8d70",
    minDonation: 1,
  },
];

/**
 * Chain-indexed token configurations
 * Maps each supported chain to its available tokens
 */
export const CHAIN_TOKENS: Partial<Record<ChainId, TokenConfig[]>> = {
  // Mainnets
  [CHAIN_IDS.ETHEREUM]: ETHEREUM_TOKENS,
  [CHAIN_IDS.BASE]: BASE_TOKENS,
  [CHAIN_IDS.OPTIMISM]: OPTIMISM_TOKENS,
  [CHAIN_IDS.ARBITRUM]: ARBITRUM_TOKENS,
  [CHAIN_IDS.POLYGON]: POLYGON_TOKENS,
  [CHAIN_IDS.AVALANCHE]: AVALANCHE_TOKENS,
  // Testnets
  [CHAIN_IDS.BASE_SEPOLIA]: BASE_SEPOLIA_TOKENS,
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: OPTIMISM_SEPOLIA_TOKENS,
};

/**
 * Supported fiat currencies for display
 * Matches the currencies defined in SettingsContext
 */
export const SUPPORTED_CURRENCIES: FiatCurrency[] = [
  { code: "USD", name: "US Dollar", symbol: "$", coingeckoId: "usd" },
  { code: "EUR", name: "Euro", symbol: "€", coingeckoId: "eur" },
  { code: "GBP", name: "British Pound", symbol: "£", coingeckoId: "gbp" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", coingeckoId: "cad" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", coingeckoId: "aud" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", coingeckoId: "cny" },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", coingeckoId: "jpy" },
  { code: "KRW", name: "Korean Won", symbol: "₩", coingeckoId: "krw" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", coingeckoId: "aed" },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", coingeckoId: "chf" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", coingeckoId: "inr" },
  { code: "MXP", name: "Mexican Peso", symbol: "Mex$", coingeckoId: "mxn" },
  { code: "ILS", name: "Israeli Shekel", symbol: "₪", coingeckoId: "ils" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", coingeckoId: "ngn" },
  { code: "HKD", name: "Hong Kong Dollar", symbol: "HK$", coingeckoId: "hkd" },
  { code: "PKR", name: "Pakistani Rupee", symbol: "₨", coingeckoId: "pkr" },
];

/**
 * Get token configuration by symbol
 * @param symbol Token symbol to find
 * @returns Token configuration or undefined if not found
 */
export function getTokenBySymbol(symbol: string): TokenConfig | undefined {
  return BASE_TOKENS.find(
    (token) => token.symbol.toLowerCase() === symbol.toLowerCase(),
  );
}

/**
 * Get token configuration by contract address
 * @param address Token contract address
 * @returns Token configuration or undefined if not found
 */
export function getTokenByAddress(address: string): TokenConfig | undefined {
  return BASE_TOKENS.find(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
}

/**
 * Get fiat currency configuration by code
 * @param code Currency code (e.g., "USD")
 * @returns Fiat currency configuration or undefined if not found
 */
export function getCurrencyByCode(code: string): FiatCurrency | undefined {
  return SUPPORTED_CURRENCIES.find(
    (currency) => currency.code.toLowerCase() === code.toLowerCase(),
  );
}

/**
 * Get tokens available for a specific chain
 * @param chainId Chain ID to get tokens for
 * @returns Array of token configurations for the chain, or Base tokens as fallback
 */
export function getTokensForChain(chainId: ChainId | number): TokenConfig[] {
  return CHAIN_TOKENS[chainId as ChainId] || BASE_TOKENS;
}

/**
 * Get ERC20 tokens (non-native) for a specific chain
 * @param chainId Chain ID to get tokens for
 * @returns Array of ERC20 token configurations (excludes native tokens)
 */
export function getERC20TokensForChain(
  chainId: ChainId | number,
): TokenConfig[] {
  return getTokensForChain(chainId).filter((token) => !token.isNative);
}

/**
 * Get token configuration by address for a specific chain
 * @param address Token contract address
 * @param chainId Chain ID to search in
 * @returns Token configuration or undefined if not found
 */
export function getTokenByAddressOnChain(
  address: string,
  chainId: ChainId | number,
): TokenConfig | undefined {
  const tokens = getTokensForChain(chainId);
  return tokens.find(
    (token) => token.address.toLowerCase() === address.toLowerCase(),
  );
}
