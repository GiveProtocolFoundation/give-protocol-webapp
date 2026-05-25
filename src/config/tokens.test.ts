import { describe, it, expect } from "@jest/globals";
import {
  MOONBEAM_TOKENS,
  BASE_TOKENS,
  BASE_SEPOLIA_TOKENS,
  OPTIMISM_TOKENS,
  OPTIMISM_SEPOLIA_TOKENS,
  CHAIN_TOKENS,
  SUPPORTED_CURRENCIES,
  getTokenBySymbol,
  getTokenByAddress,
  getCurrencyByCode,
  getTokensForChain,
  getERC20TokensForChain,
  getTokenByAddressOnChain,
} from "./tokens";

describe("tokens config", () => {
  describe("token arrays", () => {
    it("MOONBEAM_TOKENS should have expected tokens", () => {
      expect(MOONBEAM_TOKENS.length).toBeGreaterThan(0);
      const symbols = MOONBEAM_TOKENS.map((t) => t.symbol);
      expect(symbols).toContain("DEV");
      expect(symbols).toContain("GLMR");
      expect(symbols).toContain("USDC");
    });

    it("BASE_TOKENS should have ETH and stablecoins", () => {
      expect(BASE_TOKENS.length).toBeGreaterThan(0);
      const symbols = BASE_TOKENS.map((t) => t.symbol);
      expect(symbols).toContain("ETH");
      expect(symbols).toContain("USDC");
      expect(symbols).toContain("USDT");
      expect(symbols).toContain("DAI");
    });

    it("BASE_SEPOLIA_TOKENS should have testnet tokens", () => {
      expect(BASE_SEPOLIA_TOKENS.length).toBeGreaterThanOrEqual(1);
    });

    it("OPTIMISM_TOKENS should have OP token", () => {
      const symbols = OPTIMISM_TOKENS.map((t) => t.symbol);
      expect(symbols).toContain("OP");
    });

    it("OPTIMISM_SEPOLIA_TOKENS should be defined", () => {
      expect(OPTIMISM_SEPOLIA_TOKENS.length).toBeGreaterThanOrEqual(1);
    });

    it("all tokens should have required fields", () => {
      const allTokens = [
        ...MOONBEAM_TOKENS,
        ...BASE_TOKENS,
        ...OPTIMISM_TOKENS,
      ];
      for (const token of allTokens) {
        expect(token.symbol).toBeTruthy();
        expect(token.name).toBeTruthy();
        expect(token.address).toBeTruthy();
        expect(typeof token.decimals).toBe("number");
        expect(token.coingeckoId).toBeTruthy();
        expect(typeof token.isNative).toBe("boolean");
      }
    });
  });

  describe("CHAIN_TOKENS", () => {
    it("should map chain IDs to token arrays", () => {
      expect(Object.keys(CHAIN_TOKENS).length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("SUPPORTED_CURRENCIES", () => {
    it("should contain common fiat currencies", () => {
      const codes = SUPPORTED_CURRENCIES.map((c) => c.code);
      expect(codes).toContain("USD");
      expect(codes).toContain("EUR");
      expect(codes).toContain("GBP");
      expect(codes).toContain("JPY");
    });

    it("each currency should have required fields", () => {
      for (const currency of SUPPORTED_CURRENCIES) {
        expect(currency.code).toBeTruthy();
        expect(currency.name).toBeTruthy();
        expect(currency.symbol).toBeTruthy();
        expect(currency.coingeckoId).toBeTruthy();
      }
    });
  });

  describe("getTokenBySymbol", () => {
    it("should find token by symbol (case-insensitive)", () => {
      const token = getTokenBySymbol("glmr");
      expect(token).toBeDefined();
      expect(token?.symbol).toBe("GLMR");
    });

    it("should return undefined for unknown symbol", () => {
      expect(getTokenBySymbol("NONEXISTENT")).toBeUndefined();
    });
  });

  describe("getTokenByAddress", () => {
    it("should find token by address (case-insensitive)", () => {
      const address = MOONBEAM_TOKENS[2].address; // WGLMR
      const token = getTokenByAddress(address.toLowerCase());
      expect(token).toBeDefined();
      expect(token?.address).toBe(address);
    });

    it("should return undefined for unknown address", () => {
      expect(
        getTokenByAddress("0x0000000000000000000000000000000000000001"),
      ).toBeUndefined();
    });
  });

  describe("getCurrencyByCode", () => {
    it("should find currency by code (case-insensitive)", () => {
      const currency = getCurrencyByCode("usd");
      expect(currency).toBeDefined();
      expect(currency?.code).toBe("USD");
      expect(currency?.symbol).toBe("$");
    });

    it("should return undefined for unknown code", () => {
      expect(getCurrencyByCode("XYZ")).toBeUndefined();
    });
  });

  describe("getTokensForChain", () => {
    it("should return tokens for known chain", () => {
      const tokens = getTokensForChain(8453); // Base
      expect(tokens.length).toBeGreaterThan(0);
    });

    it("should return fallback for unknown chain", () => {
      const tokens = getTokensForChain(99999);
      expect(tokens).toBe(MOONBEAM_TOKENS);
    });
  });

  describe("getERC20TokensForChain", () => {
    it("should exclude native tokens", () => {
      const tokens = getERC20TokensForChain(8453); // Base
      for (const token of tokens) {
        expect(token.isNative).toBe(false);
      }
    });

    it("should have fewer tokens than getTokensForChain", () => {
      const all = getTokensForChain(8453);
      const erc20 = getERC20TokensForChain(8453);
      expect(erc20.length).toBeLessThan(all.length);
    });
  });

  describe("getTokenByAddressOnChain", () => {
    it("should find token by address on specific chain", () => {
      const baseUSDC = BASE_TOKENS.find((t) => t.symbol === "USDC");
      expect(baseUSDC).toBeDefined();
      const token = getTokenByAddressOnChain(baseUSDC?.address ?? "", 8453);
      expect(token).toBeDefined();
      expect(token?.symbol).toBe("USDC");
    });

    it("should return undefined if token not on that chain", () => {
      const result = getTokenByAddressOnChain(
        "0x0000000000000000000000000000000000000001",
        8453,
      );
      expect(result).toBeUndefined();
    });
  });
});
