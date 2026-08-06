/**
 * Currency and number formatting utilities
 */

import { TokenConfig, FiatCurrency } from "@/config/tokens";
import { CurrencyFormatOptions } from "@/types/blockchain";

/**
 * Format large numbers with K, M, B notation
 * @param amount Amount to format
 * @param symbol Currency or token symbol
 * @param showSymbol Whether to show the symbol
 * @returns Formatted compact string
 * @example
 * ```ts
 * formatCompact(1234, "$") // "$1.23K"
 * formatCompact(1234567, "$") // "$1.23M"
 * formatCompact(1234567890, "$") // "$1.23B"
 * ```
 */
export function formatCompact(
  amount: number,
  symbol = "",
  showSymbol = true,
): string {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  let value: number;
  let suffix: string;

  if (absAmount >= 1_000_000_000) {
    value = absAmount / 1_000_000_000;
    suffix = "B";
  } else if (absAmount >= 1_000_000) {
    value = absAmount / 1_000_000;
    suffix = "M";
  } else if (absAmount >= 1_000) {
    value = absAmount / 1_000;
    suffix = "K";
  } else {
    value = absAmount;
    suffix = "";
  }

  const formatted = value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");

  if (showSymbol && symbol) {
    return `${sign}${symbol}${formatted}${suffix}`;
  }

  return `${sign}${formatted}${suffix}`;
}

/**
 * Format a fiat currency amount with proper localization
 * @param amount Amount to format
 * @param currency Fiat currency configuration
 * @param options Formatting options
 * @returns Formatted currency string
 * @example
 * ```ts
 * formatFiat(1234.56, { code: "USD", symbol: "$" }) // "$1,234.56"
 * formatFiat(1234.56, { code: "EUR", symbol: "€" }, { decimals: 0 }) // "€1,235"
 * formatFiat(1234567, { code: "USD", symbol: "$" }, { compact: true }) // "$1.23M"
 * ```
 */
export function formatFiat(
  amount: number,
  currency: Pick<FiatCurrency, "code" | "symbol">,
  options: CurrencyFormatOptions = {},
): string {
  const { showSymbol = true, decimals = 2, compact = false } = options;

  if (compact && amount >= 1000) {
    return formatCompact(amount, currency.symbol, showSymbol);
  }

  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.code,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);

  if (!showSymbol) {
    // Remove currency symbol
    return formatted.replaceAll(/[^0-9,.-]/g, "").trim();
  }

  return formatted;
}

/**
 * Format a cryptocurrency amount with proper decimal precision
 * @param amount Amount to format
 * @param token Token configuration
 * @param options Formatting options
 * @returns Formatted crypto amount string
 * @example
 * ```ts
 * formatCrypto(1.23456789, { symbol: "ETH", decimals: 18 }) // "1.235 ETH"
 * formatCrypto(0.00000123, { symbol: "BTC", decimals: 8 }) // "0.00000123 BTC"
 * formatCrypto(1234.5, { symbol: "ETH" }, { compact: true }) // "1.23K ETH"
 * ```
 */
export function formatCrypto(
  amount: number,
  token: Pick<TokenConfig, "symbol" | "decimals">,
  options: CurrencyFormatOptions = {},
): string {
  const { showSymbol = true, decimals, compact = false } = options;

  // Determine appropriate decimal places
  let decimalPlaces: number;
  if (decimals !== undefined) {
    decimalPlaces = decimals;
  } else if (amount < 0.01) {
    decimalPlaces = 8; // Show more decimals for very small amounts
  } else if (amount < 1) {
    decimalPlaces = 6;
  } else if (amount < 1000) {
    decimalPlaces = 4;
  } else {
    decimalPlaces = 2;
  }

  if (compact && amount >= 1000) {
    const compactNumber = formatCompact(amount, "", false);
    return showSymbol ? `${compactNumber} ${token.symbol}` : compactNumber;
  }

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimalPlaces,
  }).format(amount);

  return showSymbol ? `${formatted} ${token.symbol}` : formatted;
}

/**
 * Parse a formatted number string back to a number
 * @param formattedValue Formatted number string
 * @returns Parsed number value
 * @example
 * ```ts
 * parseFormattedNumber("$1,234.56") // 1234.56
 * parseFormattedNumber("€1.234,56") // 1234.56
 * ```
 */
export function parseFormattedNumber(formattedValue: string): number {
  // Remove all non-numeric characters except dots, commas, and minus
  const cleaned = formattedValue.replaceAll(/[^0-9.,-]/g, "");

  // Handle European format (comma as decimal separator)
  if (cleaned.includes(",") && cleaned.includes(".")) {
    // If both exist, assume comma is thousands separator
    return Number.parseFloat(cleaned.replaceAll(",", ""));
  } else if (cleaned.includes(",")) {
    // Comma as decimal separator
    return Number.parseFloat(cleaned.replace(",", "."));
  }

  return Number.parseFloat(cleaned) || 0;
}

/**
 * Format a percentage value
 * @param value Percentage value (e.g., 0.15 for 15%)
 * @param decimals Number of decimal places
 * @returns Formatted percentage string
 * @example
 * ```ts
 * formatPercentage(0.15) // "15.00%"
 * formatPercentage(0.1567, 1) // "15.7%"
 * ```
 */
export function formatPercentage(value: number, decimals = 2): string {
  const percentage = value * 100;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Abbreviate a wallet address for display
 * @param address Full wallet address
 * @param startChars Number of characters to show at start
 * @param endChars Number of characters to show at end
 * @returns Abbreviated address
 * @example
 * ```ts
 * abbreviateAddress("0x1234567890abcdef1234567890abcdef12345678") // "0x1234...5678"
 * abbreviateAddress("0x1234567890abcdef1234567890abcdef12345678", 6, 6) // "0x123456...345678"
 * ```
 */
export function abbreviateAddress(
  address: string,
  startChars = 6,
  endChars = 4,
): string {
  if (address.length <= startChars + endChars) {
    return address;
  }

  const start = address.slice(0, startChars);
  const end = address.slice(-endChars);
  return `${start}...${end}`;
}
