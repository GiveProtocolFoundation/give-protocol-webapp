/**
 * Supabase Edge Function: volunteer-hours-email
 * @module volunteer-hours-email
 * @description Sends a transactional email to a volunteer when a charity admin
 * approves or rejects their volunteer hours submission.
 * Called fire-and-forget from adminVolunteerValidationService after a successful
 * admin_override_validation RPC call.
 * @version 2 — GIV-638: updated to CMO-approved template copy (GIV-634);
 *   added activityDescription, serviceDates, approver fields, profile/dashboard URLs.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
function wrapHtml(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html>
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
function buildEmailContent(req: VolunteerHoursEmailRequest, volunteerName: string, orgName: string): EmailContent {
  const safeName = escapeHtml(volunteerName);
  const safeOrg = escapeHtml(orgName);
  const safeReason = req.reason ? escapeHtml(req.reason) : null;
  const safeActivity = req.activityDescription
    ? escapeHtml(req.activityDescription)
    : null;
  const safeDates = req.serviceDates
    ? escapeHtml(req.serviceDates)
    : escapeHtml(req.activityDate);

  if (req.newStatus === "approved") {
    const hoursApproved = req.hoursApproved ?? req.hoursReported;
    const approverName = req.approverName ?? null;
    const approverTitle = req.approverTitle ?? null;
    const verificationDate = req.verificationDate ?? new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const profileUrl = req.volunteerProfileUrl ?? VOLUNTEER_PORTAL_URL;

    const subject = `Your volunteer hours were approved by ${orgName}`;
    const preheaderText = `${hoursApproved} hours logged and verified. Nice work.`;

    const approverLine = approverName
      ? `\n      <tr>\n        <td style="padding:8px 12px;font-weight:600;color:#374151;">Approved by</td>\n        <td style="padding:8px 12px;color:#111827;">${escapeHtml(approverName)}${approverTitle ? `, ${escapeHtml(approverTitle)}` : ""}</td>\n      </tr>`
      : "";

    const bodyHtml = `
      <p>Hi ${safeName},</p>
      <p>Great news &mdash; <strong>${safeOrg}</strong> has approved your volunteer hours.</p>
      <p><strong>Approved contribution:</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        ${safeActivity ? `<tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">Role / activity</td>
          <td style="padding:8px 12px;color:#111827;">${safeActivity}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;">Date(s) served</td>
          <td style="padding:8px 12px;color:#111827;">${safeDates}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">Hours approved</td>
          <td style="padding:8px 12px;color:#111827;">${hoursApproved}</td>
        </tr>${approverLine}
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">Verification date</td>
          <td style="padding:8px 12px;color:#111827;">${escapeHtml(verificationDate)}</td>
        </tr>
      </table>
      <p>Your service now appears on your verified volunteer record. Employers, schools, and communities can trust these hours because they're confirmed by the organization you served &mdash; not self-reported.</p>
      <p>
        <a href="${escapeHtml(profileUrl)}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View your volunteer record &rarr;</a>
      </p>
      <p>Thank you for showing up. This is the work that moves the world forward.</p>
      <p>&mdash; The Give Protocol Team</p>
    `;

    const approverTextLine = approverName
      ? `\n- Approved by: ${approverName}${approverTitle ? `, ${approverTitle}` : ""}`
      : "";
    const activityTextLine = req.activityDescription
      ? `\n- Role / activity: ${req.activityDescription}`
      : "";

    const bodyText = `Hi ${volunteerName},\n\nGreat news — ${orgName} has approved your volunteer hours.\n\nApproved contribution:${activityTextLine}\n- Date(s) served: ${req.serviceDates ?? req.activityDate}\n- Hours approved: ${hoursApproved}${approverTextLine}\n- Verification date: ${verificationDate}\n\nYour service now appears on your verified volunteer record. Employers, schools, and communities can trust these hours because they're confirmed by the organization you served — not self-reported.\n\nView your volunteer record: ${profileUrl}\n\nThank you for showing up. This is the work that moves the world forward.\n\n— The Give Protocol Team`;

    return {
      subject,
      html: wrapHtml(`${preheaderText} — Give Protocol`, bodyHtml),
      text: `${bodyText}${LEGAL_FOOTER_TEXT}`,
    };
  }

  if (req.newStatus === "rejected") {
    const hoursSubmitted = req.hoursSubmitted ?? req.hoursReported;
    const dashboardUrl = req.volunteerDashboardUrl ?? VOLUNTEER_PORTAL_URL;

    const subject = "Update on your volunteer hours submission";

    const bodyHtml = `
      <p>Hi ${safeName},</p>
      <p><strong>${safeOrg}</strong> has reviewed your submitted volunteer hours and was unable to approve them at this time.</p>
      <p><strong>Submission details:</strong></p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
        ${safeActivity ? `<tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">Activity</td>
          <td style="padding:8px 12px;color:#111827;">${safeActivity}</td>
        </tr>` : ""}
        <tr>
          <td style="padding:8px 12px;font-weight:600;color:#374151;">Date(s)</td>
          <td style="padding:8px 12px;color:#111827;">${safeDates}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-weight:600;color:#374151;">Hours submitted</td>
          <td style="padding:8px 12px;color:#111827;">${hoursSubmitted}</td>
        </tr>
      </table>
      ${safeReason ? `<p><strong>Reason from the organization:</strong></p><blockquote style="border-left:3px solid #e5e7eb;margin:16px 0;padding:8px 16px;color:#374151;">${safeReason}</blockquote>` : ""}
      <p>This isn't a reflection of your commitment to service. Often it's a matter of a missing detail, an activity that falls outside the scope the organization tracks, or a date that needs correction.</p>
      <p><strong>What you can do next:</strong></p>
      <ul>
        <li>Reach out to ${safeOrg} directly to clarify or resubmit with corrected details.</li>
        <li>Log new hours at any time from your volunteer dashboard.</li>
      </ul>
      <p>
        <a href="${escapeHtml(dashboardUrl)}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Go to your volunteer dashboard &rarr;</a>
      </p>
      <p>Thank you for the time you give. Keep going.</p>
      <p>&mdash; The Give Protocol Team</p>
    `;

    const activityTextLine = req.activityDescription
      ? `\n- Activity: ${req.activityDescription}`
      : "";

    const bodyText = `Hi ${volunteerName},\n\n${orgName} has reviewed your submitted volunteer hours and was unable to approve them at this time.\n\nSubmission details:${activityTextLine}\n- Date(s): ${req.serviceDates ?? req.activityDate}\n- Hours submitted: ${hoursSubmitted}\n\n${req.reason ? `Reason from the organization:\n${req.reason}\n\n` : ""}This isn't a reflection of your commitment to service. Often it's a matter of a missing detail, an activity that falls outside the scope the organization tracks, or a date that needs correction.\n\nWhat you can do next:\n- Reach out to ${orgName} directly to clarify or resubmit with corrected details.\n- Log new hours at any time from your volunteer dashboard.\n\nGo to your volunteer dashboard: ${dashboardUrl}\n\nThank you for the time you give. Keep going.\n\n— The Give Protocol Team`;

    return {
      subject,
      html: wrapHtml(subject, bodyHtml),
      text: `${bodyText}${LEGAL_FOOTER_TEXT}`,
    };
  }

  // Fallback for unexpected status values
  const subject = `Your volunteer hours submission has been updated — ${orgName}`;
  const bodyHtml = `
    <p>Hi ${safeName},</p>
    <p>The status of your volunteer hours submission for <strong>${safeOrg}</strong> has been updated to <strong>${escapeHtml(req.newStatus)}</strong>.</p>
    <p>&mdash; The Give Protocol Team</p>
  `;
  const bodyText = `Hi ${volunteerName},\n\nThe status of your volunteer hours submission for ${orgName} has been updated to ${req.newStatus}.\n\n— The Give Protocol Team`;

  return {
    subject,
    html: wrapHtml(subject, bodyHtml),
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

  const { subject, html, text } = buildEmailContent(request, volunteerName, orgName);

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
