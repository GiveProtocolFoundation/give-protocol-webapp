// Stand-alone test for the canonical message builder. Runs under Jest (not
// Deno) but imports a Deno-style .ts file by relative path — this works
// because the module has no Deno-specific dependencies.
//
// The message format is a public contract between request-nonce (which
// returns it to the client for signing) and submit (which reconstructs it
// for signature verification). Drift between the two would break every
// designation. This test guards against accidental whitespace,
// punctuation, or field-order changes.

import { describe, it, expect } from "@jest/globals";
import { buildDesignationMessage } from "../../../supabase/functions/_shared/wallet-designation-message.ts";

describe("buildDesignationMessage", () => {
  const input = {
    charityName: "Acme Foundation",
    charityProfileId: "11111111-2222-3333-4444-555555555555",
    candidateAddress: "0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
    userEmail: "admin@acme.org",
    chainId: 1287,
    issuedAt: "2026-05-18T01:23:45.000Z",
    nonce: "deadbeefcafebabe",
  };

  it("produces a deterministic, byte-stable message", () => {
    const message = buildDesignationMessage(input);
    expect(message).toBe(
      [
        "Give Protocol — Designate official charity wallet",
        "",
        "Charity: Acme Foundation (11111111-2222-3333-4444-555555555555)",
        "Wallet:  0xAbCdEf0123456789AbCdEf0123456789AbCdEf01",
        "By user: admin@acme.org",
        "Chain:   1287",
        "Issued:  2026-05-18T01:23:45.000Z",
        "Nonce:   deadbeefcafebabe",
        "",
        "By signing, I confirm this wallet is controlled by the named charity",
        "and acknowledge that donations sent to it are intended for that charity.",
      ].join("\n"),
    );
  });

  it("changes when any input changes", () => {
    const base = buildDesignationMessage(input);
    const changedAddress = buildDesignationMessage({
      ...input,
      candidateAddress: "0x0000000000000000000000000000000000000000",
    });
    const changedChain = buildDesignationMessage({ ...input, chainId: 1 });
    const changedNonce = buildDesignationMessage({ ...input, nonce: "other" });

    expect(changedAddress).not.toBe(base);
    expect(changedChain).not.toBe(base);
    expect(changedNonce).not.toBe(base);
  });
});
