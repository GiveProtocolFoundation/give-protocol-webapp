/**
 * Supabase Auth Send Email Hook — replaces SMTP with Resend API.
 *
 * GoTrue calls this edge function instead of connecting to an SMTP server.
 * Receives user + email_data (token, type), renders the branded template,
 * sends via Resend HTTP API, and returns success to GoTrue.
 *
 * @module send-email-hook
 * @version 2
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SITE_URL = "https://giveprotocol.io";
const FROM_EMAIL = "Give Protocol <support@giveprotocol.io>";

interface HookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

interface EmailConfig {
  subject: string;
  heading: string;
  body: string;
  buttonText: string;
  note: string;
}

function getEmailConfig(actionType: string): EmailConfig {
  switch (actionType) {
    case "signup":
      return {
        subject: "Confirm your email — Give Protocol",
        heading: "Confirm your email address",
        body: "Welcome to Give Protocol. To complete your account registration and start participating in our global philanthropy ecosystem, please verify your email address by clicking the button below:",
        buttonText: "Confirm Email Address",
        note: "For security, this link will expire shortly. If you did not initiate this request, you can safely ignore this email.",
      };
    case "recovery":
      return {
        subject: "Reset your password — Give Protocol",
        heading: "Reset your password",
        body: "We received a request to reset the password for your Give Protocol account. Click the button below to choose a new password:",
        buttonText: "Reset Password",
        note: "This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email — your password will remain unchanged.",
      };
    case "invite":
      return {
        subject: "You've been invited to Give Protocol",
        heading: "You're invited",
        body: "You've been invited to join Give Protocol. Click the button below to accept your invitation and set up your account:",
        buttonText: "Accept Invitation",
        note: "This invitation link will expire shortly. If you were not expecting this invitation, you can safely ignore this email.",
      };
    case "magiclink":
      return {
        subject: "Your sign-in link — Give Protocol",
        heading: "Sign in to Give Protocol",
        body: "Click the button below to sign in to your Give Protocol account. No password needed:",
        buttonText: "Sign In",
        note: "This link expires in a few minutes and can only be used once. If you didn't request this link, you can safely ignore this email.",
      };
    case "email_change":
      return {
        subject: "Confirm your new email — Give Protocol",
        heading: "Confirm your new email address",
        body: "You requested to change the email address on your Give Protocol account. Click the button below to confirm your new email:",
        buttonText: "Confirm New Email",
        note: "If you did not request this change, please secure your account immediately.",
      };
    case "reauthentication":
      return {
        subject: "Confirm your identity — Give Protocol",
        heading: "Confirm your identity",
        body: "To proceed with the security-sensitive action you requested, please confirm your identity by clicking the button below:",
        buttonText: "Confirm Identity",
        note: "This code expires shortly. If you did not initiate this request, please secure your account immediately.",
      };
    default:
      return {
        subject: "Give Protocol notification",
        heading: "Action required",
        body: "Please click the button below to continue:",
        buttonText: "Continue",
        note: "If you did not initiate this request, you can safely ignore this email.",
      };
  }
}

function buildConfirmationUrl(emailData: HookPayload["email_data"]): string {
  const siteUrl = emailData.site_url || SITE_URL;
  const base = siteUrl.replace(/\/$/, "");
  const params = new URLSearchParams({
    token_hash: emailData.token_hash,
    type: emailData.email_action_type,
  });
  if (emailData.redirect_to) {
    params.set("next", emailData.redirect_to);
  }
  return `${base}/auth/confirm?${params.toString()}`;
}

function renderEmail(config: EmailConfig, confirmUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${config.subject}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f9fafb; color: #111827; margin: 0; padding: 0; }
    .wrapper { width: 100%; padding: 40px 0; background-color: #f9fafb; }
    .container { max-width: 540px; margin: 0 auto; background: #ffffff; padding: 32px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e5e7eb; }
    .logo { font-size: 20px; font-weight: 700; color: #000000; margin-bottom: 24px; text-transform: uppercase; }
    h1 { font-size: 22px; font-weight: 600; color: #111827; margin-top: 0; margin-bottom: 12px; }
    p { font-size: 15px; line-height: 1.6; color: #4b5563; margin-top: 0; margin-bottom: 20px; }
    .btn-container { margin: 28px 0; text-align: left; }
    .button { background-color: #000000; color: #ffffff !important; text-decoration: none; padding: 12px 24px; font-size: 15px; font-weight: 500; border-radius: 6px; display: inline-block; }
    .fallback { font-size: 13px; color: #6b7280; word-break: break-all; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .footer { font-size: 12px; color: #9ca3af; margin-top: 32px; text-align: left; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="logo">Give Protocol</div>
      <h1>${config.heading}</h1>
      <p>${config.body}</p>
      <div class="btn-container">
        <a href="${confirmUrl}" class="button">${config.buttonText}</a>
      </div>
      <p style="font-size: 14px; color: #6b7280;"><em>${config.note}</em></p>
      <div class="fallback">
        If the button above doesn't work, copy and paste this URL into your browser:<br>
        <a href="${confirmUrl}" style="color: #2563eb;">${confirmUrl}</a>
      </div>
      <div class="footer">
        &copy; 2026 Give Protocol Foundation. All rights reserved.<br>
        This is an automated transactional email regarding your account.
      </div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req: Request) => {
  try {
    const rawBody = await req.text();
    console.log("send-email-hook: received request, body length:", rawBody.length);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("send-email-hook: RESEND_API_KEY not set — emails will not be sent");
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    let payload: HookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      console.error("send-email-hook: failed to parse JSON body");
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userEmail = payload?.user?.email;
    const actionType = payload?.email_data?.email_action_type;

    if (!userEmail || !actionType) {
      console.error("send-email-hook: missing user.email or email_data.email_action_type");
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const config = getEmailConfig(actionType);
    const confirmUrl = buildConfirmationUrl(payload.email_data);
    const html = renderEmail(config, confirmUrl);

    console.log("send-email-hook: sending", actionType, "email to", userEmail);

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: userEmail,
        subject: config.subject,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("send-email-hook: Resend API error", resendRes.status, errBody);
    } else {
      const result = await resendRes.json();
      console.log("send-email-hook: sent successfully, Resend ID:", result.id);
    }

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-email-hook: unexpected error:", err);
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
