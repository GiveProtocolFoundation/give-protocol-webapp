import { describe, it, expect } from "@jest/globals";
import { isEVMChain, isSolanaChain, type AnyChainConfig } from "./chains";

const evmConfig: AnyChainConfig = {
  type: "evm",
  id: 8453,
  name: "Base",
  shortName: "base",
  isTestnet: false,
  iconPath: "/chains/base.svg",
  color: "#0052FF",
  description: "Base L2",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://mainnet.base.org"],
  blockExplorerUrls: ["https://basescan.org"],
  ecosystem: "Ethereum L2",
};

const solanaConfig: AnyChainConfig = {
  type: "solana",
  id: "mainnet-beta",
  name: "Solana",
  shortName: "sol",
  isTestnet: false,
  iconPath: "/chains/solana.svg",
  color: "#9945FF",
  description: "Solana mainnet",
  cluster: "mainnet-beta",
  rpcUrl: "https://api.mainnet-beta.solana.com",
  wsUrl: "wss://api.mainnet-beta.solana.com",
  explorerUrl: "https://explorer.solana.com",
};

describe("chain type guards", () => {
  describe("isEVMChain", () => {
    it("should return true for EVM config", () => {
      expect(isEVMChain(evmConfig)).toBe(true);
    });

    it("should return false for non-EVM configs", () => {
      expect(isEVMChain(solanaConfig)).toBe(false);
    });
  });

  describe("isSolanaChain", () => {
    it("should return true for Solana config", () => {
      expect(isSolanaChain(solanaConfig)).toBe(true);
    });

    it("should return false for non-Solana configs", () => {
      expect(isSolanaChain(evmConfig)).toBe(false);
    });
  });
});
