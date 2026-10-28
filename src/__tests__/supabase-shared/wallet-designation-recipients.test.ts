// Stand-alone test for the wallet-designation notice recipient builder.
// Runs under Jest (not Deno) but imports a Deno-style .ts file by relative
// path — this works because the module has no Deno-specific dependencies.
//
// buildNoticeRecipients is the single choke point that decides which inboxes
// receive wallet-change/attestation notices (GIV-1050 / MVP-CHR-07). A
// regression here would either drop the second contact (restoring the
// single-point-of-failure) or leak duplicate/placeholder addresses to the
// mail provider.

import { describe, it, expect } from "@jest/globals";
import { buildNoticeRecipients } from "../../../supabase/functions/_shared/wallet-designation-recipients.ts";

describe("buildNoticeRecipients", () => {
  it("returns only the signer when no second contact is captured", () => {
    expect(buildNoticeRecipients("signer@acme.org", null)).toEqual([
      "signer@acme.org",
    ]);
  });

  it("returns signer and second contact when both are present", () => {
    expect(
      buildNoticeRecipients("signer@acme.org", "second@acme.org"),
    ).toEqual(["signer@acme.org", "second@acme.org"]);
  });

  it("de-duplicates a second contact equal to the signer regardless of case", () => {
    expect(
      buildNoticeRecipients("signer@acme.org", "SIGNER@acme.org"),
    ).toEqual(["signer@acme.org"]);
    expect(
      buildNoticeRecipients("Signer@Acme.org", "signer@acme.org"),
    ).toEqual(["Signer@Acme.org"]);
  });

  it("keeps the real second contact when the signer address is a placeholder", () => {
    expect(
      buildNoticeRecipients(
        "charity-ein-123@wallet.giveprotocol.io",
        "second@acme.org",
      ),
    ).toEqual(["second@acme.org"]);
  });

  it("returns an empty list when both addresses are missing or placeholders", () => {
    expect(buildNoticeRecipients(null, null)).toEqual([]);
    expect(buildNoticeRecipients(undefined, undefined)).toEqual([]);
    expect(buildNoticeRecipients("", "   ")).toEqual([]);
    expect(
      buildNoticeRecipients(
        "a@wallet.giveprotocol.io",
        "b@wallet.giveprotocol.io",
      ),
    ).toEqual([]);
  });

  it("trims surrounding whitespace from addresses", () => {
    expect(
      buildNoticeRecipients("  signer@acme.org  ", "\tsecond@acme.org\n"),
    ).toEqual(["signer@acme.org", "second@acme.org"]);
  });
});
