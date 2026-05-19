/**
 * Polkadot/Substrate Chain Configurations for Give Protocol
 * Supports Polkadot, Kusama, Westend, and parachains
 */

import type { PolkadotChainConfig } from "@/types/chains";

/**
 * Polkadot Chain IDs
 */
export const POLKADOT_CHAINS = {
  POLKADOT: "polkadot",
  KUSAMA: "kusama",
  WESTEND: "westend",
  ROCOCO: "rococo",
  MOONBEAM: "moonbeam-polkadot",
  MOONRIVER: "moonriver-kusama",
} as const;

/** Union type of all supported Polkadot/Substrate chain ID strings. */
export type PolkadotChainId = (typeof POLKADOT_CHAINS)[keyof typeof POLKADOT_CHAINS];

/**
 * Full Polkadot chain configurations
 */
export const POLKADOT_CHAIN_CONFIGS: Record<PolkadotChainId, PolkadotChainConfig> = {
  [POLKADOT_CHAINS.POLKADOT]: {
    type: "polkadot",
    id: POLKADOT_CHAINS.POLKADOT,
    name: "Polkadot",
    shortName: "dot",
    ss58Prefix: 0,
    wsEndpoint: "wss://rpc.polkadot.io",
    nativeToken: { name: "DOT", symbol: "DOT", decimals: 10 },
    explorerUrl: "https://polkadot.subscan.io",
    iconPath: "/chains/polkadot.svg",
    color: "#E6007A",
    isTestnet: false,
    description: "Polkadot relay chain - the heart of the ecosystem.",
  },
  [POLKADOT_CHAINS.KUSAMA]: {
    type: "polkadot",
    id: POLKADOT_CHAINS.KUSAMA,
    name: "Kusama",
    shortName: "ksm",
    ss58Prefix: 2,
    wsEndpoint: "wss://kusama-rpc.polkadot.io",
    nativeToken: { name: "KSM", symbol: "KSM", decimals: 12 },
    explorerUrl: "https://kusama.subscan.io",
    iconPath: "/chains/kusama.svg",
    color: "#000000",
    isTestnet: false,
    description: "Kusama canary network - Polkadot's wild cousin.",
    relayChain: "kusama",
  },
  [POLKADOT_CHAINS.WESTEND]: {
    type: "polkadot",
    id: POLKADOT_CHAINS.WESTEND,
    name: "Westend",
    shortName: "wnd",
    ss58Prefix: 42,
    wsEndpoint: "wss://westend-rpc.polkadot.io",
    nativeToken: { name: "WND", symbol: "WND", decimals: 12 },
    explorerUrl: "https://westend.subscan.io",
    iconPath: "/chains/westend.svg",
    color: "#DA68A6",
    isTestnet: true,
    description: "Westend testnet for Polkadot development.",
    relayChain: "westend",
  },
  [POLKADOT_CHAINS.ROCOCO]: {
    type: "polkadot",
    id: POLKADOT_CHAINS.ROCOCO,
    name: "Rococo",
    shortName: "roc",
    ss58Prefix: 42,
    wsEndpoint: "wss://rococo-rpc.polkadot.io",
    nativeToken: { name: "ROC", symbol: "ROC", decimals: 12 },
    explorerUrl: "https://rococo.subscan.io",
    iconPath: "/chains/rococo.svg",
    color: "#6F3AFA",
    isTestnet: true,
    description: "Rococo parachain testnet.",
    relayChain: "rococo",
  },
  [POLKADOT_CHAINS.MOONBEAM]: {
    type: "polkadot",
    id: POLKADOT_CHAINS.MOONBEAM,
    name: "Moonbeam (Polkadot)",
    shortName: "moonbeam",
    ss58Prefix: 1284,
    wsEndpoint: "wss://wss.api.moonbeam.network",
    nativeToken: { name: "Glimmer", symbol: "GLMR", decimals: 18 },
    explorerUrl: "https://moonbeam.subscan.io",
    iconPath: "/chains/moonbeam.svg",
    color: "#53CBC8",
    isTestnet: false,
    description: "Moonbeam parachain on Polkadot.",
    parachainId: 2004,
    relayChain: "polkadot",
  },
  [POLKADOT_CHAINS.MOONRIVER]: {
    type: "polkadot",
    id: POLKADOT_CHAINS.MOONRIVER,
    name: "Moonriver (Kusama)",
    shortName: "moonriver",
    ss58Prefix: 1285,
    wsEndpoint: "wss://wss.api.moonriver.moonbeam.network",
    nativeToken: { name: "MOVR", symbol: "MOVR", decimals: 18 },
    explorerUrl: "https://moonriver.subscan.io",
    iconPath: "/chains/moonriver.svg",
    color: "#F2B705",
    isTestnet: false,
    description: "Moonriver parachain on Kusama.",
    parachainId: 2023,
    relayChain: "kusama",
  },
};

/**
 * Production Polkadot chains
 */
export const SUPPORTED_POLKADOT_CHAINS: PolkadotChainId[] = [
  POLKADOT_CHAINS.POLKADOT,
  POLKADOT_CHAINS.KUSAMA,
  POLKADOT_CHAINS.MOONBEAM,
  POLKADOT_CHAINS.MOONRIVER,
];

/**
 * Testnet Polkadot chains
 */
export const TESTNET_POLKADOT_CHAINS: PolkadotChainId[] = [
  POLKADOT_CHAINS.WESTEND,
  POLKADOT_CHAINS.ROCOCO,
];

/**
 * Default Polkadot chain for new users
 */
export const DEFAULT_POLKADOT_CHAIN = POLKADOT_CHAINS.POLKADOT;

/**
 * Get Polkadot chain config by ID
 * @param chainId - Chain ID to look up
 * @returns Chain config or undefined
 */
export function getPolkadotChainConfig(
  chainId: string
): PolkadotChainConfig | undefined {
  return POLKADOT_CHAIN_CONFIGS[chainId as PolkadotChainId];
}

/**
 * Check if Polkadot chain is supported
 * @param chainId - Chain ID to check
 * @returns True if supported
 */
export function isPolkadotChainSupported(chainId: string): boolean {
  return chainId in POLKADOT_CHAIN_CONFIGS;
}

/**
 * Get available Polkadot chains based on testnet setting
 * @param showTestnets - Whether to include testnets
 * @returns Array of chain configs
 */
export function getAvailablePolkadotChains(
  showTestnets: boolean
): PolkadotChainConfig[] {
  const mainnetChains = SUPPORTED_POLKADOT_CHAINS.map(
    (id) => POLKADOT_CHAIN_CONFIGS[id]
  );
  if (showTestnets) {
    const testnetChains = TESTNET_POLKADOT_CHAINS.map(
      (id) => POLKADOT_CHAIN_CONFIGS[id]
    );
    return [...mainnetChains, ...testnetChains];
  }
  return mainnetChains;
}

/**
 * Get Polkadot explorer URL for an address or extrinsic
 * @param chainId - Chain ID
 * @param type - Type of entity ("account" or "extrinsic")
 * @param value - Address or extrinsic hash
 * @returns Full explorer URL
 */
export function getPolkadotExplorerUrl(
  chainId: string,
  type: "account" | "extrinsic",
  value: string
): string {
  const config = getPolkadotChainConfig(chainId);
  if (!config) return "";

  return `${config.explorerUrl}/${type}/${value}`;
}

/**
 * Convert address to SS58 format for a specific chain
 * Note: Requires @polkadot/util-crypto to be imported at runtime
 * @param address - Address to convert
 * @param chainId - Target chain ID
 * @returns SS58 formatted address
 */
export function getChainSS58Prefix(chainId: string): number {
  const config = getPolkadotChainConfig(chainId);
  return config?.ss58Prefix ?? 42;
}
