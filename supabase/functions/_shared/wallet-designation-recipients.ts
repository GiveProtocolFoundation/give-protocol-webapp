/**
 * Recipient-list construction for wallet-designation notices.
 *
 * Wallet-change and attestation notices must not be a single-point-of-failure
 * on the authorized signer's inbox (MVP-CHR-07 / GIV-1050). This helper turns
 * the primary (signer) email plus the distinct second contact captured at
 * onboarding into a de-duplicated list of deliverable recipients, dropping
 * empty values and the internal `@wallet.giveprotocol.io` placeholder
 * addresses that have no real inbox behind them.
 */

const PLACEHOLDER_SUFFIX = "@wallet.giveprotocol.io";

/**
 * Build the recipient list for a wallet-designation notice.
 * @param primaryEmail - The authorized signer email (may be null).
 * @param secondContactEmail - The second contact email, if captured (may be null).
 * @returns De-duplicated, placeholder-free recipient addresses in stable order.
 */
export function buildNoticeRecipients(
  primaryEmail?: string | null,
  secondContactEmail?: string | null,
): string[] {
  const seen = new Set<string>();
  const recipients: string[] = [];

  for (const raw of [primaryEmail, secondContactEmail]) {
    if (!raw) continue;
    const email = raw.trim();
    if (!email) continue;
    if (email.toLowerCase().endsWith(PLACEHOLDER_SUFFIX)) continue;
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    recipients.push(email);
  }

  return recipients;
}
