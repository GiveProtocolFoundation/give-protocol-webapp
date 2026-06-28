import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { CHAIN_IDS } from "@/config/contracts";
import {
  mockLatestRoundData,
  mockDecimals,
  resetEthersMock,
} from "@/test-utils/ethersMock";

// Mock Logger
jest.mock("@/utils/logger", () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Use the shared ethers mock functions
const mockFns = {
  latestRoundData: mockLatestRoundData as jest.Mock<() => Promise<unknown>>,
  decimals: mockDecimals as jest.Mock<() => Promise<unknown>>,
};

import { ChainlinkPriceFeedService } from "./chainlinkPriceFeed";

describe("ChainlinkPriceFeedService", () => {
  let service: ChainlinkPriceFeedService;
  const now = Math.floor(Date.now() / 1000);

  beforeEach(() => {
    // Fully reset queued mock return values; clearAllMocks only clears history.
    resetEthersMock();
    service = new ChainlinkPriceFeedService();
  });

  describe("getPrice", () => {
    it("should fetch and return price data for a valid token", async () => {
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        250000000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const result = await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      expect(result).not.toBeNull();
      expect(result?.price).toBe(2500);
      expect(result?.symbol).toBe("GLMR");
      expect(result?.isValid).toBe(true);
    });

    it("should return cached data when cache is fresh", async () => {
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        250000000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      const result = await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      expect(result?.price).toBe(2500);
      expect(mockFns.latestRoundData).toHaveBeenCalledTimes(1);
    });

    it("should return null when no feeds configured for chain", async () => {
      const result = await service.getPrice(999999 as never, "ETH");
      expect(result).toBeNull();
    });

    it("should return null when token has no feed", async () => {
      const result = await service.getPrice(CHAIN_IDS.BASE, "NONEXISTENT");
      expect(result).toBeNull();
    });

    it("should return null when feed address is zero address", async () => {
      const result = await service.getPrice(CHAIN_IDS.MOONBASE, "DEV");
      expect(result).toBeNull();
    });

    it("should check sequencer uptime for L2 chains and pass when up", async () => {
      // Sequencer check: answer=0 means UP, past grace period
      mockFns.latestRoundData
        .mockResolvedValueOnce([1n, 0n, BigInt(now - 7200), BigInt(now), 1n])
        .mockResolvedValueOnce([
          1n,
          250000000000n,
          BigInt(now),
          BigInt(now - 60),
          1n,
        ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const result = await service.getPrice(CHAIN_IDS.BASE, "ETH");

      expect(result).not.toBeNull();
      expect(result?.price).toBe(2500);
    });

    it("should return null when sequencer is down and no cache", async () => {
      // answer=1 means DOWN
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        1n,
        BigInt(0),
        BigInt(0),
        1n,
      ]);

      const result = await service.getPrice(CHAIN_IDS.BASE, "ETH");
      expect(result).toBeNull();
    });

    it("should return null when sequencer is within grace period and no cache", async () => {
      // UP but startedAt = 30 seconds ago (within 1h grace)
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        0n,
        BigInt(now - 30),
        BigInt(now),
        1n,
      ]);

      const result = await service.getPrice(CHAIN_IDS.BASE, "ETH");
      expect(result).toBeNull();
    });

    it("should handle sequencer check errors gracefully (assumes up)", async () => {
      // Sequencer throws, then price feed succeeds
      mockFns.latestRoundData
        .mockRejectedValueOnce(new Error("RPC error"))
        .mockResolvedValueOnce([
          1n,
          250000000000n,
          BigInt(now),
          BigInt(now - 60),
          1n,
        ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const result = await service.getPrice(CHAIN_IDS.BASE, "ETH");

      expect(result).not.toBeNull();
      expect(result?.price).toBe(2500);
    });

    it("should mark stale data as invalid", async () => {
      const staleTimestamp = now - 200000;

      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        250000000000n,
        BigInt(now),
        BigInt(staleTimestamp),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const result = await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      expect(result).not.toBeNull();
      expect(result?.isValid).toBe(false);
    });

    it("should return null for non-positive price", async () => {
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        0n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const result = await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");
      expect(result).toBeNull();
    });

    it("should return stale cached data on contract error", async () => {
      // First call succeeds
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        250000000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      // Expire cache
      const priceCache = (
        service as unknown as {
          priceCache: Map<string, { fetchedAt: number; data: unknown }>;
        }
      ).priceCache;
      const entry = priceCache.get(`${CHAIN_IDS.MOONBEAM}_GLMR`);
      if (entry) {
        priceCache.set(`${CHAIN_IDS.MOONBEAM}_GLMR`, {
          ...entry,
          fetchedAt: 0,
        });
      }

      // Second call fails
      mockFns.latestRoundData.mockRejectedValueOnce(
        new Error("Contract error"),
      );

      const result = await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      expect(result).not.toBeNull();
      expect(result?.price).toBe(2500);
      expect(result?.isValid).toBe(false);
    });

    it("should return null on contract error with no cache", async () => {
      mockFns.latestRoundData.mockRejectedValueOnce(
        new Error("Contract error"),
      );

      const result = await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");
      expect(result).toBeNull();
    });

    it("should return stale cached data when sequencer is down", async () => {
      // First call: sequencer up + price
      mockFns.latestRoundData
        .mockResolvedValueOnce([1n, 0n, BigInt(now - 7200), BigInt(now), 1n])
        .mockResolvedValueOnce([
          1n,
          250000000000n,
          BigInt(now),
          BigInt(now - 60),
          1n,
        ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      await service.getPrice(CHAIN_IDS.BASE, "ETH");

      // Expire price cache and sequencer cache so the second call re-checks both
      const internals = service as unknown as {
        priceCache: Map<string, { fetchedAt: number; data: unknown }>;
        sequencerCache: Map<number, unknown>;
      };
      const entry = internals.priceCache.get(`${CHAIN_IDS.BASE}_ETH`);
      if (entry) {
        internals.priceCache.set(`${CHAIN_IDS.BASE}_ETH`, {
          ...entry,
          fetchedAt: 0,
        });
      }
      internals.sequencerCache.clear();

      // Second call: sequencer down
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        1n,
        BigInt(0),
        BigInt(0),
        1n,
      ]);

      const result = await service.getPrice(CHAIN_IDS.BASE, "ETH");

      expect(result).not.toBeNull();
      expect(result?.price).toBe(2500);
      expect(result?.isValid).toBe(false);
    });
  });

  describe("getPrices", () => {
    it("should fetch prices for multiple tokens", async () => {
      // GLMR
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        50000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);
      // DOT
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        750000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const results = await service.getPrices(CHAIN_IDS.MOONBEAM, [
        "GLMR",
        "DOT",
      ]);

      expect(results.size).toBe(2);
      expect(results.get("GLMR")?.price).toBe(0.5);
      expect(results.get("DOT")?.price).toBe(7.5);
    });

    it("should skip tokens that fail and continue", async () => {
      mockFns.latestRoundData
        .mockRejectedValueOnce(new Error("RPC error"))
        .mockResolvedValueOnce([
          1n,
          750000000n,
          BigInt(now),
          BigInt(now - 60),
          1n,
        ]);
      // First decimals() call is consumed alongside the rejected latestRoundData in Promise.all
      mockFns.decimals.mockResolvedValueOnce(8).mockResolvedValueOnce(8);

      const results = await service.getPrices(CHAIN_IDS.MOONBEAM, [
        "GLMR",
        "DOT",
      ]);

      expect(results.size).toBe(1);
      expect(results.get("DOT")?.price).toBe(7.5);
    });

    it("should catch unexpected errors thrown by getPrice", async () => {
      jest
        .spyOn(service, "getPrice")
        .mockRejectedValueOnce(new Error("unexpected"));

      const results = await service.getPrices(CHAIN_IDS.MOONBEAM, ["GLMR"]);

      expect(results.size).toBe(0);
    });
  });

  describe("getPriceByCoingeckoId", () => {
    it("should map coingecko ID to symbol and fetch price", async () => {
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        250000000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const price = await service.getPriceByCoingeckoId(
        CHAIN_IDS.MOONBEAM,
        "moonbeam",
      );
      expect(price).toBe(2500);
    });

    it("should return null for unknown coingecko ID", async () => {
      const price = await service.getPriceByCoingeckoId(
        CHAIN_IDS.BASE,
        "unknown-token",
      );
      expect(price).toBeNull();
    });
  });

  describe("getPricesByCoingeckoIds", () => {
    it("should fetch prices for multiple coingecko IDs", async () => {
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        250000000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        100000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const results = await service.getPricesByCoingeckoIds(
        CHAIN_IDS.MOONBEAM,
        ["moonbeam", "usd-coin"],
      );

      expect(results["moonbeam"]).toBe(2500);
      expect(results["usd-coin"]).toBe(1);
    });

    it("should skip unknown coingecko IDs", async () => {
      const results = await service.getPricesByCoingeckoIds(CHAIN_IDS.BASE, [
        "unknown-token",
      ]);
      expect(Object.keys(results)).toHaveLength(0);
    });

    it("should handle errors for individual tokens gracefully", async () => {
      mockFns.latestRoundData.mockRejectedValueOnce(new Error("RPC error"));

      const results = await service.getPricesByCoingeckoIds(
        CHAIN_IDS.MOONBEAM,
        ["moonbeam"],
      );
      expect(Object.keys(results)).toHaveLength(0);
    });

    it("should catch unexpected errors thrown by getPriceByCoingeckoId", async () => {
      jest
        .spyOn(service, "getPriceByCoingeckoId")
        .mockRejectedValueOnce(new Error("unexpected"));

      const results = await service.getPricesByCoingeckoIds(
        CHAIN_IDS.MOONBEAM,
        ["moonbeam"],
      );
      expect(Object.keys(results)).toHaveLength(0);
    });
  });

  describe("clearCache", () => {
    it("should clear the price cache", async () => {
      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        250000000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      service.clearCache();

      mockFns.latestRoundData.mockResolvedValueOnce([
        1n,
        300000000000n,
        BigInt(now),
        BigInt(now - 60),
        1n,
      ]);
      mockFns.decimals.mockResolvedValueOnce(8);

      const result = await service.getPrice(CHAIN_IDS.MOONBEAM, "GLMR");

      expect(result?.price).toBe(3000);
      expect(mockFns.latestRoundData).toHaveBeenCalledTimes(2);
    });
  });
});
