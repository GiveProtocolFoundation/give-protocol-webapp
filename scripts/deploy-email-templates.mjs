/**
 * Deploy Give Protocol branded email templates to Supabase Auth.
 *
 * Usage:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx node scripts/deploy-email-templates.mjs [--check]
 *
 * --check   Read-only: prints current SMTP + template config without changing anything.
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
    "SUPABASE_ACCESS_TOKEN env var is required. Generate one at: Supabase Dashboard → Account → Access Tokens",
  );
}

const checkOnly = process.argv.includes("--check");
const templatesDir = resolve(__dirname, "..", "supabase", "templates");

/** Reads a template file from the templates directory. */
function readTemplate(filename) {
  return readFileSync(resolve(templatesDir, filename), "utf-8");
}

/** Makes an authenticated request to the Supabase Management API. */
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

/** Fetches the current auth config for the project. */
function getCurrentConfig() {
  return apiRequest("GET", `/projects/${PROJECT_REF}/config/auth`);
}

/** Applies a partial config patch to the project auth settings. */
function updateConfig(patch) {
  return apiRequest("PATCH", `/projects/${PROJECT_REF}/config/auth`, patch);
}

/** Prints the URL and redirect configuration. */
function printUrlConfig(config) {
  console.log("\n=== URL Configuration ===");
  console.log(`  Site URL:       ${config.site_url || "(not set)"}`);
  const isCorrect = config.site_url === PROD_SITE_URL;
  console.log(
    `  Correct:        ${isCorrect ? "Yes ✓" : `No ✗ (should be ${PROD_SITE_URL})`}`,
  );
  console.log(`  Redirect Allow: ${config.uri_allow_list || "(not set)"}`);
}

/** Prints the current SMTP configuration. */
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

/** Prints the branded status of each email template. */
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

/** Deploys URL config and branded email templates to Supabase. */
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

deploy().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  throw err;
});
