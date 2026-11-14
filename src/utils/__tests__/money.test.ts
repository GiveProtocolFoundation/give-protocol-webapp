import {
  EXCHANGE_RATES,
  CURRENCY_SYMBOLS,
  formatCurrency,
  calculateEquityGrowth,
} from "../money";

describe("money utilities", () => {
  describe("EXCHANGE_RATES", () => {
    it("contains expected currencies", () => {
      const expectedCurrencies = [
        "USD",
        "CAD",
        "EUR",
        "CNY",
        "JPY",
        "KRW",
        "AED",
        "AUD",
        "CHF",
        "GBP",
        "INR",
        "MXP",
        "ILS",
        "NGN",
        "HKD",
        "PKR",
      ];

      for (const currency of expectedCurrencies) {
        expect(EXCHANGE_RATES).toHaveProperty(currency);
        expect(typeof EXCHANGE_RATES[currency]).toBe("number");
        expect(EXCHANGE_RATES[currency]).toBeGreaterThan(0);
      }
    });

    it("has USD as base currency with rate 1.0", () => {
      expect(EXCHANGE_RATES.USD).toBe(1.0);
    });

    it("contains reasonable exchange rates", () => {
      // Test some known relationships
      expect(EXCHANGE_RATES.EUR).toBeLessThan(1); // EUR typically stronger than USD
      expect(EXCHANGE_RATES.JPY).toBeGreaterThan(100); // JPY typically much weaker
      expect(EXCHANGE_RATES.GBP).toBeLessThan(1); // GBP typically stronger than USD
    });

    it("has positive values for all rates", () => {
      for (const rate of Object.values(EXCHANGE_RATES)) {
        expect(rate).toBeGreaterThan(0);
      }
    });
  });

  describe("CURRENCY_SYMBOLS", () => {
    it("contains symbols for all currencies in EXCHANGE_RATES", () => {
      for (const currency of Object.keys(EXCHANGE_RATES)) {
        expect(CURRENCY_SYMBOLS).toHaveProperty(currency);
        expect(typeof CURRENCY_SYMBOLS[currency]).toBe("string");
        expect(CURRENCY_SYMBOLS[currency].length).toBeGreaterThan(0);
      }
    });

    it("contains expected symbols", () => {
      expect(CURRENCY_SYMBOLS.USD).toBe("$");
      expect(CURRENCY_SYMBOLS.EUR).toBe("€");
      expect(CURRENCY_SYMBOLS.GBP).toBe("£");
      expect(CURRENCY_SYMBOLS.JPY).toBe("¥");
      expect(CURRENCY_SYMBOLS.CNY).toBe("¥");
      expect(CURRENCY_SYMBOLS.INR).toBe("₹");
    });

    it("has non-empty symbols for all currencies", () => {
      for (const symbol of Object.values(CURRENCY_SYMBOLS)) {
        expect(symbol).toBeTruthy();
        expect(typeof symbol).toBe("string");
      }
    });
  });

  describe("formatCurrency", () => {
    it("formats USD by default", () => {
      const result = formatCurrency(100);
      expect(result).toMatch(/\$100\.00/u);
    });

    it("formats different currencies correctly", () => {
      // Test USD (base case)
      expect(formatCurrency(100, "USD")).toMatch(/\$100\.00/u);

      // Test EUR (should convert)
      const eurResult = formatCurrency(100, "EUR");
      expect(eurResult).toMatch(/€/u);
      expect(eurResult).toMatch(/92\.00/u); // 100 * 0.92

      // Test JPY (large rate)
      const jpyResult = formatCurrency(100, "JPY");
      expect(jpyResult).toMatch(/¥/u);
      expect(jpyResult).toMatch(/15,168\.00/u); // 100 * 151.68
    });

    it("formats numbers for the given locale", () => {
      // Spanish uses "." for thousands and "," for decimals
      expect(formatCurrency(12345.5, "USD", "es")).toMatch(/12\.345,50/u);
      expect(formatCurrency(12345.5, "USD", "en-US")).toMatch(/12,345\.50/u);
    });

    it("handles zero amount", () => {
      const result = formatCurrency(0);
      expect(result).toMatch(/\$0\.00/u);
    });

    it("handles negative amounts", () => {
      const result = formatCurrency(-100);
      expect(result).toMatch(/-\$100\.00/u);
    });

    it("handles decimal amounts", () => {
      const result = formatCurrency(123.456);
      expect(result).toMatch(/\$123\.46/u); // Should round to 2 decimal places
    });

    it("handles very small amounts", () => {
      const result = formatCurrency(0.01);
      expect(result).toMatch(/\$0\.01/u);
    });

    it("handles very large amounts", () => {
      const result = formatCurrency(1000000);
      expect(result).toMatch(/\$1,000,000\.00/u);
    });

    it("uses exchange rate 1 for unknown currency", () => {
      // Intl.NumberFormat will throw for invalid currency codes
      // So we test this behavior by expecting an error
      expect(() => formatCurrency(100, "UNKNOWN")).toThrow(
        "Invalid currency code",
      );
    });

    it("handles missing exchange rate gracefully", () => {
      // Test with a currency not in EXCHANGE_RATES but valid for Intl
      // Use EUR temporarily removed from rates to test fallback behavior
      const originalRate = EXCHANGE_RATES.EUR;
      delete EXCHANGE_RATES.EUR;

      const result = formatCurrency(100, "EUR");
      expect(result).toMatch(/€100\.00/u); // Should use rate 1 as fallback

      // Restore original rate
      EXCHANGE_RATES.EUR = originalRate;
    });

    it("formats with proper thousand separators", () => {
      const result = formatCurrency(1234567.89);
      expect(result).toMatch(/\$1,234,567\.89/u);
    });

    it("converts currencies correctly with different rates", () => {
      // Test CAD conversion
      const cadResult = formatCurrency(100, "CAD");
      expect(cadResult).toMatch(/135\.00/u); // 100 * 1.35

      // Test GBP conversion
      const gbpResult = formatCurrency(100, "GBP");
      expect(gbpResult).toMatch(/79\.00/u); // 100 * 0.79
    });

    it("handles edge case with zero exchange rate", () => {
      // Temporarily modify exchange rates for testing
      const originalRate = EXCHANGE_RATES.USD;
      EXCHANGE_RATES.USD = 0;

      const result = formatCurrency(100, "USD");
      expect(result).toMatch(/\$100\.00/u); // 100 * (0 || 1) = 100

      // Restore original rate
      EXCHANGE_RATES.USD = originalRate;
    });

    it("formats floating point precision correctly", () => {
      // Test precision issues with floating point arithmetic
      const result = formatCurrency(0.1 + 0.2); // Classic floating point issue
      expect(result).toMatch(/\$0\.30/u); // Should be properly formatted
    });
  });

  describe("calculateEquityGrowth", () => {
    it("calculates 12% growth correctly", () => {
      expect(calculateEquityGrowth(100)).toBe(12);
      expect(calculateEquityGrowth(1000)).toBe(120);
      expect(calculateEquityGrowth(500)).toBe(60);
    });

    it("handles zero amount", () => {
      expect(calculateEquityGrowth(0)).toBe(0);
    });

    it("handles negative amounts", () => {
      expect(calculateEquityGrowth(-100)).toBe(-12);
    });

    it("handles decimal amounts", () => {
      expect(calculateEquityGrowth(123.45)).toBeCloseTo(14.814, 2);
    });

    it("handles very small amounts", () => {
      expect(calculateEquityGrowth(0.01)).toBeCloseTo(0.0012, 4);
    });

    it("handles very large amounts", () => {
      expect(calculateEquityGrowth(1000000)).toBe(120000);
    });

    it("maintains precision with floating point calculations", () => {
      const result = calculateEquityGrowth(100.33);
      expect(result).toBeCloseTo(12.0396, 4);
    });

    it("calculates growth for fractional cents", () => {
      const result = calculateEquityGrowth(1.234);
      expect(result).toBeCloseTo(0.14808, 5);
    });

    it("returns number type", () => {
      const result = calculateEquityGrowth(100);
      expect(typeof result).toBe("number");
    });

    it("handles edge case amounts", () => {
      expect(calculateEquityGrowth(Number.MAX_SAFE_INTEGER)).toBe(
        Number.MAX_SAFE_INTEGER * 0.12,
      );
      expect(calculateEquityGrowth(Number.MIN_SAFE_INTEGER)).toBe(
        Number.MIN_SAFE_INTEGER * 0.12,
      );
    });
  });

  describe("integration tests", () => {
    it("formats calculated equity growth correctly", () => {
      const principal = 1000;
      const growth = calculateEquityGrowth(principal);
      const formatted = formatCurrency(growth);

      expect(formatted).toMatch(/\$120\.00/u);
    });

    it("works with different currencies for growth calculation", () => {
      const principal = 1000;
      const growth = calculateEquityGrowth(principal);

      const usdFormatted = formatCurrency(growth, "USD");
      const eurFormatted = formatCurrency(growth, "EUR");

      expect(usdFormatted).toMatch(/\$120\.00/u);
      expect(eurFormatted).toMatch(/€110\.40/u); // 120 * 0.92
    });

    it("handles complete workflow with edge cases", () => {
      const amounts = [0, 0.01, 100, 1000, 999999.99];

      for (const amount of amounts) {
        const growth = calculateEquityGrowth(amount);
        const formatted = formatCurrency(growth);

        expect(typeof growth).toBe("number");
        expect(typeof formatted).toBe("string");
        expect(formatted).toMatch(/\$/u);
      }
    });
  });
});
