/**
 * Canonical wallet designation message builder.
 *
 * Used by both the request-nonce function (to return the message to the
 * client for signing) and the submit function (to reconstruct it
 * server-side for verification). Must be byte-identical between the two —
 * any drift breaks signature verification.
 */

export interface DesignationMessageInput {
  charityName: string;
  charityProfileId: string;
  candidateAddress: string;
  userEmail: string;
  chainId: number;
  issuedAt: string; // ISO 8601, UTC
  nonce: string;
}

/**
 * Build the human-readable message that a charity admin signs to designate
 * their official wallet. Format is intentionally stable; do not reformat
 * without coordinating across request-nonce and submit functions.
 */
export function buildDesignationMessage(
  input: DesignationMessageInput,
): string {
  return [
    "Give Protocol — Designate official charity wallet",
    "",
    `Charity: ${input.charityName} (${input.charityProfileId})`,
    `Wallet:  ${input.candidateAddress}`,
    `By user: ${input.userEmail}`,
    `Chain:   ${input.chainId}`,
    `Issued:  ${input.issuedAt}`,
    `Nonce:   ${input.nonce}`,
    "",
    "By signing, I confirm this wallet is controlled by the named charity",
    "and acknowledge that donations sent to it are intended for that charity.",
  ].join("\n");
}
