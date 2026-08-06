import {
  getChainContractAddresses,
  type ChainContractAddresses,
} from "@/config/env";

/** Map of network identifiers supported by the application. */
export const SUPPORTED_NETWORKS = {
  LOCAL: "local",
} as const;

/** Default network used when no network is configured. */
export const DEFAULT_NETWORK = SUPPORTED_NETWORKS.LOCAL;

/** WebSocket RPC endpoints indexed by network identifier. */
export const NETWORK_ENDPOINTS = {
  [SUPPORTED_NETWORKS.LOCAL]: "ws://127.0.0.1:9944",
} as const;

/** Numeric EVM chain IDs for all supported networks. */
export const CHAIN_IDS = {
  // Testnets
  BASE_SEPOLIA: 84532,
  OPTIMISM_SEPOLIA: 11155420,
  // EVM Mainnets
  ETHEREUM: 1,
  BASE: 8453,
  OPTIMISM: 10,
  ARBITRUM: 42161,
  POLYGON: 137,
  AVALANCHE: 43114,
  // Non-EVM Mainnets (synthetic IDs for unified chain selection)
  SOLANA_MAINNET: 900001,
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
  chainType: "evm" | "solana";
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
  // ========== MAINNETS ==========
  [CHAIN_IDS.ETHEREUM]: {
    id: CHAIN_IDS.ETHEREUM,
    name: "Ethereum",
    shortName: "eth",
    chainType: "evm",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://eth.llamarpc.com", "https://rpc.ankr.com/eth"],
    blockExplorerUrls: ["https://etherscan.io"],
    iconPath: "/chains/ethereum.svg",
    color: "#627EEA",
    ecosystem: "Ethereum",
    isTestnet: false,
    description: "Ethereum mainnet - the original smart contract platform.",
  },
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
  [CHAIN_IDS.ARBITRUM]: {
    id: CHAIN_IDS.ARBITRUM,
    name: "Arbitrum",
    shortName: "arb",
    chainType: "evm",
    nativeCurrency: { name: "Ethereum", symbol: "ETH", decimals: 18 },
    rpcUrls: ["https://arb1.arbitrum.io/rpc"],
    blockExplorerUrls: ["https://arbiscan.io"],
    iconPath: "/chains/arbitrum.svg",
    color: "#28A0F0",
    ecosystem: "Ethereum L2",
    isTestnet: false,
    description: "Leading Ethereum L2 with high throughput and low fees.",
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
    description: "Scalable Ethereum sidechain with low transaction costs.",
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
    description: "High-throughput blockchain with low fees.",
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
};

/**
 * Primary supported chains for Give Protocol
 */
export const SUPPORTED_CHAIN_IDS: ChainId[] = [
  CHAIN_IDS.ETHEREUM,
  CHAIN_IDS.BASE,
  CHAIN_IDS.OPTIMISM,
  CHAIN_IDS.ARBITRUM,
  CHAIN_IDS.POLYGON,
  CHAIN_IDS.AVALANCHE,
  CHAIN_IDS.SOLANA_MAINNET,
];

/**
 * Testnet chain IDs
 */
export const TESTNET_CHAIN_IDS: ChainId[] = [
  CHAIN_IDS.BASE_SEPOLIA,
  CHAIN_IDS.OPTIMISM_SEPOLIA,
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

// Contract addresses loaded from environment variables per chain
/** Contract addresses for all supported chains, keyed by chain ID. */
export const CONTRACT_ADDRESSES: Record<ChainId, ChainContractAddresses> = {
  // Testnets
  [CHAIN_IDS.BASE_SEPOLIA]: getChainContractAddresses(CHAIN_IDS.BASE_SEPOLIA),
  [CHAIN_IDS.OPTIMISM_SEPOLIA]: getChainContractAddresses(
    CHAIN_IDS.OPTIMISM_SEPOLIA,
  ),
  // Mainnets
  [CHAIN_IDS.ETHEREUM]: getChainContractAddresses(CHAIN_IDS.ETHEREUM),
  [CHAIN_IDS.BASE]: getChainContractAddresses(CHAIN_IDS.BASE),
  [CHAIN_IDS.OPTIMISM]: getChainContractAddresses(CHAIN_IDS.OPTIMISM),
  [CHAIN_IDS.ARBITRUM]: getChainContractAddresses(CHAIN_IDS.ARBITRUM),
  [CHAIN_IDS.POLYGON]: getChainContractAddresses(CHAIN_IDS.POLYGON),
  [CHAIN_IDS.AVALANCHE]: getChainContractAddresses(CHAIN_IDS.AVALANCHE),
  // Non-EVM chains (no contract addresses)
  [CHAIN_IDS.SOLANA_MAINNET]: {
    DONATION: undefined,
    VERIFICATION: undefined,
    DISTRIBUTION: undefined,
    PORTFOLIO_FUNDS: undefined,
    EXECUTOR: undefined,
    TOKEN: undefined,
  },
};

/**
 * Check if a chain has donation contracts deployed (DONATION address configured).
 */
export function hasDeployedContracts(chainId: ChainId): boolean {
  const addresses = CONTRACT_ADDRESSES[chainId];
  return Boolean(addresses?.DONATION);
}

/**
 * Get available chains based on environment.
 * Only includes mainnet chains that have deployed donation contracts,
 * preventing donors from selecting chains where donations would fail.
 */
export function getAvailableChains(showTestnets: boolean): ChainConfig[] {
  const mainnetChains = SUPPORTED_CHAIN_IDS.filter((id) =>
    hasDeployedContracts(id),
  ).map((id) => CHAIN_CONFIGS[id]);
  if (showTestnets) {
    const testnetChains = TESTNET_CHAIN_IDS.map((id) => CHAIN_CONFIGS[id]);
    return [...mainnetChains, ...testnetChains];
  }
  return mainnetChains;
}

/**
 * Get contract address for a specific contract on a specific chain
 * @param contractName - The contract name (DONATION, VERIFICATION, etc.)
 * @param chainId - The chain ID
 * @returns The contract address string
 */
export function getContractAddress(
  contractName: keyof ChainContractAddresses,
  chainId: ChainId = CHAIN_IDS.BASE,
): string {
  const addresses = CONTRACT_ADDRESSES[chainId];
  if (!addresses) {
    throw new Error(`No contract addresses found for chain ID ${chainId}`);
  }

  const address = addresses[contractName];
  if (!address) {
    const nodeEnv =
      typeof process !== "undefined" ? process.env?.NODE_ENV : undefined;
    const chainConfig = CHAIN_CONFIGS[chainId];
    const isTestnetChain = chainConfig?.isTestnet === true;
    if (isTestnetChain || nodeEnv === "test") {
      // skipcq: SCT-A000 - This is a placeholder development Ethereum address, not a real secret
      return "0x1234567890123456789012345678901234567890";
    }
    throw new Error(
      `${contractName} contract not deployed on chain ID ${chainId}`,
    );
  }

  return address;
}
