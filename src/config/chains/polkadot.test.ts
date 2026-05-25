import { describe, it, expect } from "@jest/globals";
import {
  POLKADOT_CHAINS,
  POLKADOT_CHAIN_CONFIGS,
  SUPPORTED_POLKADOT_CHAINS,
  TESTNET_POLKADOT_CHAINS,
  DEFAULT_POLKADOT_CHAIN,
  getPolkadotChainConfig,
  isPolkadotChainSupported,
  getAvailablePolkadotChains,
  getPolkadotExplorerUrl,
  getChainSS58Prefix,
} from "./polkadot";

describe("Polkadot chain config", () => {
  describe("POLKADOT_CHAINS", () => {
    it("should have expected chain IDs", () => {
      expect(POLKADOT_CHAINS.POLKADOT).toBe("polkadot");
      expect(POLKADOT_CHAINS.KUSAMA).toBe("kusama");
      expect(POLKADOT_CHAINS.WESTEND).toBe("westend");
    });
  });

  describe("POLKADOT_CHAIN_CONFIGS", () => {
    it("should have valid config for all chains", () => {
      Object.values(POLKADOT_CHAINS).forEach((id) => {
        const config = POLKADOT_CHAIN_CONFIGS[id];
        expect(config).toBeDefined();
        expect(config.name).toBeTruthy();
        expect(config.wsEndpoint).toBeTruthy();
        expect(config.nativeToken).toBeDefined();
      });
    });
  });

  describe("getPolkadotChainConfig", () => {
    it("should return config for valid chain", () => {
      const config = getPolkadotChainConfig("polkadot");
      expect(config).toBeDefined();
      expect(config?.name).toBe("Polkadot");
    });

    it("should return undefined for invalid chain", () => {
      expect(getPolkadotChainConfig("invalid")).toBeUndefined();
    });
  });

  describe("isPolkadotChainSupported", () => {
    it("should return true for supported chains", () => {
      expect(isPolkadotChainSupported("polkadot")).toBe(true);
    });

    it("should return false for unsupported chains", () => {
      expect(isPolkadotChainSupported("invalid")).toBe(false);
    });
  });

  describe("getAvailablePolkadotChains", () => {
    it("should return only mainnets when showTestnets is false", () => {
      const chains = getAvailablePolkadotChains(false);
      chains.forEach((c) => expect(c.isTestnet).toBe(false));
      expect(chains.length).toBe(SUPPORTED_POLKADOT_CHAINS.length);
    });

    it("should include testnets when showTestnets is true", () => {
      const chains = getAvailablePolkadotChains(true);
      expect(chains.length).toBe(
        SUPPORTED_POLKADOT_CHAINS.length + TESTNET_POLKADOT_CHAINS.length,
      );
    });
  });

  describe("getPolkadotExplorerUrl", () => {
    it("should return explorer URL for valid chain", () => {
      const url = getPolkadotExplorerUrl("polkadot", "account", "1abc");
      expect(url).toContain("polkadot.subscan.io/account/1abc");
    });

    it("should return empty string for invalid chain", () => {
      expect(getPolkadotExplorerUrl("invalid", "account", "1abc")).toBe("");
    });
  });

  describe("getChainSS58Prefix", () => {
    it("should return correct prefix for Polkadot", () => {
      expect(getChainSS58Prefix("polkadot")).toBe(0);
    });

    it("should return correct prefix for Kusama", () => {
      expect(getChainSS58Prefix("kusama")).toBe(2);
    });

    it("should return default 42 for unknown chain", () => {
      expect(getChainSS58Prefix("unknown")).toBe(42);
    });
  });

  describe("DEFAULT_POLKADOT_CHAIN", () => {
    it("should be polkadot", () => {
      expect(DEFAULT_POLKADOT_CHAIN).toBe("polkadot");
    });
  });
});
