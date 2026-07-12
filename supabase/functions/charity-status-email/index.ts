/**
 * Supabase Edge Function: charity-status-email
 * @module charity-status-email
 * @description Sends a transactional email to a charity when an admin changes
 * their verification status (approve, reject, suspend, reinstate).
 * Called fire-and-forget from adminCharityService after a successful
 * admin_update_charity_status RPC call.
 * @version 3 — GIV-639: locale-aware email copy via shared email-i18n module.
 *   Pass optional `locale` (BCP 47) in the request payload to send in the
 *   charity contact's preferred language. Defaults to "en".
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  fill,
  getEmailStrings,
  resolveLocale,
} from "../_shared/email-i18n.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM_ADDRESS = "Give Protocol <notifications@giveprotocol.io>";
const REPLY_TO = "info@giveprotocol.io";
const PORTAL_URL = "https://giveprotocol.io/charity-portal";
const SUPPORT_EMAIL = "info@giveprotocol.io";

const LEGAL_FOOTER_HTML = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#6b7280;">
    Give Protocol &middot; giveprotocol.io &middot; You're receiving this because of activity on your Give Protocol account.<br>
    Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
  </p>
`;

const LEGAL_FOOTER_TEXT = `\n---\nGive Protocol · giveprotocol.io · You're receiving this because of activity on your Give Protocol account.\nQuestions? Reply to this email or write to ${SUPPORT_EMAIL}.`;

interface StatusEmailRequest {
  charityId: string;
  newStatus: string;
  reason?: string | null;
  /** BCP 47 locale of the charity contact. Defaults to "en". */
  locale?: string | null;
}

interface CharityProfile {
  name: string;
  user_id: string | null;
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

/** Escape HTML special characters to prevent XSS in email bodies */
function escapeHtml(text: string): string {
  return text.replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"));
}

/** Wrap content in the shared Give Protocol email shell */
function wrapHtml(title: string, bodyHtml: string, locale?: string): string {
  const t = getEmailStrings(resolveLocale(locale));
  return `<!DOCTYPE html>
<html lang="${t.lang}" dir="${t.dir}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Give Protocol</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    ${bodyHtml}
    ${LEGAL_FOOTER_HTML}
  </div>
</body>
</html>`;
}

/** Build the email subject, HTML body, and plaintext for a given status transition */
function buildEmailContent(
  charityContactName: string,
  charityLegalName: string,
  newStatus: string,
  reason: string | null | undefined,
  locale: string | null | undefined,
): EmailContent {
  const resolved = resolveLocale(locale);
  const t = getEmailStrings(resolved);
  const safeName = escapeHtml(charityLegalName);
  const safeContact = escapeHtml(charityContactName);
  const safeReason = reason ? escapeHtml(reason) : null;

  // Normalize "approved" → "verified"
  const templateKey = newStatus === "approved" ? "verified" : newStatus;

  if (templateKey === "verified") {
    const a = t.charityApproval;
    const subject = a.subject;
    const congrats = escapeHtml(fill(a.congrats, { charityName: charityLegalName }));
    const ctaText = escapeHtml(a.ctaText);
    const bodyHtml = `
      <p>${escapeHtml(fill(t.greeting, { name: charityContactName }))}</p>
      <p>${congrats}</p>
      <p>${escapeHtml(a.profileLive)}</p>
      <p><strong>${escapeHtml(a.nextStepsHeader)}</strong></p>
      <ol>
        <li>${escapeHtml(a.step1)}</li>
        <li>${escapeHtml(a.step2)}</li>
        <li>${escapeHtml(a.step3)}</li>
      </ol>
      <p>
        <a href="${PORTAL_URL}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">${ctaText}</a>
      </p>
      <p>${escapeHtml(a.closing)}</p>
      <p>${escapeHtml(t.signoff)}</p>
    `;
    const bodyText = `${fill(t.greeting, { name: charityContactName })}\n\n${fill(a.congrats, { charityName: charityLegalName })}\n\n${a.profileLive}\n\n${a.nextStepsHeader}\n1. ${a.step1}\n2. ${a.step2}\n3. ${a.step3}\n\n${a.ctaText}: ${PORTAL_URL}\n\n${a.closing}\n\n${t.signoff}`;
    return { subject, html: wrapHtml(subject, bodyHtml, resolved), text: `${bodyText}${LEGAL_FOOTER_TEXT}` };
  }

  if (templateKey === "rejected") {
    const r = t.charityRejection;
    const subject = r.subject;
    const bodyHtml = `
      <p>${escapeHtml(fill(t.greeting, { name: charityContactName }))}</p>
      <p>${escapeHtml(fill(r.thanks, { charityName: charityLegalName }))}</p>
      <p>${escapeHtml(r.unableToApprove)}</p>
      ${safeReason ? `<blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:8px 16px;color:#374151;">${safeReason}</blockquote>` : ""}
      <p>${escapeHtml(r.notJudgment)}</p>
      <p><strong>${escapeHtml(r.whatYouCanDoHeader)}</strong></p>
      <ul>
        <li>${escapeHtml(r.step1)}</li>
        <li>${escapeHtml(r.step2)}</li>
        <li>${escapeHtml(r.step3)}</li>
      </ul>
      <p>${escapeHtml(r.closing)}</p>
      <p>${escapeHtml(r.trustSafetySignoff)}</p>
    `;
    const bodyText = `${fill(t.greeting, { name: charityContactName })}\n\n${fill(r.thanks, { charityName: charityLegalName })}\n\n${r.unableToApprove}\n\n${reason ?? "(no reason provided)"}\n\n${r.notJudgment}\n\n${r.whatYouCanDoHeader}\n- ${r.step1}\n- ${r.step2}\n- ${r.step3}\n\n${r.closing}\n\n${r.trustSafetySignoff}`;
    return { subject, html: wrapHtml(subject, bodyHtml, resolved), text: `${bodyText}${LEGAL_FOOTER_TEXT}` };
  }

  if (templateKey === "suspended") {
    // Suspension template keeps English (no CMO-authored i18n for suspension copy)
    const subject = `Your Give Protocol charity account has been suspended — ${safeName}`;
    const bodyHtml = `
      <p>Hi ${safeContact},</p>
      <p>Your charity account for <strong>${safeName}</strong> on Give Protocol has been temporarily suspended.</p>
      ${safeReason ? `<p><strong>Reason for suspension:</strong> ${safeReason}</p>` : ""}
      <p>During suspension, your charity will not be visible to donors and you will not be able to receive new donations.</p>
      <p>To appeal this decision or learn more about reinstatement, please reply to this email.</p>
      <p>&mdash; The Give Protocol Team</p>
    `;
    const bodyText = `Hi ${charityContactName},\n\nYour charity account for ${charityLegalName} on Give Protocol has been temporarily suspended.\n\n${reason ? `Reason for suspension: ${reason}\n\n` : ""}During suspension, your charity will not be visible to donors and you will not be able to receive new donations.\n\nTo appeal this decision or learn more about reinstatement, please reply to this email.\n\n— The Give Protocol Team`;
    return { subject, html: wrapHtml(subject, bodyHtml, resolved), text: `${bodyText}${LEGAL_FOOTER_TEXT}` };
  }

  // Fallback
  const subject = `Your Give Protocol charity status has been updated — ${safeName}`;
  const bodyHtml = `<p>Hi ${safeContact},</p><p>The status of <strong>${safeName}</strong> on Give Protocol has been updated to <strong>${escapeHtml(newStatus)}</strong>.</p><p>&mdash; The Give Protocol Team</p>`;
  const bodyText = `Hi ${charityContactName},\n\nThe status of ${charityLegalName} on Give Protocol has been updated to ${newStatus}.\n\n— The Give Protocol Team`;
  return { subject, html: wrapHtml(subject, bodyHtml, resolved), text: `${bodyText}${LEGAL_FOOTER_TEXT}` };
}

/** Build a JSON response with CORS headers */
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resendApiKey = Deno.env.get("RESEND_API_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      503,
    );
  }

  // If Resend is not configured, skip gracefully (email not yet set up)
  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured — skipping email notification");
    return jsonResponse(
      { success: true, skipped: true, reason: "resend_not_configured" },
      200,
    );
  }

  // Verify the caller is authenticated
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const reqObj = body as Record<string, unknown>;
  if (
    typeof reqObj.charityId !== "string" ||
    typeof reqObj.newStatus !== "string"
  ) {
    return jsonResponse(
      {
        success: false,
        error: "Missing required fields: charityId, newStatus",
      },
      400,
    );
  }

  const request: StatusEmailRequest = {
    charityId: reqObj.charityId,
    newStatus: reqObj.newStatus,
    reason: typeof reqObj.reason === "string" ? reqObj.reason : null,
    locale: typeof reqObj.locale === "string" ? reqObj.locale : null,
  };

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Verify caller has admin role
  const callerToken = authHeader.replace("Bearer ", "");
  const { data: callerData, error: callerError } =
    await supabase.auth.getUser(callerToken);
  if (callerError || !callerData.user) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const callerRole =
    (callerData.user.app_metadata?.role as string | undefined) ??
    (callerData.user.user_metadata?.role as string | undefined);
  if (callerRole !== "admin") {
    return jsonResponse(
      { success: false, error: "Forbidden: admin access required" },
      403,
    );
  }

  // Fetch charity legal name and user_id from profiles
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("name, user_id")
    .eq("id", request.charityId)
    .single();

  if (profileError || !profileData) {
    console.error("Failed to fetch charity profile:", profileError);
    return jsonResponse({ success: false, error: "Charity not found" }, 404);
  }

  const profile = profileData as CharityProfile;

  if (!profile.user_id) {
    console.warn(
      `Charity ${request.charityId} has no user_id — cannot send email`,
    );
    return jsonResponse(
      { success: true, skipped: true, reason: "no_user_id" },
      200,
    );
  }

  // Fetch contact email and display name from auth.users
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(profile.user_id);

  if (userError || !userData.user?.email) {
    console.error("Failed to fetch charity user email:", userError);
    return jsonResponse(
      { success: false, error: "Could not retrieve charity contact email" },
      500,
    );
  }

  const charityEmail = userData.user.email;

  // Skip wallet-only placeholder emails (no real inbox behind them)
  if (charityEmail.endsWith("@wallet.giveprotocol.io")) {
    console.warn(
      `Charity ${request.charityId} uses wallet placeholder email — skipping`,
    );
    return jsonResponse(
      { success: true, skipped: true, reason: "wallet_placeholder_email" },
      200,
    );
  }

  // Resolve contact person's name from user metadata; fall back to charity name
  const charityContactName =
    (userData.user.user_metadata?.full_name as string | undefined) ??
    (userData.user.user_metadata?.name as string | undefined) ??
    profile.name;

  const { subject, html, text } = buildEmailContent(
    charityContactName,
    profile.name,
    request.newStatus,
    request.reason,
    request.locale,
  );

  // Send via Resend
  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      reply_to: REPLY_TO,
      to: [charityEmail],
      subject,
      html,
      text,
    }),
  });

  if (!sendResponse.ok) {
    const errText = await sendResponse.text();
    console.error(`Resend API error ${sendResponse.status}:`, errText);
    return jsonResponse(
      { success: false, error: "Email delivery failed" },
      500,
    );
  }

  const sendResult = (await sendResponse.json()) as Record<string, unknown>;
  console.log(
    `Status email sent to ${charityEmail} for charity ${request.charityId} (status: ${request.newStatus}), emailId:`,
    sendResult.id,
  );

  return jsonResponse({ success: true, emailId: sendResult.id }, 200);
});
