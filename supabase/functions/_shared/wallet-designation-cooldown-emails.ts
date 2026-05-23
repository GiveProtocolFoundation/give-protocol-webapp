/**
 * Email templates for the wallet-change cooldown lifecycle:
 *  - "Confirm wallet change" (sent at submit time; same magic-link shape as the
 *    initial-designation confirmation, but worded for a change)
 *  - "Wallet change scheduled — 72h cooldown" (sent when the user clicks the
 *    confirmation link; includes the cancel magic link)
 *  - "Reminder — 48h remaining" / "Reminder — 24h remaining" (sent by cron)
 *  - "Wallet change completed" (sent when cron promotes pending → active)
 *  - "Wallet change cancelled" (sent when cancel happens, with IP for audit)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CONFIRMATION_TTL_MS = 24 * 60 * 60 * 1000;

/** Escape HTML special characters to prevent injection in email bodies. */
export function escapeHtml(text: string): string {
  return text.replace(
    /[<>&]/g,
    (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[c] ?? c,
  );
}

/** Generate a 32-byte hex token used for confirmation/cancel magic links. */
export function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${title}</title></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Give Protocol</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    ${bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#6b7280;">
      Questions? Contact <a href="mailto:support@giveprotocol.io">support@giveprotocol.io</a>.
    </p>
  </div>
</body></html>`;
}

async function sendViaResend(args: {
  resendApiKey: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  html: string;
}): Promise<void> {
  // Skip placeholder addresses.
  if (args.toEmail.endsWith("@wallet.giveprotocol.io")) {
    console.warn(`Skipping email — placeholder address ${args.toEmail}`);
    return;
  }
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: args.fromEmail,
      to: [args.toEmail],
      subject: args.subject,
      html: args.html,
    }),
  });
  if (!r.ok) {
    const errText = await r.text();
    throw new Error(`Resend ${r.status}: ${errText}`);
  }
}

interface CommonArgs {
  supabaseUrl: string;
  supabaseServiceKey: string;
  resendApiKey: string;
  resendFromEmail?: string;
  publicAppUrl: string;
  charityProfileId: string;
  charityName: string;
  toEmail: string;
}

function defaultFrom(arg?: string): string {
  return arg ?? "Give Protocol <notifications@giveprotocol.io>";
}

/**
 * Send the confirmation email for a wallet CHANGE (not initial). Persists a
 * confirmation token with purpose='change' so the confirm function knows
 * the click should enter cooldown rather than activate immediately.
 */
export async function sendChangeConfirmationEmail(
  args: CommonArgs & {
    candidateAddress: string;
    walletKind: "eoa" | "contract";
    chainId: number;
    initiatedByEmail: string;
    currentWalletAddress: string;
    signature: string;
    message: string;
  },
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
      purpose: "change",
    });
  if (insertError) {
    throw new Error(
      `Failed to persist change-confirmation token: ${insertError.message}`,
    );
  }
  const confirmUrl = `${args.publicAppUrl.replace(/\/$/, "")}/charity-portal/confirm-wallet?token=${token}`;

  const html = emailShell(
    `Confirm wallet change for ${escapeHtml(args.charityName)}`,
    `
    <h2 style="color:#111827;margin-top:0;">Confirm your charity's wallet change</h2>
    <p>A signed request was submitted to change the official receiving wallet
       for <strong>${escapeHtml(args.charityName)}</strong>.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Current wallet</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;word-break:break-all;">${escapeHtml(args.currentWalletAddress)}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">New wallet</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;word-break:break-all;color:#10b981;font-weight:600;">${escapeHtml(args.candidateAddress)}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Type</td>
          <td style="padding:8px 12px;font-size:13px;">${args.walletKind === "contract" ? "Smart contract wallet (multi-sig)" : "Externally owned account (EOA)"}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Initiated by</td>
          <td style="padding:8px 12px;font-size:13px;">${escapeHtml(args.initiatedByEmail)}</td></tr>
    </table>
    <p>Clicking the button below starts a <strong>72-hour cooldown</strong>.
       During that time, donations continue to flow to your current wallet and
       you can cancel the change with one click if it wasn't authorized.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${confirmUrl}" style="background:#10b981;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
        Confirm wallet change
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">This link expires in 24 hours and can only be used once.</p>
    <p style="font-size:12px;color:#6b7280;"><strong>Didn't request this?</strong>
       Do not click the link. Email <a href="mailto:support@giveprotocol.io">support@giveprotocol.io</a>
       immediately — your account may be compromised.</p>
  `,
  );

  await sendViaResend({
    resendApiKey: args.resendApiKey,
    fromEmail: defaultFrom(args.resendFromEmail),
    toEmail: args.toEmail,
    subject: `Confirm wallet change for ${args.charityName}`,
    html,
  });
  return { token, confirmUrl };
}

/**
 * Send the "Wallet change scheduled" email after the user clicks the
 * confirmation magic link. Mints a cancel token with TTL = end of cooldown.
 */
export async function sendCooldownStartedEmail(
  args: CommonArgs & {
    currentWalletAddress: string;
    newWalletAddress: string;
    effectiveAt: string;
  },
): Promise<{ cancelToken: string; cancelUrl: string }> {
  const supabase = createClient(args.supabaseUrl, args.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const cancelToken = randomToken();
  const { error: insertError } = await supabase
    .from("wallet_designation_cancel_tokens")
    .insert({
      token: cancelToken,
      charity_profile_id: args.charityProfileId,
      expires_at: args.effectiveAt,
    });
  if (insertError) {
    throw new Error(
      `Failed to persist cancel token: ${insertError.message}`,
    );
  }
  const cancelUrl = `${args.publicAppUrl.replace(/\/$/, "")}/charity-portal/cancel-wallet-change?token=${cancelToken}`;
  const effectiveLocal = new Date(args.effectiveAt).toUTCString();

  const html = emailShell(
    `Wallet change scheduled for ${escapeHtml(args.charityName)}`,
    `
    <h2 style="color:#111827;margin-top:0;">Wallet change is scheduled</h2>
    <p>The official receiving wallet for <strong>${escapeHtml(args.charityName)}</strong>
       will change in <strong>72 hours</strong> unless you cancel.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Current wallet (still active)</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;word-break:break-all;">${escapeHtml(args.currentWalletAddress)}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">New wallet (effective ${effectiveLocal})</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;word-break:break-all;color:#10b981;font-weight:600;">${escapeHtml(args.newWalletAddress)}</td></tr>
    </table>
    <p>Donations continue to flow to your current wallet during the cooldown.</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${cancelUrl}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
        Cancel this change
      </a>
    </p>
    <p style="font-size:12px;color:#6b7280;">You will receive reminders 24 hours and 48 hours into the cooldown.</p>
  `,
  );

  await sendViaResend({
    resendApiKey: args.resendApiKey,
    fromEmail: defaultFrom(args.resendFromEmail),
    toEmail: args.toEmail,
    subject: `Wallet change scheduled — 72h cooldown started for ${args.charityName}`,
    html,
  });
  return { cancelToken, cancelUrl };
}

/** Reminder sent partway through the cooldown window. */
export async function sendCooldownReminderEmail(
  args: CommonArgs & {
    cancelUrl: string;
    hoursRemaining: number;
    currentWalletAddress: string;
    newWalletAddress: string;
  },
): Promise<void> {
  const html = emailShell(
    `Reminder: wallet change for ${escapeHtml(args.charityName)} in ${args.hoursRemaining}h`,
    `
    <h2 style="color:#111827;margin-top:0;">Reminder: wallet change in ${args.hoursRemaining} hours</h2>
    <p>The receiving wallet for <strong>${escapeHtml(args.charityName)}</strong>
       changes from <span style="font-family:monospace;font-size:12px;">${escapeHtml(args.currentWalletAddress)}</span>
       to <span style="font-family:monospace;font-size:12px;color:#10b981;">${escapeHtml(args.newWalletAddress)}</span>
       in <strong>${args.hoursRemaining} hours</strong>.</p>
    <p>If you didn't authorize this change, cancel it now:</p>
    <p style="text-align:center;margin:24px 0;">
      <a href="${args.cancelUrl}" style="background:#dc2626;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;font-weight:600;">
        Cancel this change
      </a>
    </p>
  `,
  );

  await sendViaResend({
    resendApiKey: args.resendApiKey,
    fromEmail: defaultFrom(args.resendFromEmail),
    toEmail: args.toEmail,
    subject: `Reminder: wallet change for ${args.charityName} in ${args.hoursRemaining}h`,
    html,
  });
}

/** Sent when cron promotes pending → active at the end of cooldown. */
export async function sendChangeCompletedEmail(
  args: CommonArgs & {
    newWalletAddress: string;
  },
): Promise<void> {
  const html = emailShell(
    `Wallet change completed for ${escapeHtml(args.charityName)}`,
    `
    <h2 style="color:#111827;margin-top:0;">Wallet change is now live</h2>
    <p>The official receiving wallet for <strong>${escapeHtml(args.charityName)}</strong>
       is now:</p>
    <p style="font-family:monospace;font-size:14px;word-break:break-all;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:12px;color:#10b981;font-weight:600;">${escapeHtml(args.newWalletAddress)}</p>
    <p>All new donations will flow to this address.</p>
  `,
  );

  await sendViaResend({
    resendApiKey: args.resendApiKey,
    fromEmail: defaultFrom(args.resendFromEmail),
    toEmail: args.toEmail,
    subject: `Wallet change completed for ${args.charityName}`,
    html,
  });
}

/** Audit notice sent when a pending change is cancelled. Includes the cancel IP. */
export async function sendChangeCancelledEmail(
  args: CommonArgs & {
    cancelledWalletAddress: string;
    currentWalletAddress: string;
    cancelSource: "email_link" | "dashboard";
    cancelIp: string | null;
  },
): Promise<void> {
  const sourceLabel =
    args.cancelSource === "email_link" ? "email cancel link" : "charity dashboard";
  const html = emailShell(
    `Wallet change cancelled for ${escapeHtml(args.charityName)}`,
    `
    <h2 style="color:#111827;margin-top:0;">Wallet change cancelled</h2>
    <p>A pending wallet change for <strong>${escapeHtml(args.charityName)}</strong>
       has been cancelled. Your current wallet remains active.</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Wallet (unchanged)</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;word-break:break-all;">${escapeHtml(args.currentWalletAddress)}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Was going to change to</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;word-break:break-all;text-decoration:line-through;">${escapeHtml(args.cancelledWalletAddress)}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">Cancelled via</td>
          <td style="padding:8px 12px;font-size:13px;">${sourceLabel}</td></tr>
      <tr><td style="padding:8px 12px;color:#6b7280;font-size:13px;">From IP</td>
          <td style="padding:8px 12px;font-family:monospace;font-size:13px;">${escapeHtml(args.cancelIp ?? "(unknown)")}</td></tr>
    </table>
    <p style="font-size:12px;color:#6b7280;"><strong>You did not cancel this?</strong>
       That's expected — you should only see this email if you initiated the
       cancellation. If a stranger cancelled it, your account may be at risk:
       email <a href="mailto:support@giveprotocol.io">support@giveprotocol.io</a> immediately.</p>
  `,
  );

  await sendViaResend({
    resendApiKey: args.resendApiKey,
    fromEmail: defaultFrom(args.resendFromEmail),
    toEmail: args.toEmail,
    subject: `Wallet change cancelled for ${args.charityName}`,
    html,
  });
}
