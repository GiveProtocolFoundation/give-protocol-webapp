/**
 * Unit tests for donation-receipt formatAmount logic.
 *
 * Run with: deno test supabase/functions/donation-receipt/formatAmount_test.ts
 *
 * These tests verify that zero-decimal currencies (JPY, KRW, etc.) are
 * formatted without dividing by 100, while normal currencies (USD, EUR)
 * convert cents → major units correctly.
 */

import {
  assertEquals,
  assertMatch,
} from "https://deno.land/std@0.168.0/testing/asserts.ts";

// ── Mirrors the production constants and function from index.ts ──

const ZERO_DECIMAL_CURRENCIES = [
  "BIF",
  "CLP",
  "DJF",
  "GNF",
  "JPY",
  "KMF",
  "KRW",
  "MGA",
  "PYG",
  "RWF",
  "UGX",
  "VND",
  "VUV",
  "XAF",
  "XOF",
  "XPF",
];

/**
 * Formats an amount in cents into a localized currency string.
 *
 * @param cents - The amount in the smallest currency unit (e.g., cents).
 * @param currency - The currency code (e.g., "USD").
 * @returns The formatted currency string.
 */
function formatAmount(cents: number, currency: string): string {
  const major = ZERO_DECIMAL_CURRENCIES.includes(currency.toUpperCase())
    ? cents
    : cents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(major);
  } catch {
    return `${currency.toUpperCase()} ${major.toFixed(2)}`;
  }
}

// ── Tests ──

Deno.test("formatAmount: USD cents are divided by 100", () => {
  const result = formatAmount(5000, "USD");
  assertEquals(result, "$50.00");
});

Deno.test("formatAmount: JPY (zero-decimal) is NOT divided by 100", () => {
  const result = formatAmount(500, "JPY");
  // Intl formats JPY without decimals: "¥500"
  assertEquals(result, "¥500");
});

Deno.test("formatAmount: KRW (zero-decimal) is NOT divided by 100", () => {
  const result = formatAmount(10000, "KRW");
  // Intl formats KRW with a ₩ symbol
  assertMatch(result, /₩.*10,000/u);
});

Deno.test("formatAmount: VND (zero-decimal) is NOT divided by 100", () => {
  const result = formatAmount(50000, "VND");
  assertMatch(result, /50,000/);
});

Deno.test("formatAmount: EUR cents are divided by 100", () => {
  const result = formatAmount(2599, "EUR");
  // Intl en-US formats EUR as "€25.99"
  assertEquals(result, "€25.99");
});

Deno.test("formatAmount: GBP cents are divided by 100", () => {
  const result = formatAmount(100, "GBP");
  assertEquals(result, "£1.00");
});

Deno.test("formatAmount: currency code is case-insensitive", () => {
  const upper = formatAmount(500, "JPY");
  const lower = formatAmount(500, "jpy");
  assertEquals(upper, lower);
});

Deno.test("formatAmount: unknown currency falls back gracefully", () => {
  const result = formatAmount(1000, "XYZ");
  // Intl may throw for unknown codes → fallback path
  assertMatch(result, /XYZ/);
});
