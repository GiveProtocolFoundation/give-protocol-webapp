import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { PriceFeedService } from "./priceFeed";
import { chainlinkPriceFeedService } from "./chainlinkPriceFeed";
import { CHAIN_IDS } from "@/config/contracts";

// Mock the Logger
jest.mock("@/utils/logger", () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Spy on the real chainlinkPriceFeedService singleton (avoids ESM module mock issues)
const mockGetPrice = jest.spyOn(chainlinkPriceFeedService, "getPrice");
const mockGetPricesByCoingeckoIds = jest.spyOn(
  chainlinkPriceFeedService,
  "getPricesByCoingeckoIds",
);
const mockChainlinkClearCache = jest.spyOn(
  chainlinkPriceFeedService,
  "clearCache",
);

// Mock global fetch
global.fetch = jest.fn() as jest.Mock;

describe("PriceFeedService", () => {
  let service: PriceFeedService;

  beforeEach(() => {
    service = new PriceFeedService();
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
    mockGetPricesByCoingeckoIds.mockResolvedValue({});
    mockGetPrice.mockResolvedValue(null);
    mockChainlinkClearCache.mockImplementation(() => {
      // No-op mock for clearCache
    });
  });

  describe("getTokenPrices", () => {
    it("should fetch prices from API successfully", async () => {
      const mockResponse = {
        moonbeam: { usd: 0.5 },
        polkadot: { usd: 7.5 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const prices = await service.getTokenPrices(
        ["moonbeam", "polkadot"],
        "usd",
      );

      expect(prices).toEqual({
        moonbeam: 0.5,
        polkadot: 7.5,
      });
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/coingecko/simple/price?ids=moonbeam,polkadot&vs_currencies=usd",
      );
    });

    it("should return cached prices when cache is valid", async () => {
      const mockResponse = {
        moonbeam: { usd: 0.5 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      // First call - should fetch
      await service.getTokenPrices(["moonbeam"], "usd");
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second call - should use cache
      const cachedPrices = await service.getTokenPrices(["moonbeam"], "usd");
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1, no new fetch
      expect(cachedPrices).toEqual({ moonbeam: 0.5 });
    });

    it("should fetch fresh prices when some tokens are not in cache", async () => {
      const mockResponse1 = {
        moonbeam: { usd: 0.5 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse1),
      } as Response);

      // First call - cache moonbeam
      await service.getTokenPrices(["moonbeam"], "usd");
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const mockResponse2 = {
        moonbeam: { usd: 0.5 },
        polkadot: { usd: 7.5 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse2),
      } as Response);

      // Second call - request both tokens, polkadot not in cache
      const prices = await service.getTokenPrices(
        ["moonbeam", "polkadot"],
        "usd",
      );
      expect(global.fetch).toHaveBeenCalledTimes(2); // Should fetch again
      expect(prices).toEqual({ moonbeam: 0.5, polkadot: 7.5 });
    });

    it("should fetch fresh prices when cache is expired", async () => {
      const mockResponse1 = { moonbeam: { usd: 0.5 } };
      const mockResponse2 = { moonbeam: { usd: 0.6 } };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse1),
      } as Response);

      // First call
      await service.getTokenPrices(["moonbeam"], "usd");

      // Clear cache to simulate expiration
      service.clearCache();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse2),
      } as Response);

      // Second call - should fetch again
      const prices = await service.getTokenPrices(["moonbeam"], "usd");
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(prices).toEqual({ moonbeam: 0.6 });
    });

    it("should handle API errors and return stale cache", async () => {
      const mockResponse = { moonbeam: { usd: 0.5 } };

      // First successful fetch
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await service.getTokenPrices(["moonbeam"], "usd");

      // Force cache expiration
      service.clearCache();
      // Manually set stale data in cache
      const stalePriceCache = {
        prices: {
          moonbeam_usd: {
            tokenId: "moonbeam",
            price: 0.5,
            currency: "usd",
            timestamp: Date.now() - 120000, // 2 minutes old
          },
        },
        lastUpdate: Date.now() - 120000,
      };
      (
        service as unknown as { priceCache: typeof stalePriceCache }
      ).priceCache = stalePriceCache;

      // Simulate API error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Service Unavailable",
      } as Response);

      const prices = await service.getTokenPrices(["moonbeam"], "usd");
      expect(prices).toEqual({ moonbeam: 0.5 });
    });

    it("should return empty prices when both sources fail and no cache available", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: "Service Unavailable",
      } as Response);

      const prices = await service.getTokenPrices(["moonbeam"], "usd");
      expect(prices).toEqual({});
    });

    it("should handle missing price data for specific tokens", async () => {
      const mockResponse = {
        moonbeam: { usd: 0.5 },
        // polkadot data is missing
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const prices = await service.getTokenPrices(
        ["moonbeam", "polkadot"],
        "usd",
      );
      expect(prices).toEqual({ moonbeam: 0.5 });
    });

    it("should use default currency when not specified", async () => {
      const mockResponse = {
        moonbeam: { usd: 0.5 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await service.getTokenPrices(["moonbeam"]);
      expect(global.fetch as jest.Mock).toHaveBeenCalledWith(
        "/api/coingecko/simple/price?ids=moonbeam&vs_currencies=usd",
      );
    });
  });

  describe("getTokenPrice", () => {
    it("should fetch price for a single token", async () => {
      const mockResponse = {
        moonbeam: { usd: 0.5 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const price = await service.getTokenPrice("moonbeam", "usd");
      expect(price).toBe(0.5);
    });

    it("should fetch price with custom currency", async () => {
      const mockResponse = {
        moonbeam: { eur: 0.45 },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => mockResponse,
      } as Response);

      const price = await service.getTokenPrice("moonbeam", "eur");
      expect(price).toBe(0.45);
      expect(global.fetch as jest.Mock).toHaveBeenCalledWith(
        "/api/coingecko/simple/price?ids=moonbeam&vs_currencies=eur",
      );
    });

    it("should throw error when price not found", async () => {
      const mockResponse = {};

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await expect(service.getTokenPrice("nonexistent", "usd")).rejects.toThrow(
        "Price not found for token: nonexistent",
      );
    });
  });

  describe("clearCache", () => {
    it("should clear the price cache", async () => {
      const mockResponse = { moonbeam: { usd: 0.5 } };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      await service.getTokenPrices(["moonbeam"], "usd");
      expect(service.getLastUpdate()).toBeGreaterThan(0);

      service.clearCache();
      expect(service.getLastUpdate()).toBe(0);
    });
  });

  describe("getLastUpdate", () => {
    it("should return 0 for empty cache", () => {
      const newService = new PriceFeedService();
      expect(newService.getLastUpdate()).toBe(0);
    });

    it("should return timestamp after fetching prices", async () => {
      const mockResponse = { moonbeam: { usd: 0.5 } };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const beforeTime = Date.now();
      await service.getTokenPrices(["moonbeam"], "usd");
      const afterTime = Date.now();

      const lastUpdate = service.getLastUpdate();
      expect(lastUpdate).toBeGreaterThanOrEqual(beforeTime);
      expect(lastUpdate).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("setChainId", () => {
    it("should update the chain ID used for Chainlink lookups", async () => {
      service.setChainId(CHAIN_IDS.OPTIMISM);

      mockGetPricesByCoingeckoIds.mockResolvedValueOnce({ ethereum: 2500 });

      await service.getTokenPrices(["ethereum"], "usd");

      expect(mockGetPricesByCoingeckoIds).toHaveBeenCalledWith(
        CHAIN_IDS.OPTIMISM,
        ["ethereum"],
      );
    });
  });

  describe("getChainlinkUsdPrice", () => {
    it("should return price from Chainlink for a known token", async () => {
      mockGetPrice.mockResolvedValueOnce({
        price: 2500,
        symbol: "ETH",
        updatedAt: 0,
        isValid: true,
      });

      const price = await service.getChainlinkUsdPrice("ETH");

      expect(price).toBe(2500);
    });

    it("should return null when Chainlink has no data", async () => {
      mockGetPrice.mockResolvedValueOnce(null);

      const price = await service.getChainlinkUsdPrice("UNKNOWN");

      expect(price).toBeNull();
    });
  });

  describe("Chainlink-first pricing for USD", () => {
    it("should use Chainlink prices for USD requests", async () => {
      mockGetPricesByCoingeckoIds.mockResolvedValueOnce({ ethereum: 2500 });

      const prices = await service.getTokenPrices(["ethereum"], "usd");

      expect(prices).toEqual({ ethereum: 2500 });
      // Should not call CoinGecko when Chainlink succeeds
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should fall back to CoinGecko for tokens missing from Chainlink", async () => {
      mockGetPricesByCoingeckoIds.mockResolvedValueOnce({ ethereum: 2500 });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ "some-defi-token": { usd: 42 } }),
      } as Response);

      const prices = await service.getTokenPrices(
        ["ethereum", "some-defi-token"],
        "usd",
      );

      expect(prices).toEqual({ ethereum: 2500, "some-defi-token": 42 });
    });

    it("should use CoinGecko for non-USD currencies", async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ethereum: { eur: 2300 } }),
      } as Response);

      const prices = await service.getTokenPrices(["ethereum"], "eur");

      expect(prices).toEqual({ ethereum: 2300 });
      // Should NOT call Chainlink for non-USD
      expect(mockGetPricesByCoingeckoIds).not.toHaveBeenCalled();
    });

    it("should handle Chainlink failure and fall back to CoinGecko", async () => {
      mockGetPricesByCoingeckoIds.mockRejectedValueOnce(new Error("RPC error"));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ethereum: { usd: 2500 } }),
      } as Response);

      const prices = await service.getTokenPrices(["ethereum"], "usd");

      expect(prices).toEqual({ ethereum: 2500 });
    });
  });
});
