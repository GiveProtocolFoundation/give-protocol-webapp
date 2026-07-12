/**
 * Supabase Edge Function: volunteer-hours-email
 * @module volunteer-hours-email
 * @description Sends a transactional email to a volunteer when a charity admin
 * approves or rejects their volunteer hours submission.
 * Called fire-and-forget from adminVolunteerValidationService after a successful
 * admin_override_validation RPC call.
 * @version 3 — GIV-639: locale-aware copy via shared email-i18n module.
 *   Pass optional `locale` (BCP 47) in request payload; defaults to "en".
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
const VOLUNTEER_PORTAL_URL = "https://giveprotocol.io/volunteer";
const SUPPORT_EMAIL = "info@giveprotocol.io";

const LEGAL_FOOTER_HTML = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#6b7280;">
    Give Protocol &middot; giveprotocol.io &middot; You're receiving this because of activity on your Give Protocol account.<br>
    Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
  </p>
`;

const LEGAL_FOOTER_TEXT = `\n---\nGive Protocol · giveprotocol.io · You're receiving this because of activity on your Give Protocol account.\nQuestions? Reply to this email or write to ${SUPPORT_EMAIL}.`;

interface VolunteerHoursEmailRequest {
  volunteerId: string;
  volunteerDisplayName: string | null;
  orgName: string | null;
  hoursReported: number;
  activityDate: string;
  newStatus: string;
  reason: string | null;
  /** Description of the volunteer activity / role */
  activityDescription?: string | null;
  /** Human-readable date range or list of dates served */
  serviceDates?: string | null;
  /** Hours approved (approval flow). Defaults to hoursReported. */
  hoursApproved?: number | null;
  /** Hours submitted (rejection flow). Defaults to hoursReported. */
  hoursSubmitted?: number | null;
  /** Name of the staff member who approved/rejected */
  approverName?: string | null;
  /** Title of the approver */
  approverTitle?: string | null;
  /** Date approval was confirmed */
  verificationDate?: string | null;
  /** URL to the volunteer's full verified record */
  volunteerProfileUrl?: string | null;
  /** URL to the volunteer's submission dashboard */
  volunteerDashboardUrl?: string | null;
  /** BCP 47 locale of the volunteer. Defaults to "en". */
  locale?: string | null;
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

/** Build the email subject, HTML body, and plaintext for an approval or rejection */
function buildEmailContent(
  req: VolunteerHoursEmailRequest,
  volunteerName: string,
  orgName: string,
  locale?: string | null,
): EmailContent {
  const resolved = resolveLocale(locale);
  const t = getEmailStrings(resolved);
  const va = t.volunteerApproval;
  const vr = t.volunteerRejection;

  const safeName = escapeHtml(volunteerName);
  const safeOrg = escapeHtml(orgName);
  const safeReason = req.reason ? escapeHtml(req.reason) : null;
  const safeActivity = req.activityDescription
    ? escapeHtml(req.activityDescription)
    : null;
  const safeDates = req.serviceDates
    ? escapeHtml(req.serviceDates)
    : escapeHtml(req.activityDate);
  const greeting = escapeHtml(fill(t.greeting, { name: volunteerName }));

  if (req.newStatus === "approved") {
    const hoursApproved = req.hoursApproved ?? req.hoursReported;
    const approverName = req.approverName ?? null;
    const approverTitle = req.approverTitle ?? null;
    const verificationDate = req.verificationDate ?? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const profileUrl = req.volunteerProfileUrl ?? VOLUNTEER_PORTAL_URL;

    const subject = fill(va.subject, { charityName: orgName });
    const preheaderText = fill(va.preheader, { hours: String(hoursApproved) });

    const safeApprovedBy = escapeHtml(va.fieldApprovedBy);
    const approverLine = approverName
      ? `\n      <tr>\n        <td style="padding:8px 12px;font-weight:600;color:#374151;">${safeApprovedBy}</td>\n        <td style="padding:8px 12px;color:#111827;">${escapeHtml(approverName)}${approverTitle ? `, ${escapeHtml(approverTitle)}` : ""}</td>\n      </tr>`
      : "";

    const bodyHtml = `
      <p>${greeting}</p>
      <p>${escapeHtml(fill(va.opening, { charityName: orgName }))}</p>
      <p><strong>${escapeHtml(va.contributionHeader)}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        ${safeActivity ? `<tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">${escapeHtml(va.fieldActivity)}</td>
          <td style="padding:8px 12px;color:#111827;">${safeActivity}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;">${escapeHtml(va.fieldDates)}</td>
          <td style="padding:8px 12px;color:#111827;">${safeDates}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">${escapeHtml(va.fieldHoursApproved)}</td>
          <td style="padding:8px 12px;color:#111827;">${hoursApproved}</td>
        </tr>${approverLine}
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">${escapeHtml(va.fieldVerificationDate)}</td>
          <td style="padding:8px 12px;color:#111827;">${escapeHtml(verificationDate)}</td>
        </tr>
      </table>
      <p>${escapeHtml(va.verifiedNote)}</p>
      <p>
        <a href="${escapeHtml(profileUrl)}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">${escapeHtml(va.ctaText)}</a>
      </p>
      <p>${escapeHtml(va.closing)}</p>
      <p>${escapeHtml(t.signoff)}</p>
    `;

    const approverTextLine = approverName
      ? `\n- ${va.fieldApprovedBy}: ${approverName}${approverTitle ? `, ${approverTitle}` : ""}`
      : "";
    const activityTextLine = req.activityDescription
      ? `\n- ${va.fieldActivity}: ${req.activityDescription}`
      : "";

    const bodyText = `${fill(t.greeting, { name: volunteerName })}\n\n${fill(va.opening, { charityName: orgName })}\n\n${va.contributionHeader}${activityTextLine}\n- ${va.fieldDates}: ${req.serviceDates ?? req.activityDate}\n- ${va.fieldHoursApproved}: ${hoursApproved}${approverTextLine}\n- ${va.fieldVerificationDate}: ${verificationDate}\n\n${va.verifiedNote}\n\n${va.ctaText}: ${profileUrl}\n\n${va.closing}\n\n${t.signoff}`;

    return {
      subject,
      html: wrapHtml(`${preheaderText} — Give Protocol`, bodyHtml, resolved),
      text: `${bodyText}${LEGAL_FOOTER_TEXT}`,
    };
  }

  if (req.newStatus === "rejected") {
    const hoursSubmitted = req.hoursSubmitted ?? req.hoursReported;
    const dashboardUrl = req.volunteerDashboardUrl ?? VOLUNTEER_PORTAL_URL;

    const subject = vr.subject;

    const bodyHtml = `
      <p>${greeting}</p>
      <p>${escapeHtml(fill(vr.opening, { charityName: orgName }))}</p>
      <p><strong>${escapeHtml(vr.submissionHeader)}</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        ${safeActivity ? `<tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">${escapeHtml(vr.fieldActivity)}</td>
          <td style="padding:8px 12px;color:#111827;">${safeActivity}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;">${escapeHtml(vr.fieldDates)}</td>
          <td style="padding:8px 12px;color:#111827;">${safeDates}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">${escapeHtml(vr.fieldHoursSubmitted)}</td>
          <td style="padding:8px 12px;color:#111827;">${hoursSubmitted}</td>
        </tr>
      </table>
      ${safeReason ? `<p><strong>${escapeHtml(vr.reasonHeader)}</strong></p><blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:8px 16px;color:#374151;">${safeReason}</blockquote>` : ""}
      <p>${escapeHtml(vr.notAReflection)}</p>
      <p><strong>${escapeHtml(vr.whatNextHeader)}</strong></p>
      <ul>
        <li>${escapeHtml(fill(vr.step1, { charityName: orgName }))}</li>
        <li>${escapeHtml(vr.step2)}</li>
      </ul>
      <p>
        <a href="${escapeHtml(dashboardUrl)}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">${escapeHtml(vr.ctaText)}</a>
      </p>
      <p>${escapeHtml(vr.closing)}</p>
      <p>${escapeHtml(t.signoff)}</p>
    `;

    const activityTextLine = req.activityDescription
      ? `\n- ${vr.fieldActivity}: ${req.activityDescription}`
      : "";

    const bodyText = `${fill(t.greeting, { name: volunteerName })}\n\n${fill(vr.opening, { charityName: orgName })}\n\n${vr.submissionHeader}${activityTextLine}\n- ${vr.fieldDates}: ${req.serviceDates ?? req.activityDate}\n- ${vr.fieldHoursSubmitted}: ${hoursSubmitted}\n\n${req.reason ? `${vr.reasonHeader}\n${req.reason}\n\n` : ""}${vr.notAReflection}\n\n${vr.whatNextHeader}\n- ${fill(vr.step1, { charityName: orgName })}\n- ${vr.step2}\n\n${vr.ctaText}: ${dashboardUrl}\n\n${vr.closing}\n\n${t.signoff}`;

    return {
      subject,
      html: wrapHtml(subject, bodyHtml, resolved),
      text: `${bodyText}${LEGAL_FOOTER_TEXT}`,
    };
  }

  // Fallback for unexpected status values
  const subject = `Your volunteer hours submission has been updated — ${orgName}`;
  const bodyHtml = `
    <p>${greeting}</p>
    <p>The status of your volunteer hours submission for <strong>${safeOrg}</strong> has been updated to <strong>${escapeHtml(req.newStatus)}</strong>.</p>
    <p>${escapeHtml(t.signoff)}</p>
  `;
  const bodyText = `${fill(t.greeting, { name: volunteerName })}\n\nThe status of your volunteer hours submission for ${orgName} has been updated to ${req.newStatus}.\n\n${t.signoff}`;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml, resolved),
    text: `${bodyText}${LEGAL_FOOTER_TEXT}`,
  };
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

  // If Resend is not configured, skip gracefully
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
    typeof reqObj.volunteerId !== "string" ||
    typeof reqObj.newStatus !== "string" ||
    typeof reqObj.hoursReported !== "number" ||
    typeof reqObj.activityDate !== "string"
  ) {
    return jsonResponse(
      {
        success: false,
        error:
          "Missing required fields: volunteerId, newStatus, hoursReported, activityDate",
      },
      400,
    );
  }

  const request: VolunteerHoursEmailRequest = {
    volunteerId: reqObj.volunteerId,
    volunteerDisplayName:
      typeof reqObj.volunteerDisplayName === "string"
        ? reqObj.volunteerDisplayName
        : null,
    orgName: typeof reqObj.orgName === "string" ? reqObj.orgName : null,
    hoursReported: reqObj.hoursReported,
    activityDate: reqObj.activityDate,
    newStatus: reqObj.newStatus,
    reason: typeof reqObj.reason === "string" ? reqObj.reason : null,
    activityDescription:
      typeof reqObj.activityDescription === "string"
        ? reqObj.activityDescription
        : null,
    serviceDates:
      typeof reqObj.serviceDates === "string" ? reqObj.serviceDates : null,
    hoursApproved:
      typeof reqObj.hoursApproved === "number" ? reqObj.hoursApproved : null,
    hoursSubmitted:
      typeof reqObj.hoursSubmitted === "number" ? reqObj.hoursSubmitted : null,
    approverName:
      typeof reqObj.approverName === "string" ? reqObj.approverName : null,
    approverTitle:
      typeof reqObj.approverTitle === "string" ? reqObj.approverTitle : null,
    verificationDate:
      typeof reqObj.verificationDate === "string"
        ? reqObj.verificationDate
        : null,
    volunteerProfileUrl:
      typeof reqObj.volunteerProfileUrl === "string"
        ? reqObj.volunteerProfileUrl
        : null,
    volunteerDashboardUrl:
      typeof reqObj.volunteerDashboardUrl === "string"
        ? reqObj.volunteerDashboardUrl
        : null,
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

  // Fetch volunteer email from auth.users
  const { data: userData, error: userError } =
    await supabase.auth.admin.getUserById(request.volunteerId);

  if (userError || !userData.user?.email) {
    console.error("Failed to fetch volunteer user email:", userError);
    return jsonResponse(
      { success: false, error: "Could not retrieve volunteer email" },
      500,
    );
  }

  const volunteerEmail = userData.user.email;

  // Skip wallet-only placeholder emails (no real inbox behind them)
  if (volunteerEmail.endsWith("@wallet.giveprotocol.io")) {
    console.warn(
      `Volunteer ${request.volunteerId} uses wallet placeholder email — skipping`,
    );
    return jsonResponse(
      { success: true, skipped: true, reason: "wallet_placeholder_email" },
      200,
    );
  }

  const volunteerName =
    request.volunteerDisplayName ?? volunteerEmail.split("@")[0];
  const orgName = request.orgName ?? "the organisation";

  const { subject, html, text } = buildEmailContent(request, volunteerName, orgName, request.locale);

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
      to: [volunteerEmail],
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
    `Volunteer hours email sent to ${volunteerEmail} for volunteer ${request.volunteerId} (status: ${request.newStatus}), emailId:`,
    sendResult.id,
  );

  return jsonResponse({ success: true, emailId: sendResult.id }, 200);
});
