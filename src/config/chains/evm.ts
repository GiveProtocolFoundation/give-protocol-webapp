/**
 * EVM Chain Configurations for Give Protocol
 * Supports Base, Optimism, Moonbeam, and Avalanche chains
 */

import type { EVMChainConfig } from "@/types/chains";

/**
 * EVM Chain ID constants
 */
export const EVM_CHAIN_IDS = {
  // Testnets
  BASE_SEPOLIA: 84532,
  OPTIMISM_SEPOLIA: 11155420,
  MOONBASE: 1287,
  AVALANCHE_FUJI: 43113,
  // Mainnets
  ETHEREUM: 1,
  BASE: 8453,
  OPTIMISM: 10,
  MOONBEAM: 1284,
  AVALANCHE: 43114,
} as const;

/** Union type of all supported EVM chain IDs. */
export type EVMChainId = (typeof EVM_CHAIN_IDS)[keyof typeof EVM_CHAIN_IDS];

/**
 * Full EVM chain configurations
 */
export const EVM_CHAIN_CONFIGS: Record<EVMChainId, EVMChainConfig> = {
  // ========== TESTNETS ==========
  [EVM_CHAIN_IDS.BASE_SEPOLIA]: {
    type: "evm",
    id: EVM_CHAIN_IDS.BASE_SEPOLIA,
    name: "Base Sepolia",
    shortName: "base-sepolia",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
    iconPath: "/chains/base.svg",
    color: "#0052FF",
    ecosystem: "Coinbase",
    isTestnet: true,
    description: "Base testnet for development and testing.",
  },
  [EVM_CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    type: "evm",
    id: EVM_CHAIN_IDS.OPTIMISM_SEPOLIA,
    name: "Optimism Sepolia",
    shortName: "op-sepolia",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia.optimism.io"],
    blockExplorerUrls: ["https://sepolia-optimistic.etherscan.io"],
    iconPath: "/chains/optimism.svg",
    color: "#FF0420",
    ecosystem: "Ethereum L2",
    isTestnet: true,
    description: "Optimism testnet for development and testing.",
  },
  [EVM_CHAIN_IDS.MOONBASE]: {
    type: "evm",
    id: EVM_CHAIN_IDS.MOONBASE,
    name: "Moonbase Alpha",
    shortName: "moonbase",
    nativeCurrency: { name: "DEV", symbol: "DEV", decimals: 18 },
    rpcUrls: ["https://rpc.api.moonbase.moonbeam.network"],
    blockExplorerUrls: ["https://moonbase.moonscan.io"],
    iconPath: "/chains/moonbeam.svg",
    color: "#53CBC8",
    ecosystem: "Polkadot",
    isTestnet: true,
    description: "Moonbeam testnet for development and testing.",
  },
  [EVM_CHAIN_IDS.AVALANCHE_FUJI]: {
    type: "evm",
    id: EVM_CHAIN_IDS.AVALANCHE_FUJI,
    name: "Avalanche Fuji",
    shortName: "fuji",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    rpcUrls: ["https://api.avax-test.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://testnet.snowtrace.io"],
    iconPath: "/chains/avalanche.svg",
    color: "#E84142",
    ecosystem: "Avalanche",
    isTestnet: true,
    description: "Avalanche testnet for development and testing.",
  },

  // ========== MAINNETS ==========
  [EVM_CHAIN_IDS.ETHEREUM]: {
    type: "evm",
    id: EVM_CHAIN_IDS.ETHEREUM,
    name: "Ethereum",
    shortName: "eth",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    blockExplorerUrls: ["https://etherscan.io"],
    iconPath: "/chains/ethereum.svg",
    color: "#627EEA",
    ecosystem: "Ethereum",
    isTestnet: false,
    description: "Ethereum mainnet - the original smart contract platform.",
  },
  [EVM_CHAIN_IDS.BASE]: {
    type: "evm",
    id: EVM_CHAIN_IDS.BASE,
    name: "Base",
    shortName: "base",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
    iconPath: "/chains/base.svg",
    color: "#0052FF",
    ecosystem: "Coinbase",
    isTestnet: false,
    description: "Fast, secure, and powered by Coinbase.",
  },
  [EVM_CHAIN_IDS.OPTIMISM]: {
    type: "evm",
    id: EVM_CHAIN_IDS.OPTIMISM,
    name: "Optimism",
    shortName: "optimism",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.optimism.io"],
    blockExplorerUrls: ["https://optimistic.etherscan.io"],
    iconPath: "/chains/optimism.svg",
    color: "#FF0420",
    ecosystem: "Ethereum L2",
    isTestnet: false,
    description: "Ethereum Layer 2 with strong DeFi ecosystem.",
  },
  [EVM_CHAIN_IDS.MOONBEAM]: {
    type: "evm",
    id: EVM_CHAIN_IDS.MOONBEAM,
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
  [EVM_CHAIN_IDS.AVALANCHE]: {
    type: "evm",
    id: EVM_CHAIN_IDS.AVALANCHE,
    name: "Avalanche",
    shortName: "avax",
    nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
    rpcUrls: ["https://api.avax.network/ext/bc/C/rpc"],
    blockExplorerUrls: ["https://snowtrace.io"],
    iconPath: "/chains/avalanche.svg",
    color: "#E84142",
    ecosystem: "Avalanche",
    isTestnet: false,
    description: "High-throughput blockchain with low fees.",
  },
};

/**
 * Primary supported EVM chains for Give Protocol
 */
export const SUPPORTED_EVM_CHAIN_IDS: EVMChainId[] = [
  EVM_CHAIN_IDS.BASE,
  EVM_CHAIN_IDS.OPTIMISM,
  EVM_CHAIN_IDS.MOONBEAM,
  EVM_CHAIN_IDS.AVALANCHE,
];

/**
 * Testnet EVM chain IDs
 */
export const TESTNET_EVM_CHAIN_IDS: EVMChainId[] = [
  EVM_CHAIN_IDS.BASE_SEPOLIA,
  EVM_CHAIN_IDS.OPTIMISM_SEPOLIA,
  EVM_CHAIN_IDS.MOONBASE,
  EVM_CHAIN_IDS.AVALANCHE_FUJI,
];

/**
 * Default EVM chain for new users
 */
export const DEFAULT_EVM_CHAIN_ID = EVM_CHAIN_IDS.BASE;

/**
 * Get EVM chain config by ID
 * @param chainId - Chain ID to look up
 * @returns Chain config or undefined
 */
export function getEVMChainConfig(chainId: number): EVMChainConfig | undefined {
  return EVM_CHAIN_CONFIGS[chainId as EVMChainId];
}

/**
 * Check if EVM chain ID is supported
 * @param chainId - Chain ID to check
 * @returns True if supported
 */
export function isEVMChainSupported(chainId: number): boolean {
  return chainId in EVM_CHAIN_CONFIGS;
}

/**
 * Get available EVM chains based on testnet setting
 * @param showTestnets - Whether to include testnets
 * @returns Array of chain configs
 */
export function getAvailableEVMChains(showTestnets: boolean): EVMChainConfig[] {
  const mainnetChains = SUPPORTED_EVM_CHAIN_IDS.map(
    (id) => EVM_CHAIN_CONFIGS[id],
  );
  if (showTestnets) {
    const testnetChains = TESTNET_EVM_CHAIN_IDS.map(
      (id) => EVM_CHAIN_CONFIGS[id],
    );
    return [...mainnetChains, ...testnetChains];
  }
  return mainnetChains;
}

/**
 * Build wallet_addEthereumChain params from config
 * @param chainId - Chain ID
 * @returns Chain params or null if unsupported
 */
export function getEVMChainParams(chainId: number) {
  const config = getEVMChainConfig(chainId);
  if (!config) return null;

  return {
    chainId: `0x${chainId.toString(16)}`,
    chainName: config.name,
    nativeCurrency: config.nativeCurrency,
    rpcUrls: config.rpcUrls,
    blockExplorerUrls: config.blockExplorerUrls,
  };
}
