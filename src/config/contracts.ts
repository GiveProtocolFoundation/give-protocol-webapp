import {
  getChainContractAddresses,
  type ChainContractAddresses,
} from "@/config/env";

/** Map of network identifiers supported by the application. */
export const SUPPORTED_NETWORKS = {
  POLKADOT: "polkadot",
  KUSAMA: "kusama",
  WESTEND: "westend",
  ROCOCO: "rococo",
  MOONBASE: "moonbase",
  LOCAL: "local",
} as const;

// Change default to Moonbase Alpha
/** Default network used when no network is configured. */
export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.MOONBASE;

/** WebSocket RPC endpoints indexed by network identifier. */
export const NETWORK_ENDPOINTS = {
  [SUPPORTED_NETWORKS.LOCAL]: "ws://127.0.0.1:9944",
  [SUPPORTED_NETWORKS.WESTEND]: "wss://westend-rpc.polkadot.io",
  [SUPPORTED_NETWORKS.ROCOCO]: "wss://rococo-rpc.polkadot.io",
  [SUPPORTED_NETWORKS.KUSAMA]: "wss://kusama-rpc.polkadot.io",
  [SUPPORTED_NETWORKS.POLKADOT]: "wss://rpc.polkadot.io",
  [SUPPORTED_NETWORKS.MOONBASE]: "wss://wss.api.moonbase.moonbeam.network",
} as const;

/** Numeric EVM chain IDs for all supported networks. */
export const CHAIN_IDS = {
  // Testnets
  BASE_SEPOLIA: 84532,
  OPTIMISM_SEPOLIA: 11155420,
  MOONBASE: 1287,
  // EVM Mainnets
  BASE: 8453,
  OPTIMISM: 10,
  MOONBEAM: 1284,
  // Non-EVM Mainnets (synthetic IDs for unified chain selection)
  SOLANA_MAINNET: 900001,
  POLKADOT: 900002,
  KUSAMA: 900003,
} as const;

/** Union type of all numeric chain IDs defined in CHAIN_IDS. */
export type ChainId = (typeof CHAIN_IDS)[keyof typeof CHAIN_IDS];

/**
 * Chain configuration for UI and wallet interactions
 */
export interface ChainConfig {
  id: ChainId;
  name: string;
  shortName: string;
  chainType: "evm" | "solana" | "polkadot";
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
  iconPath: string;
  color: string;
  ecosystem: string;
  isTestnet: boolean;
  description: string;
}

/**
 * Full chain configurations for supported networks
 */
export const CHAIN_CONFIGS: Record<ChainId, ChainConfig> = {
  // ========== TESTNETS ==========
  [CHAIN_IDS.BASE_SEPOLIA]: {
    id: CHAIN_IDS.BASE_SEPOLIA,
    name: "Base Sepolia",
    shortName: "base-sepolia",
    chainType: "evm",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia.base.org"],
    blockExplorerUrls: ["https://sepolia.basescan.org"],
    iconPath: "/chains/base.svg",
    color: "#0052FF",
    ecosystem: "Coinbase",
    isTestnet: true,
    description: "Base testnet for development and testing.",
  },
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: {
    id: CHAIN_IDS.OPTIMISM_SEPOLIA,
    name: "Optimism Sepolia",
    shortName: "op-sepolia",
    chainType: "evm",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://sepolia.optimism.io"],
    blockExplorerUrls: ["https://sepolia-optimistic.etherscan.io"],
    iconPath: "/chains/optimism.svg",
    color: "#FF0420",
    ecosystem: "Ethereum L2",
    isTestnet: true,
    description: "Optimism testnet for development and testing.",
  },
  [CHAIN_IDS.MOONBASE]: {
    id: CHAIN_IDS.MOONBASE,
    name: "Moonbase Alpha",
    shortName: "moonbase",
    chainType: "evm",
    nativeCurrency: { name: "DEV", symbol: "DEV", decimals: 18 },
    rpcUrls: ["https://rpc.api.moonbase.moonbeam.network"],
    blockExplorerUrls: ["https://moonbase.moonscan.io"],
    iconPath: "/chains/moonbeam.svg",
    color: "#53CBC8",
    ecosystem: "Polkadot",
    isTestnet: true,
    description: "Moonbeam testnet for development and testing.",
  },

  // ========== MAINNETS ==========
  [CHAIN_IDS.BASE]: {
    id: CHAIN_IDS.BASE,
    name: "Base",
    shortName: "base",
    chainType: "evm",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://mainnet.base.org"],
    blockExplorerUrls: ["https://basescan.org"],
    iconPath: "/chains/base.svg",
    color: "#0052FF",
    ecosystem: "Coinbase",
    isTestnet: false,
    description: "Fast, secure, and powered by Coinbase.",
  },
  [CHAIN_IDS.OPTIMISM]: {
    id: CHAIN_IDS.OPTIMISM,
    name: "Optimism",
    shortName: "optimism",
    chainType: "evm",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
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
    chainType: "evm",
    nativeCurrency: { name: "Glimmer", symbol: "GLMR", decimals: 18 },
    rpcUrls: ["https://rpc.api.moonbeam.network"],
    blockExplorerUrls: ["https://moonscan.io"],
    iconPath: "/chains/moonbeam.svg",
    color: "#53CBC8",
    ecosystem: "Polkadot",
    isTestnet: false,
    description: "Polkadot ecosystem with cross-chain compatibility.",
  },

  // ========== NON-EVM MAINNETS ==========
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

/**
 * Primary supported chains for Give Protocol
 */
export const SUPPORTED_CHAIN_IDS: ChainId[] = [
  CHAIN_IDS.BASE,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.MOONBEAM,
  CHAIN_IDS.SOLANA_MAINNET,
  CHAIN_IDS.POLKADOT,
  CHAIN_IDS.KUSAMA,
];

/**
 * Testnet chain IDs
 */
export const TESTNET_CHAIN_IDS: ChainId[] = [
  CHAIN_IDS.BASE_SEPOLIA,
  CHAIN_IDS.OPTIMISM_SEPOLIA,
  CHAIN_IDS.MOONBASE,
];

/**
 * Default chain for new users
 */
export const DEFAULT_CHAIN_ID = CHAIN_IDS.BASE;

/**
 * Get chain config by ID
 */
export function getChainConfig(chainId: ChainId): ChainConfig | undefined {
  return CHAIN_CONFIGS[chainId];
}

/**
 * Check if chain is supported
 */
export function isChainSupported(chainId: number): boolean {
  return chainId in CHAIN_CONFIGS;
}

/**
 * Get available chains based on environment
 */
export function getAvailableChains(showTestnets: boolean): ChainConfig[] {
  const mainnetChains = SUPPORTED_CHAIN_IDS.map((id) => CHAIN_CONFIGS[id]);
  if (showTestnets) {
    const testnetChains = TESTNET_CHAIN_IDS.map((id) => CHAIN_CONFIGS[id]);
    return [...mainnetChains, ...testnetChains];
  }
  return mainnetChains;
}

// Contract addresses loaded from environment variables per chain
/** Contract addresses for all supported chains, keyed by chain ID. */
export const CONTRACT_ADDRESSES: Record<ChainId, ChainContractAddresses> = {
  // Testnets
  [CHAIN_IDS.BASE_SEPOLIA]: getChainContractAddresses(CHAIN_IDS.BASE_SEPOLIA),
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: getChainContractAddresses(
    CHAIN_IDS.OPTIMISM_SEPOLIA,
  ),
  [CHAIN_IDS.MOONBASE]: getChainContractAddresses(CHAIN_IDS.MOONBASE),
  // Mainnets
  [CHAIN_IDS.BASE]: getChainContractAddresses(CHAIN_IDS.BASE),
  [CHAIN_IDS.OPTIMISM]: getChainContractAddresses(CHAIN_IDS.OPTIMISM),
  [CHAIN_IDS.MOONBEAM]: getChainContractAddresses(CHAIN_IDS.MOONBEAM),
};

/**
 * Get contract address for a specific contract on a specific chain
 * @param contractName - The contract name (DONATION, VERIFICATION, etc.)
 * @param chainId - The chain ID (defaults to Moonbase for backward compat)
 * @returns The contract address string
 */
export function getContractAddress(
  contractName: keyof ChainContractAddresses,
  chainId: ChainId = CHAIN_IDS.MOONBASE,
): string {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`No contract addresses found for chain ID ${chainId}`);
  }

  const address = addresses[contractName];
  if (!address) {
    // For development/test environments, return a dummy address
    const nodeEnv =
      typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
    if (nodeEnv !== "production") {
      // skipcq: SCT-A000 - This is a placeholder development Ethereum address, not a real secret
      return "0x1234567890123456789012345678901234567890";
    }
    throw new Error(
      `${contractName} contract not deployed on chain ID ${chainId}`,
    );
  }

  return address;
}
