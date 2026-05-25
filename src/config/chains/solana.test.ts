import { describe, it, expect } from "@jest/globals";
import {
  SOLANA_CLUSTERS,
  SOLANA_CLUSTER_CONFIGS,
  SUPPORTED_SOLANA_CLUSTERS,
  TESTNET_SOLANA_CLUSTERS,
  DEFAULT_SOLANA_CLUSTER,
  getSolanaClusterConfig,
  isSolanaClusterSupported,
  getAvailableSolanaClusters,
  getSolanaExplorerUrl,
} from "./solana";

describe("Solana cluster config", () => {
  describe("SOLANA_CLUSTERS", () => {
    it("should have expected cluster IDs", () => {
      expect(SOLANA_CLUSTERS.MAINNET).toBe("mainnet-beta");
      expect(SOLANA_CLUSTERS.DEVNET).toBe("devnet");
      expect(SOLANA_CLUSTERS.TESTNET).toBe("testnet");
      expect(SOLANA_CLUSTERS.LOCALNET).toBe("localnet");
    });
  });

  describe("SOLANA_CLUSTER_CONFIGS", () => {
    it("should have config for all clusters", () => {
      Object.values(SOLANA_CLUSTERS).forEach((id) => {
        const config = SOLANA_CLUSTER_CONFIGS[id];
        expect(config).toBeDefined();
        expect(config.name).toBeTruthy();
        expect(config.rpcUrl).toBeTruthy();
      });
    });
  });

  describe("getSolanaClusterConfig", () => {
    it("should return config for valid cluster", () => {
      const config = getSolanaClusterConfig("mainnet-beta");
      expect(config).toBeDefined();
      expect(config?.name).toBe("Solana Mainnet");
    });

    it("should return undefined for invalid cluster", () => {
      expect(getSolanaClusterConfig("invalid")).toBeUndefined();
    });
  });

  describe("isSolanaClusterSupported", () => {
    it("should return true for valid clusters", () => {
      expect(isSolanaClusterSupported("mainnet-beta")).toBe(true);
      expect(isSolanaClusterSupported("devnet")).toBe(true);
    });

    it("should return false for invalid cluster", () => {
      expect(isSolanaClusterSupported("invalid")).toBe(false);
    });
  });

  describe("getAvailableSolanaClusters", () => {
    it("should return only mainnet when showTestnets is false", () => {
      const clusters = getAvailableSolanaClusters(false);
      clusters.forEach((c) => expect(c.isTestnet).toBe(false));
      expect(clusters.length).toBe(SUPPORTED_SOLANA_CLUSTERS.length);
    });

    it("should include testnets when showTestnets is true", () => {
      const clusters = getAvailableSolanaClusters(true);
      expect(clusters.length).toBe(
        SUPPORTED_SOLANA_CLUSTERS.length + TESTNET_SOLANA_CLUSTERS.length,
      );
    });
  });

  describe("getSolanaExplorerUrl", () => {
    it("should return explorer URL for mainnet tx", () => {
      const url = getSolanaExplorerUrl("mainnet-beta", "tx", "abc123");
      expect(url).toBe("https://explorer.solana.com/tx/abc123");
    });

    it("should include cluster param for non-mainnet", () => {
      const url = getSolanaExplorerUrl("devnet", "address", "addr1");
      expect(url).toContain("cluster=devnet");
      expect(url).toContain("address/addr1");
    });

    it("should return empty string for invalid cluster", () => {
      expect(getSolanaExplorerUrl("invalid", "tx", "abc")).toBe("");
    });
  });

  describe("DEFAULT_SOLANA_CLUSTER", () => {
    it("should be devnet", () => {
      expect(DEFAULT_SOLANA_CLUSTER).toBe("devnet");
    });
  });
});
