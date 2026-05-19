/**
 * Wallet designation confirmation email — sender + template.
 *
 * Generates a single-use confirmation token, persists it, sends an email
 * to the charity's authorized_signer_email via Resend, and writes an
 * audit row. Returns the confirmation URL the user will click.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

interface SendArgs {
  supabaseUrl: string;
  supabaseServiceKey: string;
  resendApiKey: string;
  /** Sender used as the Resend "from" address. Falls back to the legacy hardcoded sender. */
  resendFromEmail?: string;
  publicAppUrl: string;
  charityProfileId: string;
  charityName: string;
  candidateAddress: string;
  walletKind: "eoa" | "contract";
  chainId: number;
  initiatedByEmail: string;
  signature: string;
  message: string;
  toEmail: string;
}

function escapeHtml(text: string): string {
  return text.replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c,
  );
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Persist a confirmation token, send the confirmation email, write audit
 * rows. Returns the token (caller may want to log it; the URL is also
 * embedded in the email).
 */
export async function sendWalletDesignationConfirmation(
  args: SendArgs,
): Promise<{ token: string; confirmUrl: string }> {
  const supabase = createClient(args.supabaseUrl, args.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = randomToken();
  const expiresAt = new Date(Date.now() + CONFIRMATION_TTL_MS).toISOString();

  const { error: insertError } = await supabase
    .from("wallet_designation_confirmations")
    .insert({
      token,
      charity_profile_id: args.charityProfileId,
      candidate_address: args.candidateAddress,
      sent_to_email: args.toEmail,
      expires_at: expiresAt,
    });
  if (insertError) {
    throw new Error(
      `Failed to persist confirmation token: ${insertError.message}`,
    );
  }

  const confirmUrl = `${args.publicAppUrl.replace(/\/$/, "")}/charity-portal/confirm-wallet?token=${token}`;

  // Skip wallet-only placeholder emails (no real inbox behind them)
  if (args.toEmail.endsWith("@wallet.giveprotocol.io")) {
    console.warn(
      `Skipping email send — placeholder address ${args.toEmail} for charity ${args.charityProfileId}`,
    );
    return { token, confirmUrl };
  }

  const safeName = escapeHtml(args.charityName);
  const safeAddress = escapeHtml(args.candidateAddress);
  const safeInitiator = escapeHtml(args.initiatedByEmail);
  const kindLabel =
    args.walletKind === "contract"
      ? "Smart contract wallet (multi-sig)"
      : "Externally owned account (EOA)";

  const subject = `Confirm official wallet for ${safeName}`;
  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Give Protocol</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;margin-top:0;">Confirm your charity's official wallet</h2>
    <p>A signed request was submitted to set the following wallet as the official
       receiving address for <strong>${safeName}</strong>:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Wallet</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;word-break:break-all;">${safeAddress}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Type</td>
          <td style="padding:8px 12px;font-size:13px;">${kindLabel}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Chain ID</td>
          <td style="padding:8px 12px;font-size:13px;">${args.chainId}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Initiated by</td>
          <td style="padding:8px 12px;font-size:13px;">${safeInitiator}</td></tr>
    </table>
    <p>If you initiated this request, click below to activate this wallet.
       Until you do, donations to this charity remain disabled.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${confirmUrl}" style="background:#10b981;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
        Confirm wallet
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">This link expires in 24 hours and can only be used once.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#6b7280;">
      <strong>Didn't request this?</strong> Do not click the link. Email
      <a href="mailto:support@giveprotocol.io">support@giveprotocol.io</a>
      immediately — your account may be compromised.
    </p>
  </div>
</body>
</html>`;

  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from:
        args.resendFromEmail ?? "Give Protocol <notifications@giveprotocol.io>",
      to: [args.toEmail],
      subject,
      html,
    }),
  });

  if (!sendResponse.ok) {
    const errText = await sendResponse.text();
    console.error(`Resend API error ${sendResponse.status}:`, errText);
    throw new Error(`Email delivery failed: ${sendResponse.status}`);
  }

  // Audit row
  await supabase.from("charity_wallet_designations_history").insert({
    charity_profile_id: args.charityProfileId,
    new_address: args.candidateAddress,
    wallet_kind: args.walletKind,
    signature: args.signature,
    message: args.message,
    chain_id: args.chainId,
    action: "email_sent",
  });

  return { token, confirmUrl };
}
