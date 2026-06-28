/**
 * Supabase Edge Function: charity-status-email
 * @module charity-status-email
 * @description Sends a transactional email to a charity when an admin changes
 * their verification status (approve, reject, suspend, reinstate).
 * Called fire-and-forget from adminCharityService after a successful
 * admin_update_charity_status RPC call.
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
const PORTAL_URL = "https://giveprotocol.io/charity-portal";

interface StatusEmailRequest {
  charityId: string;
  newStatus: string;
  reason?: string | null;
}

interface CharityProfile {
  name: string;
  user_id: string | null;
}

interface EmailContent {
  subject: string;
  html: string;
}

/** Escape HTML special characters to prevent XSS in email bodies */
function escapeHtml(text: string): string {
  return text.replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"));
}

/** Build the email subject and HTML body for a given status transition */
function buildEmailContent(
  charityName: string,
  newStatus: string,
  reason: string | null | undefined,
  actionDate: string,
): EmailContent {
  const safeName = escapeHtml(charityName);
  const safeReason = reason ? escapeHtml(reason) : null;

  const statusTemplates: Record<
    string,
    { subject: string; heading: string; bodyHtml: string }
  > = {
    verified: {
      subject: `Congratulations! Your charity has been approved — ${safeName}`,
      heading: "Your Charity Has Been Approved",
      bodyHtml: `
        <p>Great news! <strong>${safeName}</strong> has been approved on Give Protocol.</p>
        <p>You can now:</p>
        <ul>
          <li>Create and publish donation campaigns</li>
          <li>Receive donations from supporters on our platform</li>
          <li>Access all charity dashboard features</li>
        </ul>
        <p><a href="${PORTAL_URL}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Go to Charity Portal</a></p>
      `,
    },
    rejected: {
      subject: `Update on your Give Protocol application — ${safeName}`,
      heading: "Update on Your Charity Application",
      bodyHtml: `
        <p>Thank you for applying to Give Protocol. After careful review, we were unable to approve <strong>${safeName}</strong> at this time.</p>
        ${safeReason ? `<p><strong>Reason for rejection:</strong> ${safeReason}</p><p>You are welcome to reapply after addressing the issues noted above.</p>` : ""}
        <p>Please ensure your documentation meets our <a href="https://docs.giveprotocol.io/verification">verification requirements</a>.</p>
        <p>If you believe this decision was made in error, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `,
    },
    suspended: {
      subject: `Your Give Protocol charity account has been suspended — ${safeName}`,
      heading: "Your Charity Account Has Been Suspended",
      bodyHtml: `
        <p>Your charity account for <strong>${safeName}</strong> on Give Protocol has been temporarily suspended.</p>
        ${safeReason ? `<p><strong>Reason for suspension:</strong> ${safeReason}</p>` : ""}
        <p>During suspension, your charity will not be visible to donors and you will not be able to receive new donations.</p>
        <p>To appeal this decision or learn more about reinstatement, please contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
      `,
    },
  };

  // Normalize "approved" to "verified" — both use the same approval template
  const templateKey = newStatus === "approved" ? "verified" : newStatus;

  const template = statusTemplates[templateKey] ?? {
    subject: `Your Give Protocol charity status has been updated — ${safeName}`,
    heading: "Your Charity Status Has Been Updated",
    bodyHtml: `<p>The status of <strong>${safeName}</strong> on Give Protocol has been updated to <strong>${escapeHtml(newStatus)}</strong>.</p>`,
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
      Charity: ${safeName}<br>
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

  // Fetch charity name and user_id from profiles
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

  // Fetch contact email from auth.users
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

  const actionDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { subject, html } = buildEmailContent(
    profile.name,
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
      to: [charityEmail],
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
    `Status email sent to ${charityEmail} for charity ${request.charityId} (status: ${request.newStatus}), emailId:`,
    sendResult.id,
  );

  return jsonResponse({ success: true, emailId: sendResult.id }, 200);
});
