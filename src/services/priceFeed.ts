/**
 * Unified Price Feed Service
 * Primary: Chainlink on-chain price feeds (decentralized, no rate limits)
 * Fallback: CoinGecko API (for unsupported tokens or chains)
 */

import type { PriceCache, TokenPrice } from "@/types/blockchain";
import { Logger } from "@/utils/logger";
import { chainlinkPriceFeedService } from "./chainlinkPriceFeed";
import { CHAIN_IDS, type ChainId } from "@/config/contracts";

// CoinGecko fallback endpoint (through local proxy to avoid CORS)
const COINGECKO_API_BASE = "/api/coingecko";
const CACHE_DURATION_MS = 60000; // 1 minute

/**
 * Attempts to get all prices from cache
 */
function tryGetCachedPrices(
  priceCache: Record<string, TokenPrice>,
  tokenIds: string[],
  targetCurrency: string,
): Record<string, number> | null {
  const cachedPrices: Record<string, number> = {};

  for (const tokenId of tokenIds) {
    const cached = priceCache[`${tokenId}_${targetCurrency}`];
    if (cached?.currency === targetCurrency) {
      cachedPrices[tokenId] = cached.price;
    } else {
      return null;
    }
  }

  return cachedPrices;
}

/**
 * Gets any available stale prices from cache
 */
function getStalePrices(
  priceCache: Record<string, TokenPrice>,
  tokenIds: string[],
  targetCurrency: string,
): Record<string, number> {
  const stalePrices: Record<string, number> = {};

  for (const tokenId of tokenIds) {
    const cached = priceCache[`${tokenId}_${targetCurrency}`];
    if (cached) {
      stalePrices[tokenId] = cached.price;
    }
  }

  return stalePrices;
}

/**
 * Unified Price Feed Service
 * Uses Chainlink for USD prices, with CoinGecko fallback
 */
export class PriceFeedService {
  private priceCache: PriceCache = {
    prices: {},
    lastUpdate: 0,
  };

  /** Current chain ID for Chainlink lookups */
  private chainId: ChainId = CHAIN_IDS.BASE;

  /**
   * Set the chain ID for Chainlink price lookups
   * @param chainId - Chain ID to use
   */
  setChainId(chainId: ChainId | number): void {
    this.chainId = chainId as ChainId;
  }

  /**
   * Fetch current prices for multiple tokens
   * Uses Chainlink for USD prices, CoinGecko for currency conversion
   * @param tokenIds Array of CoinGecko token IDs (e.g., ["ethereum", "usd-coin"])
   * @param targetCurrency Target currency code (e.g., "usd", "eur")
   * @returns Record of token prices by token ID
   */
  async getTokenPrices(
    tokenIds: string[],
    targetCurrency = "usd",
  ): Promise<Record<string, number>> {
    const now = Date.now();

    // Check cache validity
    if (
      this.priceCache.lastUpdate &&
      now - this.priceCache.lastUpdate < CACHE_DURATION_MS
    ) {
      const cached = tryGetCachedPrices(
        this.priceCache.prices,
        tokenIds,
        targetCurrency,
      );
      if (cached) {
        return cached;
      }
    }

    const prices: Record<string, number> = {};

    // Resolve Chainlink prices for USD, or mark all tokens as missing for non-USD
    const missingTokens =
      targetCurrency.toLowerCase() === "usd"
        ? await this.resolveChainlinkPrices(
            tokenIds,
            prices,
            targetCurrency,
            now,
          )
        : [...tokenIds];

    // Fallback to CoinGecko for missing tokens or non-USD currencies
    if (missingTokens.length > 0) {
      await this.resolveFallbackPrices(
        missingTokens,
        prices,
        targetCurrency,
        now,
      );
    }

    this.priceCache.lastUpdate = now;

    Logger.info("Price feed: Fetched prices", {
      source: missingTokens.length === 0 ? "chainlink" : "mixed",
      priceCount: Object.keys(prices).length,
      targetCurrency,
    });

    return prices;
  }

  /**
   * Resolve prices from Chainlink, returning token IDs that were not found
   */
  private async resolveChainlinkPrices(
    tokenIds: string[],
    prices: Record<string, number>,
    targetCurrency: string,
    now: number,
  ): Promise<string[]> {
    const missingTokens: string[] = [];
    const chainlinkPrices = await this.fetchChainlinkPrices(tokenIds);

    for (const tokenId of tokenIds) {
      if (chainlinkPrices[tokenId] !== undefined) {
        prices[tokenId] = chainlinkPrices[tokenId];
        this.updateCache(
          tokenId,
          chainlinkPrices[tokenId],
          targetCurrency,
          now,
        );
      } else {
        missingTokens.push(tokenId);
      }
    }

    return missingTokens;
  }

  /**
   * Resolve prices from CoinGecko fallback, using stale cache on failure
   */
  private async resolveFallbackPrices(
    missingTokens: string[],
    prices: Record<string, number>,
    targetCurrency: string,
    now: number,
  ): Promise<void> {
    try {
      const coingeckoPrices = await PriceFeedService.fetchCoingeckoPrices(
        missingTokens,
        targetCurrency,
      );

      for (const tokenId of missingTokens) {
        if (coingeckoPrices[tokenId] !== undefined) {
          prices[tokenId] = coingeckoPrices[tokenId];
          this.updateCache(
            tokenId,
            coingeckoPrices[tokenId],
            targetCurrency,
            now,
          );
        }
      }
    } catch (error) {
      Logger.warn("Price feed: CoinGecko fallback failed", { error });

      // Use stale cache if available
      const stalePrices = getStalePrices(
        this.priceCache.prices,
        missingTokens,
        targetCurrency,
      );
      Object.assign(prices, stalePrices);
    }
  }

  /**
   * Fetch prices from Chainlink
   */
  private async fetchChainlinkPrices(
    tokenIds: string[],
  ): Promise<Record<string, number>> {
    const prices: Record<string, number> = {};

    try {
      // Get all prices from Chainlink
      const chainlinkResults =
        await chainlinkPriceFeedService.getPricesByCoingeckoIds(
          this.chainId,
          tokenIds,
        );

      Object.assign(prices, chainlinkResults);

      if (Object.keys(prices).length > 0) {
        Logger.info("Price feed: Chainlink prices fetched", {
          chainId: this.chainId,
          tokens: Object.keys(prices),
        });
      }
    } catch (error) {
      Logger.warn("Price feed: Chainlink fetch failed", { error });
    }

    return prices;
  }

  /**
   * Fetch prices from CoinGecko API (fallback)
   */
  private static async fetchCoingeckoPrices(
    tokenIds: string[],
    targetCurrency: string,
  ): Promise<Record<string, number>> {
    const url = `${COINGECKO_API_BASE}/simple/price?ids=${tokenIds.join(",")}&vs_currencies=${targetCurrency}`;

    Logger.info("Price feed: Fetching from CoinGecko", {
      tokenIds,
      targetCurrency,
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }

    const data: Record<string, Record<string, number>> = await response.json();
    const prices: Record<string, number> = {};

    for (const tokenId of tokenIds) {
      const tokenData = data[tokenId];
      if (tokenData?.[targetCurrency] !== undefined) {
        prices[tokenId] = tokenData[targetCurrency];
      }
    }

    return prices;
  }

  /**
   * Update the price cache
   */
  private updateCache(
    tokenId: string,
    price: number,
    currency: string,
    timestamp: number,
  ): void {
    this.priceCache.prices[`${tokenId}_${currency}`] = {
      tokenId,
      price,
      currency,
      timestamp,
    };
  }

  /**
   * Get price for a single token
   * @param tokenId CoinGecko token ID
   * @param targetCurrency Target currency code
   * @returns Token price in target currency
   */
  async getTokenPrice(
    tokenId: string,
    targetCurrency = "usd",
  ): Promise<number> {
    const prices = await this.getTokenPrices([tokenId], targetCurrency);
    const price = prices[tokenId];

    if (price === undefined) {
      throw new Error(`Price not found for token: ${tokenId}`);
    }

    return price;
  }

  /**
   * Get USD price using Chainlink directly (faster, no API limits)
   * @param tokenSymbol Token symbol (e.g., "ETH", "USDC")
   * @returns USD price or null
   */
  async getChainlinkUsdPrice(tokenSymbol: string): Promise<number | null> {
    const data = await chainlinkPriceFeedService.getPrice(
      this.chainId,
      tokenSymbol,
    );
    return data?.price ?? null;
  }

  /**
   * Clear the price cache
   */
  clearCache(): void {
    this.priceCache = {
      prices: {},
      lastUpdate: 0,
    };
    chainlinkPriceFeedService.clearCache();
    Logger.info("Price feed: Cache cleared");
  }

  /**
   * Get the last cache update timestamp
   */
  getLastUpdate(): number {
    return this.priceCache.lastUpdate;
  }
}

// Export singleton instance
/** Shared singleton instance of PriceFeedService. */
export const priceFeedService = new PriceFeedService();
