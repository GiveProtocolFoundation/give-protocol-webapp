/**
 * Supabase Edge Function: volunteer-hours-email
 * @module volunteer-hours-email
 * @description Sends a transactional email to a volunteer when an admin approves
 * or rejects their volunteer hours submission.
 * Called fire-and-forget from adminVolunteerValidationService after a successful
 * admin_override_validation RPC call.
 * @version 1
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPPORT_EMAIL = "support@giveprotocol.io";
const VOLUNTEER_PORTAL_URL = "https://giveprotocol.io/volunteer-portal";

interface VolunteerHoursEmailRequest {
  volunteerId: string;
  volunteerDisplayName: string | null;
  orgName: string | null;
  hoursReported: number;
  activityDate: string;
  newStatus: string;
  reason: string | null;
}

interface EmailContent {
  subject: string;
  html: string;
}

/** Escape HTML special characters to prevent XSS in email bodies */
function escapeHtml(text: string): string {
  return text.replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"));
}

/** Build the email subject and HTML body for an approval or rejection */
function buildEmailContent(
  volunteerName: string,
  orgName: string,
  hoursReported: number,
  activityDate: string,
  newStatus: string,
  reason: string | null,
  actionDate: string,
): EmailContent {
  const safeName = escapeHtml(volunteerName);
  const safeOrg = escapeHtml(orgName);
  const safeDate = escapeHtml(activityDate);
  const safeReason = reason ? escapeHtml(reason) : null;
  const hoursLabel = hoursReported === 1 ? "hour" : "hours";

  const summaryHtml = `
    <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px;">
      <tr style="background:#f9fafb;">
        <td style="padding:8px 12px;font-weight:600;color:#374151;">Organisation</td>
        <td style="padding:8px 12px;color:#111827;">${safeOrg}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;font-weight:600;color:#374151;">Hours submitted</td>
        <td style="padding:8px 12px;color:#111827;">${hoursReported} ${hoursLabel}</td>
      </tr>
      <tr style="background:#f9fafb;">
        <td style="padding:8px 12px;font-weight:600;color:#374151;">Activity date</td>
        <td style="padding:8px 12px;color:#111827;">${safeDate}</td>
      </tr>
    </table>
  `;

  const statusTemplates: Record<
    string,
    { subject: string; heading: string; bodyHtml: string }
  > = {
    approved: {
      subject: `Your volunteer hours have been approved — ${safeOrg}`,
      heading: "Your Volunteer Hours Have Been Approved",
      bodyHtml: `
        <p>Hi ${safeName},</p>
        <p>Great news! An admin has reviewed and approved your volunteer hours submission.</p>
        ${summaryHtml}
        <p>Your approved hours will be reflected on your volunteer profile and may contribute to your impact leaderboard ranking.</p>
        <p><a href="${VOLUNTEER_PORTAL_URL}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">View Volunteer Portal</a></p>
      `,
    },
    rejected: {
      subject: `Update on your volunteer hours submission — ${safeOrg}`,
      heading: "Update on Your Volunteer Hours Submission",
      bodyHtml: `
        <p>Hi ${safeName},</p>
        <p>An admin has reviewed your volunteer hours submission and was unable to approve it at this time.</p>
        ${summaryHtml}
        ${safeReason ? `<p><strong>Reason:</strong> ${safeReason}</p>` : ""}
        <p>If you believe this decision was made in error, or if you have additional documentation, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `,
    },
  };

  const template = statusTemplates[newStatus] ?? {
    subject: `Your volunteer hours submission has been updated — ${safeOrg}`,
    heading: "Volunteer Hours Submission Update",
    bodyHtml: `
      <p>Hi ${safeName},</p>
      <p>The status of your volunteer hours submission for <strong>${safeOrg}</strong> has been updated to <strong>${escapeHtml(newStatus)}</strong>.</p>
      ${summaryHtml}
    `,
  };

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${template.subject}</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Give Protocol</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;">${template.heading}</h2>
    ${template.bodyHtml}
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#6b7280;">
      Action taken: ${actionDate}<br>
      Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
    </p>
  </div>
</body>
</html>`;

  return { subject: template.subject, html };
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

  const actionDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { subject, html } = buildEmailContent(
    volunteerName,
    orgName,
    request.hoursReported,
    request.activityDate,
    request.newStatus,
    request.reason,
    actionDate,
  );

  // Send via Resend
  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Give Protocol <notifications@giveprotocol.io>",
      to: [volunteerEmail],
      subject,
      html,
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
