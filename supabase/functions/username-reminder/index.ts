/**
 * Supabase Edge Function: username-reminder
 * @module username-reminder
 * @description Looks up the account registered to an email address and sends a
 * username reminder via Resend. This is a public endpoint (no auth required)
 * analogous to Supabase's resetPasswordForEmail. It always returns 200
 * regardless of whether the email is found, to prevent email enumeration.
 * @version 2 — GIV-638: updated to CMO-approved template copy (GIV-634)
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
const PORTAL_URL = "https://giveprotocol.io";
const SUPPORT_EMAIL = "info@giveprotocol.io";

const LEGAL_FOOTER_HTML = `
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
  <p style="font-size:12px;color:#6b7280;">
    Give Protocol &middot; giveprotocol.io &middot; You're receiving this because of activity on your Give Protocol account.<br>
    Questions? Reply to this email or write to <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.
  </p>
`;

const LEGAL_FOOTER_TEXT = `\n---\nGive Protocol · giveprotocol.io · You're receiving this because of activity on your Give Protocol account.\nQuestions? Reply to this email or write to ${SUPPORT_EMAIL}.`;

const SIGN_IN_PATHS: Record<string, string> = {
  donor: "/donor-portal",
  charity: "/charity-portal",
  volunteer: "/volunteer",
  admin: "/admin",
};

interface Profile {
  type: string | null;
  name: string | null;
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

/** Build the username reminder email HTML and plaintext */
function buildEmailContent(
  username: string,
  signInUrl: string,
): { html: string; text: string } {
  const safeUsername = escapeHtml(username);
  const safeSignInUrl = escapeHtml(signInUrl);

  const bodyHtml = `
    <p>Hi there,</p>
    <p>Someone requested a username reminder for the Give Protocol account tied to this email address.</p>
    <p><strong>Your username:</strong> <code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;">${safeUsername}</code></p>
    <p>
      <a href="${safeSignInUrl}" style="background:#10b981;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:8px;">Sign in &rarr;</a>
    </p>
    <p>If you didn't request this, you can safely ignore this email &mdash; no changes have been made to your account. If you're seeing repeated reminders you didn't ask for, reply to this email and we'll investigate.</p>
    <p>&mdash; The Give Protocol Team</p>
  `;

  const bodyText = `Hi there,\n\nSomeone requested a username reminder for the Give Protocol account tied to this email address.\n\nYour username: ${username}\n\nSign in: ${signInUrl}\n\nIf you didn't request this, you can safely ignore this email — no changes have been made to your account. If you're seeing repeated reminders you didn't ask for, reply to this email and we'll investigate.\n\n— The Give Protocol Team`;

  return {
    html: wrapHtml("Your Give Protocol username", bodyHtml),
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

  // Look up the user by email. If not found, return 200 silently to prevent email enumeration.
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

  // Fetch profile type for sign-in URL routing
  const { data: profileData } = await supabase
    .from("profiles")
    .select("type, name")
    .eq("user_id", authUser.id)
    .single<Profile>();

  const accountType =
    (profileData?.type as string | null) ??
    (authUser.user_metadata?.type as string | null) ??
    "donor";

  const signInPath = SIGN_IN_PATHS[accountType] ?? SIGN_IN_PATHS["donor"];
  const signInUrl = `${PORTAL_URL}${signInPath}`;

  // The username in Give Protocol is the email address
  const username = email;

  const { html, text } = buildEmailContent(username, signInUrl);

  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      reply_to: REPLY_TO,
      to: [email],
      subject: "Your Give Protocol username",
      html,
      text,
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
