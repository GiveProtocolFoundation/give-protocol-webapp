/**
 * Tests for volunteer_applications PII resolution in the privacy-export Edge Function.
 *
 * The Edge Function runs in Deno and cannot be imported directly into Jest.
 * This test mirrors the resolution logic (tryDecryptPII + resolve helpers)
 * and verifies the four export shapes required by GIV-419 Gap 2:
 *   1. Plaintext path — plaintext columns populated, encrypted columns null
 *   2. Encrypted-only path — plaintext null, encrypted columns present → decrypt via pii-crypto
 *   3. Sentinel path — plaintext '[deleted]' and encrypted null → post-erasure shape
 *   4. Failure path — encrypted column present but pii-crypto fails → fallback sentinel
 */

import { describe, it, expect, jest } from "@jest/globals";

// ---------------------------------------------------------------------------
// Mirror of tryDecryptPII from supabase/functions/privacy-export/index.ts
// ---------------------------------------------------------------------------

interface MockSupabaseClient {
  functions: {
    invoke: <T>(
      name: string,
      opts: { body: Record<string, unknown> },
    ) => Promise<{ data: T | null; error: Error | null }>;
  };
}

async function tryDecryptPII(
  supabase: MockSupabaseClient,
  ciphertext: string | null | undefined,
  field: string,
): Promise<string | null> {
  if (!ciphertext) return null;
  try {
    const { data, error } = await supabase.functions.invoke<{
      plaintext: string;
    }>("pii-crypto", { body: { operation: "decrypt", value: ciphertext, field } });
    if (error || !data?.plaintext) return null;
    return data.plaintext;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Mirror of the per-row resolver from assembleExportPackage
// ---------------------------------------------------------------------------

interface VolunteerAppRow {
  opportunity_id: string;
  status: string;
  applied_at: string;
  consent_given: boolean;
  international_transfers_consent: boolean;
  timezone: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  location: string | null;
  age_range: string | null;
  full_name_encrypted: string | null;
  email_encrypted: string | null;
  phone_encrypted: string | null;
}

async function resolveVolunteerApp(
  a: VolunteerAppRow,
  supabase: MockSupabaseClient,
) {
  const isAnonymized = (v: unknown) =>
    v === "[deleted]" || v === null || v === undefined;
  const resolve = async (
    plaintext: string | null | undefined,
    ciphertext: string | null | undefined,
    field: string,
  ): Promise<string | null> => {
    if (!isAnonymized(plaintext)) return plaintext as string;
    const decrypted = await tryDecryptPII(supabase, ciphertext, field);
    if (decrypted !== null) return decrypted;
    return ciphertext ? "[encrypted — decryption unavailable]" : null;
  };
  return {
    opportunity_id: a.opportunity_id,
    status: a.status,
    applied_at: a.applied_at,
    consent_given: a.consent_given,
    international_transfers_consent: a.international_transfers_consent,
    timezone: a.timezone,
    full_name: await resolve(a.full_name, a.full_name_encrypted, "full_name"),
    email: await resolve(a.email, a.email_encrypted, "email"),
    phone: await resolve(a.phone, a.phone_encrypted, "phone"),
    message: a.message ?? null,
    location: a.location ?? null,
    age_range: a.age_range ?? null,
  };
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_ROW: VolunteerAppRow = {
  opportunity_id: "opp-1",
  status: "approved",
  applied_at: "2026-01-15T10:00:00Z",
  consent_given: true,
  international_transfers_consent: false,
  timezone: "Europe/London",
  full_name: null,
  email: null,
  phone: null,
  message: null,
  location: null,
  age_range: null,
  full_name_encrypted: null,
  email_encrypted: null,
  phone_encrypted: null,
};

function makeMockSupabase(
  decryptResult:
    | { plaintext: string }
    | null = null,
  shouldError = false,
): MockSupabaseClient {
  return {
    functions: {
      invoke: jest.fn<MockSupabaseClient["functions"]["invoke"]>().mockImplementation(
        async () => {
          if (shouldError) {
            return { data: null, error: new Error("decrypt failed") };
          }
          return { data: decryptResult, error: null };
        },
      ),
    },
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("privacy-export: volunteer_applications PII resolution", () => {
  it("plaintext path — emits plaintext values when present", async () => {
    const row: VolunteerAppRow = {
      ...BASE_ROW,
      full_name: "Jane Doe",
      email: "j@x.io",
      phone: "+44 7700 900000",
      message: "hi",
      location: "London",
      age_range: "25-34",
    };
    const supabase = makeMockSupabase();

    const result = await resolveVolunteerApp(row, supabase);

    expect(result.full_name).toBe("Jane Doe");
    expect(result.email).toBe("j@x.io");
    expect(result.phone).toBe("+44 7700 900000");
    expect(result.message).toBe("hi");
    expect(result.location).toBe("London");
    expect(result.age_range).toBe("25-34");
    // pii-crypto should NOT have been called — plaintext was available
    expect(supabase.functions.invoke).not.toHaveBeenCalled();
  });

  it("encrypted-only path — decrypts via pii-crypto when plaintext is null", async () => {
    const row: VolunteerAppRow = {
      ...BASE_ROW,
      full_name: null,
      email: null,
      phone: null,
      full_name_encrypted: "v1:iv1:ct1",
      email_encrypted: "v1:iv2:ct2",
      phone_encrypted: "v1:iv3:ct3",
    };

    const invokeMock = jest
      .fn<MockSupabaseClient["functions"]["invoke"]>()
      .mockImplementation(async (_name, opts) => {
        const field = (opts.body as Record<string, unknown>).field as string;
        const map: Record<string, string> = {
          full_name: "Decrypted Jane",
          email: "decrypted@x.io",
          phone: "+44 decrypted",
        };
        return {
          data: { plaintext: map[field] ?? "" },
          error: null,
        };
      });

    const supabase: MockSupabaseClient = { functions: { invoke: invokeMock } };
    const result = await resolveVolunteerApp(row, supabase);

    expect(result.full_name).toBe("Decrypted Jane");
    expect(result.email).toBe("decrypted@x.io");
    expect(result.phone).toBe("+44 decrypted");
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });

  it("sentinel path — emits null when plaintext is '[deleted]' and encrypted is null", async () => {
    const row: VolunteerAppRow = {
      ...BASE_ROW,
      full_name: "[deleted]",
      email: "[deleted]",
      phone: "[deleted]",
      full_name_encrypted: null,
      email_encrypted: null,
      phone_encrypted: null,
    };
    const supabase = makeMockSupabase();

    const result = await resolveVolunteerApp(row, supabase);

    expect(result.full_name).toBeNull();
    expect(result.email).toBeNull();
    expect(result.phone).toBeNull();
  });

  it("failure path — emits fallback sentinel when pii-crypto returns error", async () => {
    const row: VolunteerAppRow = {
      ...BASE_ROW,
      full_name: null,
      email: null,
      phone: null,
      full_name_encrypted: "v1:iv1:ct1",
      email_encrypted: "v1:iv2:ct2",
      phone_encrypted: "v1:iv3:ct3",
    };
    const supabase = makeMockSupabase(null, true);

    const result = await resolveVolunteerApp(row, supabase);

    expect(result.full_name).toBe("[encrypted — decryption unavailable]");
    expect(result.email).toBe("[encrypted — decryption unavailable]");
    expect(result.phone).toBe("[encrypted — decryption unavailable]");
  });

  it("preserves non-encrypted fields unchanged", async () => {
    const row: VolunteerAppRow = {
      ...BASE_ROW,
      full_name: "Jane",
      email: "j@x.io",
      phone: "+1",
      message: "hello",
      location: "NYC",
      age_range: "18-24",
    };
    const supabase = makeMockSupabase();
    const result = await resolveVolunteerApp(row, supabase);

    expect(result.opportunity_id).toBe("opp-1");
    expect(result.status).toBe("approved");
    expect(result.applied_at).toBe("2026-01-15T10:00:00Z");
    expect(result.consent_given).toBe(true);
    expect(result.international_transfers_consent).toBe(false);
    expect(result.timezone).toBe("Europe/London");
    expect(result.message).toBe("hello");
    expect(result.location).toBe("NYC");
    expect(result.age_range).toBe("18-24");
  });
});
