/**
 * Enable (or disable) the Supabase Auth "Send Email" hook for the send-email-hook
 * edge function, and print the resulting auth config for verification.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/enable-send-email-hook.mjs           # enable
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/enable-send-email-hook.mjs --check   # read-only
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/enable-send-email-hook.mjs --disable # disable
 *
 * Requires a Supabase personal access token (Dashboard → Account → Access Tokens).
 * Prerequisites (already done, see GIV-933): RESEND_API_KEY edge secret set correctly
 * and hook_send_email_secrets configured with the shared `v1,whsec_...` secret.
 */

const PROJECT_REF = "lhbyfidtlhojnrewpstp";
const API_BASE = "https://api.supabase.com/v1";
const HOOK_URI = `https://${PROJECT_REF}.supabase.co/functions/v1/send-email-hook`;

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  throw new Error(
    "SUPABASE_ACCESS_TOKEN env var is required. Generate one at: Supabase Dashboard → Account → Access Tokens",
  );
}

const checkOnly = process.argv.includes("--check");
const disable = process.argv.includes("--disable");

async function apiRequest(method, path, body) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const config = await apiRequest("GET", `/projects/${PROJECT_REF}/config/auth`);

const relevant = {
  hook_send_email_enabled: config.hook_send_email_enabled,
  hook_send_email_uri: config.hook_send_email_uri,
  hook_send_email_secrets_set: Boolean(config.hook_send_email_secrets),
  smtp_is_admin_emails_disabled: config.smtp_is_admin_emails_disabled,
};
console.log("Current auth hook config:", JSON.stringify(relevant, null, 2));

if (checkOnly) {
  process.exit(0);
}

if (!relevant.hook_send_email_secrets_set && !disable) {
  throw new Error(
    "hook_send_email_secrets is not set. Configure it (Dashboard → Authentication → Hooks → Send Email → Secrets, value `v1,whsec_...`) before enabling the hook.",
  );
}

const patch = disable
  ? { hook_send_email_enabled: false }
  : { hook_send_email_enabled: true, hook_send_email_uri: HOOK_URI };

const updated = await apiRequest("PATCH", `/projects/${PROJECT_REF}/config/auth`, patch);
console.log(
  "Updated:",
  JSON.stringify(
    {
      hook_send_email_enabled: updated.hook_send_email_enabled,
      hook_send_email_uri: updated.hook_send_email_uri,
    },
    null,
    2,
  ),
);
console.log(disable ? "Send Email hook disabled." : "Send Email hook enabled. Now run a test signup at https://giveprotocol.io to verify the branded email arrives.");
