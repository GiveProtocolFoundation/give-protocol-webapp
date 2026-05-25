import { describe, it, expect } from "@jest/globals";
import {
  EVM_CHAIN_IDS,
  EVM_CHAIN_CONFIGS,
  SUPPORTED_EVM_CHAIN_IDS,
  TESTNET_EVM_CHAIN_IDS,
  DEFAULT_EVM_CHAIN_ID,
  getEVMChainConfig,
  isEVMChainSupported,
  getAvailableEVMChains,
  getEVMChainParams,
} from "./evm";

describe("EVM chain config", () => {
  describe("EVM_CHAIN_IDS", () => {
    it("should have Base as chain 8453", () => {
      expect(EVM_CHAIN_IDS.BASE).toBe(8453);
    });

    it("should have Ethereum as chain 1", () => {
      expect(EVM_CHAIN_IDS.ETHEREUM).toBe(1);
    });

    it("should include testnets", () => {
      expect(EVM_CHAIN_IDS.BASE_SEPOLIA).toBe(84532);
      expect(EVM_CHAIN_IDS.MOONBASE).toBe(1287);
    });
  });

  describe("EVM_CHAIN_CONFIGS", () => {
    it("should have config for each chain ID", () => {
      Object.values(EVM_CHAIN_IDS).forEach((id) => {
        expect(EVM_CHAIN_CONFIGS[id]).toBeDefined();
        expect(EVM_CHAIN_CONFIGS[id].name).toBeTruthy();
        expect(EVM_CHAIN_CONFIGS[id].rpcUrls.length).toBeGreaterThan(0);
      });
    });

    it("should mark testnets correctly", () => {
      expect(EVM_CHAIN_CONFIGS[EVM_CHAIN_IDS.BASE_SEPOLIA].isTestnet).toBe(
        true,
      );
      expect(EVM_CHAIN_CONFIGS[EVM_CHAIN_IDS.BASE].isTestnet).toBe(false);
    });
  });

  describe("getEVMChainConfig", () => {
    it("should return config for valid chain ID", () => {
      const config = getEVMChainConfig(8453);
      expect(config).toBeDefined();
      expect(config?.name).toBe("Base");
    });

    it("should return undefined for invalid chain ID", () => {
      expect(getEVMChainConfig(99999)).toBeUndefined();
    });
  });

  describe("isEVMChainSupported", () => {
    it("should return true for supported chains", () => {
      expect(isEVMChainSupported(8453)).toBe(true);
      expect(isEVMChainSupported(10)).toBe(true);
    });

    it("should return false for unsupported chains", () => {
      expect(isEVMChainSupported(99999)).toBe(false);
    });
  });

  describe("getAvailableEVMChains", () => {
    it("should return only mainnets when showTestnets is false", () => {
      const chains = getAvailableEVMChains(false);
      chains.forEach((chain) => {
        expect(chain.isTestnet).toBe(false);
      });
      expect(chains.length).toBe(SUPPORTED_EVM_CHAIN_IDS.length);
    });

    it("should include testnets when showTestnets is true", () => {
      const chains = getAvailableEVMChains(true);
      expect(chains.length).toBe(
        SUPPORTED_EVM_CHAIN_IDS.length + TESTNET_EVM_CHAIN_IDS.length,
      );
      expect(chains.some((c) => c.isTestnet)).toBe(true);
    });
  });

  describe("getEVMChainParams", () => {
    it("should return formatted params for valid chain", () => {
      const params = getEVMChainParams(8453);
      expect(params).not.toBeNull();
      expect(params?.chainId).toBe("0x2105");
      expect(params?.chainName).toBe("Base");
      expect(params?.nativeCurrency.symbol).toBe("ETH");
    });

    it("should return null for invalid chain", () => {
      expect(getEVMChainParams(99999)).toBeNull();
    });
  });

  describe("DEFAULT_EVM_CHAIN_ID", () => {
    it("should be Base", () => {
      expect(DEFAULT_EVM_CHAIN_ID).toBe(EVM_CHAIN_IDS.BASE);
    });
  });
});
