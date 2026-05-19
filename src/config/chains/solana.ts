/**
 * Solana Cluster Configurations for Give Protocol
 * Supports mainnet-beta, devnet, and testnet clusters
 */

import type { SolanaClusterConfig } from "@/types/chains";

/**
 * Solana Cluster IDs
 */
export const SOLANA_CLUSTERS = {
  MAINNET: "mainnet-beta",
  DEVNET: "devnet",
  TESTNET: "testnet",
  LOCALNET: "localnet",
} as const;

/** Union type of all supported Solana cluster IDs. */
export type SolanaClusterId =
  (typeof SOLANA_CLUSTERS)[keyof typeof SOLANA_CLUSTERS];

/**
 * Full Solana cluster configurations
 */
export const SOLANA_CLUSTER_CONFIGS: Record<
  SolanaClusterId,
  SolanaClusterConfig
> = {
  [SOLANA_CLUSTERS.MAINNET]: {
    type: "solana",
    id: SOLANA_CLUSTERS.MAINNET,
    cluster: "mainnet-beta",
    name: "Solana Mainnet",
    shortName: "solana",
    rpcUrl: "https://api.mainnet-beta.solana.com",
    wsUrl: "wss://api.mainnet-beta.solana.com",
    explorerUrl: "https://explorer.solana.com",
    iconPath: "/chains/solana.svg",
    color: "#9945FF",
    isTestnet: false,
    description: "Solana mainnet for production transactions.",
  },
  [SOLANA_CLUSTERS.DEVNET]: {
    type: "solana",
    id: SOLANA_CLUSTERS.DEVNET,
    cluster: "devnet",
    name: "Solana Devnet",
    shortName: "devnet",
    rpcUrl: "https://api.devnet.solana.com",
    wsUrl: "wss://api.devnet.solana.com",
    explorerUrl: "https://explorer.solana.com?cluster=devnet",
    iconPath: "/chains/solana.svg",
    color: "#9945FF",
    isTestnet: true,
    description: "Solana devnet for development and testing.",
  },
  [SOLANA_CLUSTERS.TESTNET]: {
    type: "solana",
    id: SOLANA_CLUSTERS.TESTNET,
    cluster: "testnet",
    name: "Solana Testnet",
    shortName: "testnet",
    rpcUrl: "https://api.testnet.solana.com",
    wsUrl: "wss://api.testnet.solana.com",
    explorerUrl: "https://explorer.solana.com?cluster=testnet",
    iconPath: "/chains/solana.svg",
    color: "#9945FF",
    isTestnet: true,
    description: "Solana testnet for integration testing.",
  },
  [SOLANA_CLUSTERS.LOCALNET]: {
    type: "solana",
    id: SOLANA_CLUSTERS.LOCALNET,
    cluster: "localnet",
    name: "Solana Localnet",
    shortName: "local",
    rpcUrl: "http://localhost:8899",
    wsUrl: "ws://localhost:8900",
    explorerUrl: "https://explorer.solana.com?cluster=custom",
    iconPath: "/chains/solana.svg",
    color: "#9945FF",
    isTestnet: true,
    description: "Local Solana validator for development.",
  },
};

/**
 * Production Solana clusters
 */
export const SUPPORTED_SOLANA_CLUSTERS: SolanaClusterId[] = [
  SOLANA_CLUSTERS.MAINNET,
];

/**
 * Testnet Solana clusters
 */
export const TESTNET_SOLANA_CLUSTERS: SolanaClusterId[] = [
  SOLANA_CLUSTERS.DEVNET,
  SOLANA_CLUSTERS.TESTNET,
];

/**
 * Default Solana cluster for new users
 */
export const DEFAULT_SOLANA_CLUSTER = SOLANA_CLUSTERS.DEVNET;

/**
 * Get Solana cluster config by ID
 * @param clusterId - Cluster ID to look up
 * @returns Cluster config or undefined
 */
export function getSolanaClusterConfig(
  clusterId: string,
): SolanaClusterConfig | undefined {
  return SOLANA_CLUSTER_CONFIGS[clusterId as SolanaClusterId];
}

/**
 * Check if Solana cluster is supported
 * @param clusterId - Cluster ID to check
 * @returns True if supported
 */
export function isSolanaClusterSupported(clusterId: string): boolean {
  return clusterId in SOLANA_CLUSTER_CONFIGS;
}

/**
 * Get available Solana clusters based on testnet setting
 * @param showTestnets - Whether to include testnets
 * @returns Array of cluster configs
 */
export function getAvailableSolanaClusters(
  showTestnets: boolean,
): SolanaClusterConfig[] {
  const mainnetClusters = SUPPORTED_SOLANA_CLUSTERS.map(
    (id) => SOLANA_CLUSTER_CONFIGS[id],
  );
  if (showTestnets) {
    const testnetClusters = TESTNET_SOLANA_CLUSTERS.map(
      (id) => SOLANA_CLUSTER_CONFIGS[id],
    );
    return [...mainnetClusters, ...testnetClusters];
  }
  return mainnetClusters;
}

/**
 * Get Solana explorer URL for a transaction or address
 * @param clusterId - Cluster ID
 * @param type - Type of entity ("tx" or "address")
 * @param value - Transaction signature or address
 * @returns Full explorer URL
 */
export function getSolanaExplorerUrl(
  clusterId: string,
  type: "tx" | "address",
  value: string,
): string {
  const config = getSolanaClusterConfig(clusterId);
  if (!config) return "";

  const baseUrl = "https://explorer.solana.com";
  const clusterParam =
    clusterId === SOLANA_CLUSTERS.MAINNET ? "" : `?cluster=${clusterId}`;

  return `${baseUrl}/${type}/${value}${clusterParam}`;
}
