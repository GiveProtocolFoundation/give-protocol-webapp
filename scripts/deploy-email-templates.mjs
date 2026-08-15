/**
 * Deploy Give Protocol branded email templates to Supabase Auth.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-email-templates.mjs [--check]
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx RESEND_API_KEY=re_xxx node scripts/deploy-email-templates.mjs --configure-smtp
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-email-templates.mjs --test-signup
 *
 * --check            Read-only: prints current SMTP + template config without changing anything.
 * --configure-smtp   Configure Resend SMTP for Supabase Auth (requires RESEND_API_KEY env var).
 * --test-signup      Send a test signup request to verify email delivery.
 *
 * Requires a Supabase personal access token (Dashboard → Account → Access Tokens).
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_REF = "lhbyfidtlhojnrewpstp";
const API_BASE = "https://api.supabase.com/v1";
const PROD_SITE_URL = "https://giveprotocol.io";
const ALLOWED_REDIRECTS = [
  "https://giveprotocol.io/**",
  "https://www.giveprotocol.io/**",
  "http://localhost:5173/**",
  "http://localhost:3000/**",
];

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  throw new Error(
    "SUPABASE_ACCESS_TOKEN env var is required.\nGenerate one at: Supabase Dashboard → Account → Access Tokens",
  );
}

const checkOnly = process.argv.includes("--check");
const configureSmtp = process.argv.includes("--configure-smtp");
const testSignup = process.argv.includes("--test-signup");
const templatesDir = resolve(__dirname, "..", "supabase", "templates");
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;

/** @param {string} filename - Template file name relative to supabase/templates. @returns {string} Template HTML content. */
function readTemplate(filename) {
  return readFileSync(resolve(templatesDir, filename), "utf-8");
}

/** @param {string} method - HTTP method. @param {string} path - API path. @param {object} [body] - Request body. @returns {Promise<object>} Parsed JSON response. */
async function apiRequest(method, path, body) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

/** @returns {Promise<object>} Current Supabase Auth config. */
function getCurrentConfig() {
  return apiRequest("GET", `/projects/${PROJECT_REF}/config/auth`);
}

/** @param {object} patch - Config fields to update. @returns {Promise<object>} Updated config. */
function updateConfig(patch) {
  return apiRequest("PATCH", `/projects/${PROJECT_REF}/config/auth`, patch);
}

/** @param {object} config - Supabase Auth config object. */
function printUrlConfig(config) {
  console.log("\n=== URL Configuration ===");
  console.log(`  Site URL:       ${config.site_url || "(not set)"}`);
  const isCorrect = config.site_url === PROD_SITE_URL;
  console.log(
    `  Correct:        ${isCorrect ? "Yes ✓" : `No ✗ (should be ${PROD_SITE_URL})`}`,
  );
  console.log(`  Redirect Allow: ${config.uri_allow_list || "(not set)"}`);
}

/** @param {object} config - Supabase Auth config object. */
function printSmtpStatus(config) {
  console.log("\n=== Current SMTP Configuration ===");
  console.log(
    `  Enabled:      ${config.smtp_admin_email ? "Yes" : "No (using Supabase default)"}`,
  );
  console.log(`  Sender Email: ${config.smtp_admin_email || "(not set)"}`);
  console.log(`  Sender Name:  ${config.smtp_sender_name || "(not set)"}`);
  console.log(`  SMTP Host:    ${config.smtp_host || "(not set)"}`);
  console.log(`  SMTP Port:    ${config.smtp_port || "(not set)"}`);
  console.log(`  SMTP User:    ${config.smtp_user || "(not set)"}`);
  console.log(`  Max Freq:     ${config.smtp_max_frequency || "(not set)"}s`);
}

/** @param {object} config - Supabase Auth config object. */
function printTemplateStatus(config) {
  const templates = [
    { key: "confirmation", label: "Confirmation (signup)" },
    { key: "recovery", label: "Recovery (password reset)" },
    { key: "invite", label: "Invite" },
    { key: "magic_link", label: "Magic Link" },
    { key: "email_change", label: "Email Change" },
    { key: "reauthentication", label: "Reauthentication" },
  ];

  console.log("\n=== Current Email Template Status ===");
  for (const t of templates) {
    const subjectKey = `mailer_subjects_${t.key}`;
    const contentKey = `mailer_templates_${t.key}_content`;
    const subject = config[subjectKey] || "(default)";
    const content = config[contentKey] || "";
    const isBranded = content.includes("Give Protocol");
    console.log(`  ${t.label}:`);
    console.log(`    Subject:  ${subject}`);
    console.log(`    Branded:  ${isBranded ? "Yes ✓" : "No ✗ (needs update)"}`);
  }
}

/** Configures Resend SMTP for Supabase Auth via Management API. */
async function smtpConfigure() {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    throw new Error(
      "RESEND_API_KEY env var is required for --configure-smtp.\n" +
        "Get it from: https://resend.com/api-keys",
    );
  }

  console.log(`Target: Supabase project ${PROJECT_REF} (prod)`);
  console.log("\n=== Current SMTP Configuration ===");

  const current = await getCurrentConfig();
  printSmtpStatus(current);

  console.log("\n=== Configuring Resend SMTP... ===\n");

  const smtpPatch = {
    smtp_admin_email: "support@giveprotocol.io",
    smtp_sender_name: "Give Protocol",
    smtp_host: "smtp.resend.com",
    smtp_port: 587,
    smtp_user: "resend",
    smtp_pass: resendKey,
    smtp_max_frequency: 60,
  };

  await updateConfig(smtpPatch);

  console.log("SMTP configured. Verifying...\n");
  const updated = await getCurrentConfig();
  printSmtpStatus(updated);

  const ok = updated.smtp_admin_email && updated.smtp_host;
  if (ok) {
    console.log("\n  SMTP configured successfully.");
    console.log(
      "  Run with --test-signup to verify email delivery end-to-end.",
    );
  } else {
    console.log("\n  WARNING: SMTP does not appear to have taken effect.");
    console.log("  Check the Supabase Dashboard → Auth → SMTP Settings.");
  }
}

/** Tests signup email delivery by creating a disposable account. */
async function smtpTestSignup() {
  console.log(`Target: Supabase project ${PROJECT_REF} (prod)`);

  const current = await getCurrentConfig();
  printSmtpStatus(current);

  console.log("\n=== Testing signup email delivery ===\n");

  const testEmail = `giv909-test-${Date.now()}@example.com`;
  console.log(`  Test email: ${testEmail}`);

  const anonKey = await getAnonKey();
  const res = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: testEmail,
      password: "SmtpTest2026!Diagnostic",
      data: { full_name: "SMTP Diagnostic Test" },
    }),
  });

  const status = res.status;
  const body = await res.json();

  if (status === 200 && body.user) {
    console.log(`  Status: ${status} OK`);
    console.log(
      `  confirmation_sent_at: ${body.user.confirmation_sent_at || "NOT SET"}`,
    );
    console.log(
      `  email_confirmed_at: ${body.user.email_confirmed_at || "NOT SET"}`,
    );
    if (body.user.confirmation_sent_at) {
      console.log("\n  Email was queued for delivery.");
      console.log(
        "  Check the recipient inbox (and spam folder) to confirm receipt.",
      );
    } else {
      console.log("\n  WARNING: User created but no confirmation email sent.");
    }
  } else if (status === 500) {
    console.log(`  Status: ${status} FAILED`);
    console.log(`  Error: ${body.msg || body.message || JSON.stringify(body)}`);
    console.log("\n  SMTP is misconfigured. Run --configure-smtp to fix.");
  } else {
    console.log(`  Status: ${status}`);
    console.log(`  Response: ${JSON.stringify(body, null, 2)}`);
  }
}

/** @returns {Promise<string>} Anon key for the project. */
async function getAnonKey() {
  const keys = await apiRequest(
    "GET",
    `/projects/${PROJECT_REF}/api-keys`,
  );
  const anon = keys.find((k) => k.name === "anon");
  if (!anon) throw new Error("Could not find anon key via Management API");
  return anon.api_key;
}

/** Deploys branded email templates and URL config to Supabase Auth. */
async function deploy() {
  console.log(`Target: Supabase project ${PROJECT_REF} (prod)`);

  const currentConfig = await getCurrentConfig();

  printUrlConfig(currentConfig);
  printSmtpStatus(currentConfig);
  printTemplateStatus(currentConfig);

  if (checkOnly) {
    console.log("\n--check mode: no changes made.");
    return;
  }

  console.log("\n=== Deploying URL config + branded templates... ===\n");

  const patch = {
    site_url: PROD_SITE_URL,
    uri_allow_list: ALLOWED_REDIRECTS.join(","),

    mailer_subjects_confirmation: "Confirm your email — Give Protocol",
    mailer_templates_confirmation_content: readTemplate("confirm-signup.html"),

    mailer_subjects_recovery: "Reset your password — Give Protocol",
    mailer_templates_recovery_content: readTemplate("recovery.html"),

    mailer_subjects_invite: "You've been invited to Give Protocol",
    mailer_templates_invite_content: readTemplate("invite-user.html"),

    mailer_subjects_magic_link: "Your sign-in link — Give Protocol",
    mailer_templates_magic_link_content: readTemplate("magic-link.html"),

    mailer_subjects_email_change: "Confirm your new email — Give Protocol",
    mailer_templates_email_change_content: readTemplate("change-email.html"),

    mailer_subjects_reauthentication: "Confirm your identity — Give Protocol",
    mailer_templates_reauthentication_content: readTemplate(
      "reauthentication.html",
    ),
  };

  await updateConfig(patch);

  console.log("Deployed successfully:\n");
  console.log(`  ✓ Site URL → ${PROD_SITE_URL}`);
  console.log("  ✓ Redirect allow list updated");
  console.log("  ✓ Confirmation (signup)");
  console.log("  ✓ Recovery (password reset)");
  console.log("  ✓ Invite");
  console.log("  ✓ Magic Link");
  console.log("  ✓ Email Change");
  console.log("  ✓ Reauthentication");

  console.log("\n=== Verifying deployment... ===\n");
  const updated = await getCurrentConfig();
  printUrlConfig(updated);
  printTemplateStatus(updated);

  const smtpOk = updated.smtp_admin_email && updated.smtp_host;
  if (!smtpOk) {
    console.log("\n⚠  WARNING: Custom SMTP does not appear to be configured.");
    console.log(
      "   Emails will come from Supabase's default sender, NOT giveprotocol.io.",
    );
    console.log(
      "   To fix: go to Supabase Dashboard → Project Settings → Auth → SMTP Settings",
    );
    console.log(
      "   and configure Resend SMTP (smtp.resend.com, port 465, SSL).",
    );
  } else {
    console.log(
      `\n  SMTP sender: ${updated.smtp_admin_email} (${updated.smtp_sender_name || "no name"})`,
    );
  }
}

/** @returns {Promise<void>} */
async function main() {
  if (configureSmtp) {
    await smtpConfigure();
  } else if (testSignup) {
    await smtpTestSignup();
  } else {
    await deploy();
  }
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  throw err;
});
