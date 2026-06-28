import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { ExchangeRateService, exchangeRateService } from "./exchangeRate";

// Logger is auto-mocked via moduleNameMapper

// Mock global fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof global.fetch>;
global.fetch = mockFetch;

describe("ExchangeRateService", () => {
  let service: ExchangeRateService;

  beforeEach(() => {
    service = new ExchangeRateService();
    mockFetch.mockReset();
  });

  describe("getExchangeRate", () => {
    it("should return 1 for USD to USD", async () => {
      const rate = await service.getExchangeRate("USD");
      expect(rate).toBe(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("should fetch rates from API for non-USD currency", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.92, GBP: 0.79 } }),
      } as Response);

      const rate = await service.getExchangeRate("EUR");
      expect(rate).toBe(0.92);
      expect(mockFetch).toHaveBeenCalledWith("/api/exchangerate/USD");
    });

    it("should use cached rate on subsequent calls", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.92, GBP: 0.79 } }),
      } as Response);

      await service.getExchangeRate("EUR");
      const rate = await service.getExchangeRate("EUR");
      expect(rate).toBe(0.92);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle case-insensitive currency codes", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.92 } }),
      } as Response);

      const rate = await service.getExchangeRate("eur");
      expect(rate).toBe(0.92);
    });

    it("should throw when API returns non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: "Internal Server Error",
      } as Response);

      await expect(service.getExchangeRate("EUR")).rejects.toThrow(
        "Failed to fetch exchange rate for EUR and no cache available",
      );
    });

    it("should throw when API returns invalid response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" }),
      } as Response);

      await expect(service.getExchangeRate("EUR")).rejects.toThrow(
        "Failed to fetch exchange rate for EUR and no cache available",
      );
    });

    it("should throw when requested currency not in response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { GBP: 0.79 } }),
      } as Response);

      await expect(service.getExchangeRate("EUR")).rejects.toThrow(
        "Failed to fetch exchange rate for EUR and no cache available",
      );
    });
  });

  describe("convertFromUSD", () => {
    it("should convert USD amount to target currency", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.92 } }),
      } as Response);

      const result = await service.convertFromUSD(100, "EUR");
      expect(result).toBe(92);
    });

    it("should return same amount for USD", async () => {
      const result = await service.convertFromUSD(100, "USD");
      expect(result).toBe(100);
    });
  });

  describe("convertToUSD", () => {
    it("should convert target currency to USD", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.5 } }),
      } as Response);

      const result = await service.convertToUSD(50, "EUR");
      expect(result).toBe(100);
    });

    it("should return same amount for USD", async () => {
      const result = await service.convertToUSD(100, "USD");
      expect(result).toBe(100);
    });
  });

  describe("getAllRates", () => {
    it("should return empty object initially", () => {
      expect(service.getAllRates()).toEqual({});
    });

    it("should return cached rates after fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.92, GBP: 0.79 } }),
      } as Response);
      await service.getExchangeRate("EUR");

      const rates = service.getAllRates();
      expect(rates.EUR).toBe(0.92);
      expect(rates.GBP).toBe(0.79);
    });
  });

  describe("clearCache", () => {
    it("should reset cache", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.92 } }),
      } as Response);
      await service.getExchangeRate("EUR");

      service.clearCache();
      expect(service.getAllRates()).toEqual({});
      expect(service.getLastUpdate()).toBe(0);
    });
  });

  describe("getLastUpdate", () => {
    it("should return 0 initially", () => {
      expect(service.getLastUpdate()).toBe(0);
    });

    it("should return timestamp after fetch", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ rates: { EUR: 0.92 } }),
      } as Response);

      const before = Date.now();
      await service.getExchangeRate("EUR");
      const after = Date.now();

      expect(service.getLastUpdate()).toBeGreaterThanOrEqual(before);
      expect(service.getLastUpdate()).toBeLessThanOrEqual(after);
    });
  });

  describe("singleton instance", () => {
    it("should export a singleton instance", () => {
      expect(exchangeRateService).toBeInstanceOf(ExchangeRateService);
    });
  });
});
