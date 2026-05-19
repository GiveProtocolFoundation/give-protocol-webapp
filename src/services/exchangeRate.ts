/**
 * Exchange rate service for converting between fiat currencies
 * Uses exchangerate-api.com for free-tier exchange rates
 */

import { Logger } from "@/utils/logger";

interface ExchangeRateCache {
  rates: Record<string, number>;
  lastUpdate: number;
  baseCurrency: string;
}

// Use local proxy to avoid CORS issues
const EXCHANGE_RATE_API_BASE = "/api/exchangerate";
const CACHE_DURATION_MS = 3600000; // 1 hour

/**
 * Service for fetching and caching fiat currency exchange rates
 */
export class ExchangeRateService {
  private cache: ExchangeRateCache = {
    rates: {},
    lastUpdate: 0,
    baseCurrency: "USD",
  };

  /**
   * Get exchange rate from USD to target currency
   * @param targetCurrency Target currency code (e.g., "EUR", "GBP")
   * @returns Exchange rate (e.g., 0.92 for USD to EUR)
   */
  async getExchangeRate(targetCurrency: string): Promise<number> {
    // USD to USD is always 1
    if (targetCurrency === "USD") {
      return 1;
    }

    const now = Date.now();
    const targetUpper = targetCurrency.toUpperCase();

    // Check cache validity
    if (
      this.cache.lastUpdate &&
      now - this.cache.lastUpdate < CACHE_DURATION_MS &&
      this.cache.rates[targetUpper] !== undefined
    ) {
      Logger.info("Exchange rate: Using cached rate", {
        target: targetUpper,
        rate: this.cache.rates[targetUpper],
      });
      return this.cache.rates[targetUpper];
    }

    // Fetch fresh rates
    try {
      Logger.info("Exchange rate: Fetching rates", { base: "USD" });

      const response = await fetch(`${EXCHANGE_RATE_API_BASE}/USD`);

      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.statusText}`);
      }

      const data: { rates: Record<string, number> } = await response.json();

      if (!data.rates) {
        throw new Error("Invalid exchange rate response");
      }

      // Update cache
      this.cache = {
        rates: data.rates,
        lastUpdate: now,
        baseCurrency: "USD",
      };

      const rate = data.rates[targetUpper];

      if (rate === undefined) {
        throw new Error(`Exchange rate not found for currency: ${targetUpper}`);
      }

      Logger.info("Exchange rate: Fetched fresh rate", {
        target: targetUpper,
        rate,
      });

      return rate;
    } catch (error) {
      Logger.error("Exchange rate: Failed to fetch", {
        error,
        target: targetUpper,
      });

      // Try to use stale cache
      if (this.cache.rates[targetUpper] !== undefined) {
        Logger.warn("Exchange rate: Using stale cached rate", {
          target: targetUpper,
          rate: this.cache.rates[targetUpper],
        });
        return this.cache.rates[targetUpper];
      }

      throw new Error(
        `Failed to fetch exchange rate for ${targetUpper} and no cache available`,
      );
    }
  }

  /**
   * Convert amount from USD to target currency
   * @param amountUSD Amount in USD
   * @param targetCurrency Target currency code
   * @returns Converted amount in target currency
   */
  async convertFromUSD(
    amountUSD: number,
    targetCurrency: string,
  ): Promise<number> {
    const rate = await this.getExchangeRate(targetCurrency);
    return amountUSD * rate;
  }

  /**
   * Convert amount from source currency to USD
   * @param amount Amount in source currency
   * @param sourceCurrency Source currency code
   * @returns Converted amount in USD
   */
  async convertToUSD(amount: number, sourceCurrency: string): Promise<number> {
    if (sourceCurrency === "USD") {
      return amount;
    }

    const rate = await this.getExchangeRate(sourceCurrency);
    return amount / rate;
  }

  /**
   * Get all cached exchange rates
   * @returns Record of exchange rates by currency code
   */
  getAllRates(): Record<string, number> {
    return { ...this.cache.rates };
  }

  /**
   * Clear the exchange rate cache
   */
  clearCache(): void {
    this.cache = {
      rates: {},
      lastUpdate: 0,
      baseCurrency: "USD",
    };
    Logger.info("Exchange rate: Cache cleared");
  }

  /**
   * Get the last cache update timestamp
   * @returns Timestamp in milliseconds
   */
  getLastUpdate(): number {
    return this.cache.lastUpdate;
  }
}

// Export singleton instance
/** Shared singleton instance of ExchangeRateService. */
export const exchangeRateService = new ExchangeRateService();
