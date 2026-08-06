/**
 * Multi-chain configuration types for Give Protocol
 * Supports EVM and Solana chain families
 */

import type { ChainType } from "./wallet";

/**
 * Base chain configuration shared across all chain types
 */
export interface BaseChainConfig {
  /** Unique chain identifier */
  id: number | string;
  /** Chain type */
  type: ChainType;
  /** Human-readable chain name */
  name: string;
  /** Short chain name/slug */
  shortName: string;
  /** Whether this is a testnet */
  isTestnet: boolean;
  /** Path to chain icon */
  iconPath: string;
  /** Primary brand color */
  color: string;
  /** Chain description */
  description: string;
}

/**
 * Native currency configuration
 */
export interface NativeCurrency {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * EVM-specific chain configuration
 */
export interface EVMChainConfig extends BaseChainConfig {
  type: "evm";
  id: number;
  /** Native currency details */
  nativeCurrency: NativeCurrency;
  /** RPC endpoint URLs */
  rpcUrls: string[];
  /** Block explorer URLs */
  blockExplorerUrls: string[];
  /** Ecosystem identifier (e.g., "Ethereum L2", "Coinbase") */
  ecosystem: string;
}

/**
 * Solana cluster configuration
 */
export interface SolanaClusterConfig extends BaseChainConfig {
  type: "solana";
  id: string;
  /** Cluster name (mainnet-beta, devnet, testnet, localnet) */
  cluster: "mainnet-beta" | "devnet" | "testnet" | "localnet";
  /** RPC endpoint URL */
  rpcUrl: string;
  /** WebSocket endpoint URL */
  wsUrl: string;
  /** Block explorer URL */
  explorerUrl: string;
}

/**
 * Union type for all chain configurations
 */
export type AnyChainConfig = EVMChainConfig | SolanaClusterConfig;

/**
 * Multi-chain registry holding all chain configurations
 */
export interface ChainRegistry {
  evm: Record<number, EVMChainConfig>;
  solana: Record<string, SolanaClusterConfig>;
}

/**
 * Type guard to check if config is EVM
 * @param config - Chain configuration to check
 * @returns True if EVM chain
 */
export function isEVMChain(config: AnyChainConfig): config is EVMChainConfig {
  return config.type === "evm";
}

/**
 * Type guard to check if config is Solana
 * @param config - Chain configuration to check
 * @returns True if Solana chain
 */
export function isSolanaChain(config: AnyChainConfig): config is SolanaClusterConfig {
  return config.type === "solana";
}

