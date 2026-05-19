/**
 * Fiat currency configuration with payment processor routing.
 * USD routes to Helcim; all other currencies route to PayPal.
 */

export interface FiatCurrencyConfig {
  code: string;
  name: string;
  symbol: string;
  processor: "helcim" | "paypal";
  presets: number[];
  enabled: boolean;
}

/** All supported fiat currencies with their payment processor routing and preset amounts. */
export const FIAT_CURRENCIES: FiatCurrencyConfig[] = [
  {
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    processor: "helcim",
    presets: [25, 50, 100, 250],
    enabled: true,
  },
  {
    code: "EUR",
    name: "Euro",
    symbol: "€",
    processor: "paypal",
    presets: [25, 50, 100, 250],
    enabled: true,
  },
  {
    code: "GBP",
    name: "British Pound",
    symbol: "£",
    processor: "paypal",
    presets: [20, 50, 100, 200],
    enabled: true,
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    symbol: "C$",
    processor: "paypal",
    presets: [25, 50, 100, 250],
    enabled: true,
  },
  {
    code: "AUD",
    name: "Australian Dollar",
    symbol: "A$",
    processor: "paypal",
    presets: [25, 50, 100, 250],
    enabled: true,
  },
  {
    code: "JPY",
    name: "Japanese Yen",
    symbol: "¥",
    processor: "paypal",
    presets: [3000, 5000, 10000, 30000],
    enabled: true,
  },
  {
    code: "CHF",
    name: "Swiss Franc",
    symbol: "CHF",
    processor: "paypal",
    presets: [25, 50, 100, 250],
    enabled: true,
  },
  {
    code: "INR",
    name: "Indian Rupee",
    symbol: "₹",
    processor: "paypal",
    presets: [500, 1000, 2500, 5000],
    enabled: true,
  },
  {
    code: "KRW",
    name: "Korean Won",
    symbol: "₩",
    processor: "paypal",
    presets: [10000, 30000, 50000, 100000],
    enabled: true,
  },
  {
    code: "NGN",
    name: "Nigerian Naira",
    symbol: "₦",
    processor: "paypal",
    presets: [5000, 10000, 25000, 50000],
    enabled: true,
  },
];

/**
 * Get currency config by code
 * @param code - Three-letter currency code
 * @returns Currency config or undefined
 */
export function getFiatCurrencyByCode(
  code: string,
): FiatCurrencyConfig | undefined {
  return FIAT_CURRENCIES.find(
    (c) => c.code.toLowerCase() === code.toLowerCase(),
  );
}

/**
 * Get enabled currencies only
 * @returns Array of enabled currency configs
 */
export function getEnabledCurrencies(): FiatCurrencyConfig[] {
  return FIAT_CURRENCIES.filter((c) => c.enabled);
}

/** Zero-decimal currencies where amounts are in whole units (no cents) */
const ZERO_DECIMAL_CURRENCIES = new Set(["JPY", "KRW"]);

/**
 * Check if a currency uses zero-decimal amounts
 * @param code - Three-letter currency code
 * @returns True if the currency has no decimal subdivision
 */
export function isZeroDecimalCurrency(code: string): boolean {
  return ZERO_DECIMAL_CURRENCIES.has(code.toUpperCase());
}

/**
 * Format an amount with the correct currency symbol and decimals
 * @param amount - Numeric amount
 * @param currency - Currency config
 * @returns Formatted string like "$25.00" or "¥3,000"
 */
export function formatCurrencyAmount(
  amount: number,
  currency: FiatCurrencyConfig,
): string {
  const decimals = isZeroDecimalCurrency(currency.code) ? 0 : 2;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
  return `${currency.symbol}${formatted}`;
}
