// Mock for @/config/contracts
// Provides all exports used by ChainContext, tests, and dependent components.

export const CHAIN_IDS = {
  // Testnets
  BASE_SEPOLIA: 84532,
  OPTIMISM_SEPOLIA: 11155420,
  MOONBASE: 1287,
  // EVM Mainnets
  ETHEREUM: 1,
  BASE: 8453,
  OPTIMISM: 10,
  MOONBEAM: 1284,
  ARBITRUM: 42161,
  POLYGON: 137,
  AVALANCHE: 43114,
  // Non-EVM Mainnets (synthetic IDs for unified chain selection)
  SOLANA_MAINNET: 900001,
  POLKADOT: 900002,
  KUSAMA: 900003,
};

const MOCK_NATIVE_ETH = { name: "Ethereum", symbol: "ETH", decimals: 18 };

export const CHAIN_CONFIGS = {
  [CHAIN_IDS.BASE_SEPOLIA]: {
    id: CHAIN_IDS.BASE_SEPOLIA,
    name: "Base Sepolia",
    shortName: "base-sepolia",
    nativeCurrency: MOCK_NATIVE_ETH,
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
    iconPath: "/chains/base.svg",
    color: "#0052FF",
    ecosystem: "Coinbase",
    isTestnet: true,
    description: "Base testnet.",
  },
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    id: CHAIN_IDS.OPTIMISM_SEPOLIA,
    name: "Optimism Sepolia",
    shortName: "op-sepolia",
    nativeCurrency: MOCK_NATIVE_ETH,
    rpcUrls: ["https://sepolia.optimism.io"],
    blockExplorerUrls: ["https://sepolia-optimistic.etherscan.io"],
    iconPath: "/chains/optimism.svg",
    color: "#FF0420",
    ecosystem: "Ethereum L2",
    isTestnet: true,
    description: "Optimism testnet.",
  },
  [CHAIN_IDS.MOONBASE]: {
    id: CHAIN_IDS.MOONBASE,
    name: "Moonbase Alpha",
    shortName: "moonbase",
    nativeCurrency: { name: "DEV", symbol: "DEV", decimals: 18 },
    rpcUrls: ["https://rpc.api.moonbase.moonbeam.network"],
    blockExplorerUrls: ["https://moonbase.moonscan.io"],
    iconPath: "/chains/moonbeam.svg",
    color: "#53CBC8",
    ecosystem: "Polkadot",
    isTestnet: true,
    description: "Moonbeam testnet.",
  },
  [CHAIN_IDS.ETHEREUM]: {
    id: CHAIN_IDS.ETHEREUM,
    name: "Ethereum",
    shortName: "eth",
    chainType: "evm",
    nativeCurrency: MOCK_NATIVE_ETH,
    rpcUrls: ["https://eth.llamarpc.com"],
    blockExplorerUrls: ["https://etherscan.io"],
    iconPath: "/chains/ethereum.svg",
    color: "#627EEA",
    ecosystem: "Ethereum",
    isTestnet: false,
    description: "Ethereum mainnet.",
  },
  [CHAIN_IDS.BASE]: {
    id: CHAIN_IDS.BASE,
    name: "Base",
    shortName: "base",
    nativeCurrency: MOCK_NATIVE_ETH,
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
    iconPath: "/chains/base.svg",
    color: "#0052FF",
    ecosystem: "Coinbase",
    isTestnet: false,
    description: "Fast, secure, powered by Coinbase.",
  },
  [CHAIN_IDS.OPTIMISM]: {
    id: CHAIN_IDS.OPTIMISM,
    name: "Optimism",
    shortName: "optimism",
    nativeCurrency: MOCK_NATIVE_ETH,
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
    iconPath: "/chains/optimism.svg",
    color: "#FF0420",
    ecosystem: "Ethereum L2",
    isTestnet: false,
    description: "Ethereum Layer 2 with strong DeFi ecosystem.",
  },
  [CHAIN_IDS.MOONBEAM]: {
    id: CHAIN_IDS.MOONBEAM,
    name: "Moonbeam",
    shortName: "moonbeam",
    nativeCurrency: { name: "Glimmer", symbol: "GLMR", decimals: 18 },
    rpcUrls: ["https://rpc.api.moonbeam.network"],
    blockExplorerUrls: ["https://moonscan.io"],
    iconPath: "/chains/moonbeam.svg",
    color: "#53CBC8",
    ecosystem: "Polkadot",
    isTestnet: false,
    description: "Polkadot ecosystem with cross-chain compatibility.",
  },
  [CHAIN_IDS.ARBITRUM]: {
    id: CHAIN_IDS.ARBITRUM,
    name: "Arbitrum",
    shortName: "arb",
    chainType: "evm",
    nativeCurrency: MOCK_NATIVE_ETH,
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
    iconPath: "/chains/arbitrum.svg",
    color: "#28A0F0",
    ecosystem: "Ethereum L2",
    isTestnet: false,
    description: "Leading Ethereum L2.",
  },
  [CHAIN_IDS.POLYGON]: {
    id: CHAIN_IDS.POLYGON,
    name: "Polygon",
    shortName: "matic",
    chainType: "evm",
    nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
    rpcUrls: ["https://polygon-rpc.com"],
    blockExplorerUrls: ["https://polygonscan.com"],
    iconPath: "/chains/polygon.svg",
    color: "#8247E5",
    ecosystem: "Ethereum L2",
    isTestnet: false,
    description: "Scalable Ethereum sidechain.",
  },
  [CHAIN_IDS.AVALANCHE]: {
    id: CHAIN_IDS.AVALANCHE,
    name: "Avalanche",
    shortName: "avax",
    chainType: "evm",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://snowtrace.io"],
    iconPath: "/chains/avalanche.svg",
    color: "#E84142",
    ecosystem: "Avalanche",
    isTestnet: false,
    description: "High-throughput blockchain.",
  },
  [CHAIN_IDS.SOLANA_MAINNET]: {
    id: CHAIN_IDS.SOLANA_MAINNET,
    name: "Solana",
    shortName: "solana",
    chainType: "solana",
    nativeCurrency: { name: "SOL", symbol: "SOL", decimals: 9 },
    rpcUrls: ["https://api.mainnet-beta.solana.com"],
    blockExplorerUrls: ["https://explorer.solana.com"],
    iconPath: "/chains/solana.svg",
    color: "#9945FF",
    ecosystem: "Solana",
    isTestnet: false,
    description: "High-speed transactions with low fees.",
  },
  [CHAIN_IDS.POLKADOT]: {
    id: CHAIN_IDS.POLKADOT,
    name: "Polkadot",
    shortName: "polkadot",
    chainType: "polkadot",
    nativeCurrency: { name: "DOT", symbol: "DOT", decimals: 10 },
    rpcUrls: ["wss://rpc.polkadot.io"],
    blockExplorerUrls: ["https://polkadot.subscan.io"],
    iconPath: "/chains/polkadot.svg",
    color: "#E6007A",
    ecosystem: "Polkadot",
    isTestnet: false,
    description: "Secure cross-chain interoperability.",
  },
  [CHAIN_IDS.KUSAMA]: {
    id: CHAIN_IDS.KUSAMA,
    name: "Kusama",
    shortName: "kusama",
    chainType: "polkadot",
    nativeCurrency: { name: "KSM", symbol: "KSM", decimals: 12 },
    rpcUrls: ["wss://kusama-rpc.polkadot.io"],
    blockExplorerUrls: ["https://kusama.subscan.io"],
    iconPath: "/chains/kusama.svg",
    color: "#000000",
    ecosystem: "Polkadot",
    isTestnet: false,
    description: "Polkadot's canary network for innovation.",
  },
};

export const SUPPORTED_CHAIN_IDS = [
  CHAIN_IDS.ETHEREUM,
  CHAIN_IDS.BASE,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.MOONBEAM,
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.AVALANCHE,
  CHAIN_IDS.SOLANA_MAINNET,
  CHAIN_IDS.POLKADOT,
  CHAIN_IDS.KUSAMA,
];

export const TESTNET_CHAIN_IDS = [
  CHAIN_IDS.BASE_SEPOLIA,
  CHAIN_IDS.OPTIMISM_SEPOLIA,
  CHAIN_IDS.MOONBASE,
];

export const DEFAULT_CHAIN_ID = CHAIN_IDS.BASE;

/** Mock: returns chain config for a given chain ID */
export function getChainConfig(chainId) {
  return CHAIN_CONFIGS[chainId];
}

/** Mock: checks whether a chain ID is in the supported config map */
export function isChainSupported(chainId) {
  return chainId in CHAIN_CONFIGS;
}

/** Mock: returns available chain configs, optionally including testnets */
export function getAvailableChains(showTestnets) {
  const mainnetChains = SUPPORTED_CHAIN_IDS.map((id) => CHAIN_CONFIGS[id]);
  if (showTestnets) {
    const testnetChains = TESTNET_CHAIN_IDS.map((id) => CHAIN_CONFIGS[id]);
    return [...mainnetChains, ...testnetChains];
  }
  return mainnetChains;
}

// Dummy placeholder address used in test/dev environments
const DUMMY_ADDRESS = "0x1234567890123456789012345678901234567890";

export const CONTRACT_ADDRESSES = Object.fromEntries(
  [...SUPPORTED_CHAIN_IDS, ...TESTNET_CHAIN_IDS].map((id) => [
    id,
    {
      DONATION: DUMMY_ADDRESS,
      VERIFICATION: DUMMY_ADDRESS,
      TOKEN: DUMMY_ADDRESS,
    },
  ]),
);

/** Mock: returns a dummy contract address for any contract/chain pair. Exported as jest.fn() so tests can override per-test. */
import { jest } from "@jest/globals";
export const getContractAddress = jest.fn().mockReturnValue(DUMMY_ADDRESS);

// Re-export network constants (used by some tests)
export const SUPPORTED_NETWORKS = {
  POLKADOT: "polkadot",
  KUSAMA: "kusama",
  WESTEND: "westend",
  ROCOCO: "rococo",
  MOONBASE: "moonbase",
  LOCAL: "local",
};

export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.MOONBASE;
