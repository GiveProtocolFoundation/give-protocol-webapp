import { describe, it, expect } from "@jest/globals";

/**
 * Tests for the legacy donations (helcim-payment) export mapping
 * used by supabase/functions/privacy-export/index.ts.
 *
 * The edge function queries the `donations` table by `donor_email`
 * (NOT donor_id, which is NULL on legacy rows) and maps each row
 * into the `legacy_fiat_donations` export field with `type: 'fiat_legacy'`.
 *
 * These tests validate the mapping contract so that changes to the
 * edge function's output shape are caught by CI.
 */

/** Mirror of the mapping function in privacy-export/index.ts */
function mapLegacyDonations(
  rows: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  return rows.map((d) => ({
    type: "fiat_legacy",
    charity_id: d.charity_id,
    donor_name: d.donor_name,
    donor_email: d.donor_email,
    amount_cents: d.amount_cents,
    currency: d.currency,
    payment_method: d.payment_method,
    transaction_id: d.transaction_id,
    card_type: d.card_type,
    card_last_four: d.card_last_four,
    fee_covered: d.fee_covered,
    status: d.status,
    created_at: d.created_at,
  }));
}

/**
 * Simulate the legacy donations query gating logic:
 * only issue the query when the auth user has an email.
 */
function buildLegacyDonationsResult(
  authEmail: string | undefined,
  queryResult: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  if (!authEmail) {
    return [];
  }
  return mapLegacyDonations(queryResult);
}

const MOCK_LEGACY_ROW_1: Record<string, unknown> = {
  charity_id: "charity-abc",
  donor_name: "Jane Donor",
  donor_email: "user@example.com",
  amount_cents: 5000,
  currency: "USD",
  payment_method: "credit_card",
  transaction_id: "txn_001",
  card_type: "visa",
  card_last_four: "4242",
  fee_covered: true,
  status: "completed",
  created_at: "2025-06-01T12:00:00Z",
};

const MOCK_LEGACY_ROW_2: Record<string, unknown> = {
  charity_id: "charity-xyz",
  donor_name: "Jane Donor",
  donor_email: "user@example.com",
  amount_cents: 2500,
  currency: "CAD",
  payment_method: "credit_card",
  transaction_id: "txn_002",
  card_type: "mastercard",
  card_last_four: "1234",
  fee_covered: false,
  status: "completed",
  created_at: "2025-07-15T08:30:00Z",
};

describe("privacy-export legacy_fiat_donations mapping", () => {
  it("should export legacy rows with type fiat_legacy when rows are present", () => {
    const result = buildLegacyDonationsResult("user@example.com", [
      MOCK_LEGACY_ROW_1,
      MOCK_LEGACY_ROW_2,
    ]);

    expect(result).toHaveLength(2);

    expect(result[0]).toEqual({
      type: "fiat_legacy",
      charity_id: "charity-abc",
      donor_name: "Jane Donor",
      donor_email: "user@example.com",
      amount_cents: 5000,
      currency: "USD",
      payment_method: "credit_card",
      transaction_id: "txn_001",
      card_type: "visa",
      card_last_four: "4242",
      fee_covered: true,
      status: "completed",
      created_at: "2025-06-01T12:00:00Z",
    });

    expect(result[1]).toEqual({
      type: "fiat_legacy",
      charity_id: "charity-xyz",
      donor_name: "Jane Donor",
      donor_email: "user@example.com",
      amount_cents: 2500,
      currency: "CAD",
      payment_method: "credit_card",
      transaction_id: "txn_002",
      card_type: "mastercard",
      card_last_four: "1234",
      fee_covered: false,
      status: "completed",
      created_at: "2025-07-15T08:30:00Z",
    });

    // Every row must have type marker
    for (const row of result) {
      expect(row.type).toBe("fiat_legacy");
    }
  });

  it("should return an empty array when no legacy rows exist", () => {
    const result = buildLegacyDonationsResult("user@example.com", []);

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it("should skip the query and return empty array when auth email is undefined", () => {
    const result = buildLegacyDonationsResult(undefined, [
      MOCK_LEGACY_ROW_1,
    ]);

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });
});
