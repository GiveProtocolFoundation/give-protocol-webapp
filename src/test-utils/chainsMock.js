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

// Polkadot chain stubs
export const DEFAULT_POLKADOT_CHAIN = "polkadot";

export const POLKADOT_CHAINS = { POLKADOT: "polkadot", KUSAMA: "kusama" };

export const POLKADOT_CHAIN_CONFIGS = {};

export const SUPPORTED_POLKADOT_CHAINS = ["polkadot"];

export const TESTNET_POLKADOT_CHAINS = [];

export const getPolkadotChainConfig = jest.fn((chainId) => ({
  id: chainId,
  name: "Polkadot",
  ss58Prefix: 0,
}));

export const isPolkadotChainSupported = jest.fn(() => true);

export const getAvailablePolkadotChains = jest.fn(() => ["polkadot"]);

export const getPolkadotExplorerUrl = jest.fn(() => "https://polkadot.subscan.io");

export const getChainSS58Prefix = jest.fn(() => 0);
