/**
 * Supabase Edge Function: username-reminder
 * @module username-reminder
 * @description Looks up the account type registered to an email address and
 * sends a reminder email via Resend. This is a public endpoint (no auth
 * required) analogous to Supabase's resetPasswordForEmail. It always returns
 * 200 regardless of whether the email is found, to prevent email enumeration.
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
const PORTAL_URL = "https://giveprotocol.io";

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; portal: string }> = {
  donor: {
    label: "Donor",
    portal: `${PORTAL_URL}/donor-portal`,
  },
  charity: {
    label: "Charity Organization",
    portal: `${PORTAL_URL}/charity-portal`,
  },
  volunteer: {
    label: "Volunteer",
    portal: `${PORTAL_URL}/volunteer`,
  },
  admin: {
    label: "Administrator",
    portal: `${PORTAL_URL}/admin`,
  },
};

interface Profile {
  type: string | null;
  name: string | null;
}

/** Escape HTML special characters to prevent XSS in email bodies */
function escapeHtml(text: string): string {
  return text.replace(/[<>]/g, (char) => (char === "<" ? "&lt;" : "&gt;"));
}

/** Build the reminder email HTML */
function buildEmailHtml(
  email: string,
  accountType: string,
  displayName: string | null,
): string {
  const safeEmail = escapeHtml(email);
  const typeInfo =
    ACCOUNT_TYPE_LABELS[accountType] ?? ACCOUNT_TYPE_LABELS["donor"];
  const greeting = displayName
    ? `Hello, ${escapeHtml(displayName)}!`
    : "Hello!";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Your Give Protocol Account Details</title>
</head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="background:#10b981;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="color:white;margin:0;font-size:20px;">Give Protocol</h1>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;padding:24px;border-radius:0 0 8px 8px;">
    <h2 style="color:#111827;">Your Account Details</h2>
    <p>${greeting}</p>
    <p>You requested a reminder of your Give Protocol account details. Here's what we have on file:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:10px 0;font-weight:bold;width:40%;">Email address</td>
        <td style="padding:10px 0;">${safeEmail}</td>
      </tr>
      <tr>
        <td style="padding:10px 0;font-weight:bold;">Account type</td>
        <td style="padding:10px 0;">${typeInfo.label}</td>
      </tr>
    </table>
    <p>You can sign in at your portal:</p>
    <p>
      <a href="${typeInfo.portal}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">
        Go to ${typeInfo.label} Portal
      </a>
    </p>
    <p style="margin-top:24px;">If you did not request this reminder, you can safely ignore this email.</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
    <p style="font-size:12px;color:#6b7280;">
      Questions? Contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>
    </p>
  </div>
</body>
</html>`;
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

  if (!resendApiKey) {
    console.warn("RESEND_API_KEY not configured — skipping username reminder");
    // Return 200 so the client still shows the success message
    return jsonResponse(
      { success: true, skipped: true, reason: "resend_not_configured" },
      200,
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
  }

  const reqObj = body as Record<string, unknown>;
  if (typeof reqObj.email !== "string" || !reqObj.email.includes("@")) {
    return jsonResponse(
      { success: false, error: "Missing required field: email" },
      400,
    );
  }

  const email = reqObj.email.toLowerCase().trim();

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Look up the user by email. We use admin.listUsers with a filter.
  // If not found, return 200 silently to prevent email enumeration.
  const { data: listData, error: listError } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });

  if (listError) {
    console.error("Failed to list users:", listError);
    // Return 200 to not leak server errors externally
    return jsonResponse({ success: true }, 200);
  }

  const authUser = listData?.users?.find(
    (u) => u.email?.toLowerCase() === email,
  );

  if (!authUser) {
    // No account found — return 200 silently (no email enumeration)
    console.log(`No account found for email: ${email}`);
    return jsonResponse({ success: true }, 200);
  }

  // Skip wallet placeholder emails
  if (authUser.email?.endsWith("@wallet.giveprotocol.io")) {
    return jsonResponse({ success: true, skipped: true }, 200);
  }

  // Fetch profile type and display name
  const { data: profileData } = await supabase
    .from("profiles")
    .select("type, name")
    .eq("user_id", authUser.id)
    .single<Profile>();

  const accountType =
    (profileData?.type as string | null) ??
    (authUser.user_metadata?.type as string | null) ??
    "donor";
  const displayName = profileData?.name ?? null;

  const html = buildEmailHtml(email, accountType, displayName);

  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Give Protocol <notifications@giveprotocol.io>",
      to: [email],
      subject: "Your Give Protocol account details",
      html,
    }),
  });

  if (!sendResponse.ok) {
    const errText = await sendResponse.text();
    console.error(`Resend API error ${sendResponse.status}:`, errText);
    // Return 200 — the user sees the success message regardless
    return jsonResponse({ success: true }, 200);
  }

  const sendResult = (await sendResponse.json()) as Record<string, unknown>;
  console.log(
    `Username reminder sent to ${email} (accountType: ${accountType}), emailId:`,
    sendResult.id,
  );

  return jsonResponse({ success: true, emailId: sendResult.id }, 200);
});
