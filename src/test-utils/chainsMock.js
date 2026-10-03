// Mock for @/config/chains
import { jest } from "@jest/globals";

// EVM chain stubs
export const getEVMChainConfig = jest.fn((chainId) => ({
  id: chainId,
  name: "Base",
  blockExplorerUrls: ["https://basescan.org"],
}));

export const getEVMChainParams = jest.fn((chainId) => ({
  chainId: `0x${chainId.toString(16)}`,
  chainName: "Base",
  rpcUrls: ["https://mainnet.base.org"],
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  blockExplorerUrls: ["https://basescan.org"],
}));

export const isEVMChainSupported = jest.fn(() => true);

export const DEFAULT_EVM_CHAIN_ID = 8453;

export const EVM_CHAIN_IDS = {
  MAINNET: 1,
  BASE: 8453,
};

// Solana cluster stubs
export const DEFAULT_SOLANA_CLUSTER = "mainnet-beta";

export const getSolanaClusterConfig = jest.fn((clusterId) => ({
  id: clusterId,
  name: "Mainnet Beta",
  endpoint: "https://api.mainnet-beta.solana.com",
}));

export const isSolanaClusterSupported = jest.fn(() => true);

// Supported network lists (mirrors production config shape; used for hero stats)
export const SUPPORTED_EVM_CHAIN_IDS = [1, 8453, 10, 42161, 137, 43114];
export const SUPPORTED_SOLANA_CLUSTERS = ["mainnet-beta"];
