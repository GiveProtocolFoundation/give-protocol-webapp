import {
  FIAT_CURRENCIES,
  getFiatCurrencyByCode,
  getEnabledCurrencies,
  isZeroDecimalCurrency,
  formatCurrencyAmount,
} from "./fiatCurrencies";
import type { FiatCurrencyConfig } from "./fiatCurrencies";

describe("fiatCurrencies", () => {
  describe("FIAT_CURRENCIES", () => {
    it("should contain at least one currency", () => {
      expect(FIAT_CURRENCIES.length).toBeGreaterThan(0);
    });

    it("should have USD as the first currency with Helcim processor", () => {
      const usd = FIAT_CURRENCIES[0];
      expect(usd.code).toBe("USD");
      expect(usd.processor).toBe("helcim");
      expect(usd.enabled).toBe(true);
    });

    it("should have non-USD currencies with PayPal processor", () => {
      const nonUsd = FIAT_CURRENCIES.filter((c) => c.code !== "USD");
      nonUsd.forEach((currency) => {
        expect(currency.processor).toBe("paypal");
      });
    });

    it("should have valid structure for all currencies", () => {
      FIAT_CURRENCIES.forEach((currency) => {
        expect(currency.code).toMatch(/^[A-Z]{3}$/);
        expect(currency.name).toBeTruthy();
        expect(currency.symbol).toBeTruthy();
        expect(currency.presets.length).toBeGreaterThan(0);
        expect(typeof currency.enabled).toBe("boolean");
      });
    });
  });

  describe("getFiatCurrencyByCode", () => {
    it("should return currency config for valid code", () => {
      const usd = getFiatCurrencyByCode("USD");
      expect(usd).toBeDefined();
      expect(usd?.code).toBe("USD");
      expect(usd?.symbol).toBe("$");
    });

    it("should be case-insensitive", () => {
      const eur = getFiatCurrencyByCode("eur");
      expect(eur).toBeDefined();
      expect(eur?.code).toBe("EUR");
    });

    it("should return undefined for unknown code", () => {
      expect(getFiatCurrencyByCode("XYZ")).toBeUndefined();
    });

    it("should return undefined for empty string", () => {
      expect(getFiatCurrencyByCode("")).toBeUndefined();
    });
  });

  describe("getEnabledCurrencies", () => {
    it("should return only enabled currencies", () => {
      const enabled = getEnabledCurrencies();
      enabled.forEach((c) => {
        expect(c.enabled).toBe(true);
      });
    });

    it("should include USD", () => {
      const enabled = getEnabledCurrencies();
      expect(enabled.some((c) => c.code === "USD")).toBe(true);
    });
  });

  describe("isZeroDecimalCurrency", () => {
    it("should return true for JPY", () => {
      expect(isZeroDecimalCurrency("JPY")).toBe(true);
    });

    it("should return true for KRW", () => {
      expect(isZeroDecimalCurrency("KRW")).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(isZeroDecimalCurrency("jpy")).toBe(true);
    });

    it("should return false for USD", () => {
      expect(isZeroDecimalCurrency("USD")).toBe(false);
    });

    it("should return false for EUR", () => {
      expect(isZeroDecimalCurrency("EUR")).toBe(false);
    });
  });

  describe("formatCurrencyAmount", () => {
    it("should format USD with 2 decimals", () => {
      const usd: FiatCurrencyConfig = {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        processor: "helcim",
        presets: [25, 50, 100],
        enabled: true,
      };
      expect(formatCurrencyAmount(25, usd)).toBe("$25.00");
    });

    it("should format JPY with 0 decimals", () => {
      const jpy: FiatCurrencyConfig = {
        code: "JPY",
        name: "Japanese Yen",
        symbol: "¥",
        processor: "paypal",
        presets: [3000, 5000],
        enabled: true,
      };
      expect(formatCurrencyAmount(3000, jpy)).toBe("¥3,000");
    });

    it("should format large amounts with thousands separators", () => {
      const usd: FiatCurrencyConfig = {
        code: "USD",
        name: "US Dollar",
        symbol: "$",
        processor: "helcim",
        presets: [25],
        enabled: true,
      };
      expect(formatCurrencyAmount(1000000, usd)).toBe("$1,000,000.00");
    });

    it("should format KRW with 0 decimals", () => {
      const krw: FiatCurrencyConfig = {
        code: "KRW",
        name: "Korean Won",
        symbol: "₩",
        processor: "paypal",
        presets: [10000],
        enabled: true,
      };
      expect(formatCurrencyAmount(50000, krw)).toBe("₩50,000");
    });
  });
});
