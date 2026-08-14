#!/usr/bin/env node
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
  "http://localhost:5173/**",
  "http://localhost:3000/**",
  "https://giveprotocol.io/**",
];

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error(
    "Error: SUPABASE_ACCESS_TOKEN env var is required.\n" +
      "Generate one at: Supabase Dashboard → Account → Access Tokens"
  );
  process.exit(1);
}

const checkOnly = process.argv.includes("--check");
const templatesDir = resolve(__dirname, "..", "supabase", "templates");

function readTemplate(filename) {
  return readFileSync(resolve(templatesDir, filename), "utf-8");
}

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

async function getCurrentConfig() {
  return apiRequest("GET", `/projects/${PROJECT_REF}/config/auth`);
}

async function updateConfig(patch) {
  return apiRequest("PATCH", `/projects/${PROJECT_REF}/config/auth`, patch);
}

function printUrlConfig(config) {
  console.log("\n=== URL Configuration ===");
  console.log(`  Site URL:       ${config.SITE_URL || "(not set)"}`);
  const isCorrect = config.SITE_URL === PROD_SITE_URL;
  console.log(`  Correct:        ${isCorrect ? "Yes ✓" : `No ✗ (should be ${PROD_SITE_URL})`}`);
  console.log(`  Redirect Allow: ${config.URI_ALLOW_LIST || "(not set)"}`);
}

function printSmtpStatus(config) {
  console.log("\n=== Current SMTP Configuration ===");
  console.log(`  Enabled:      ${config.SMTP_ADMIN_EMAIL ? "Yes" : "No (using Supabase default)"}`);
  console.log(`  Sender Email: ${config.SMTP_ADMIN_EMAIL || "(not set)"}`);
  console.log(`  Sender Name:  ${config.SMTP_SENDER_NAME || "(not set)"}`);
  console.log(`  SMTP Host:    ${config.SMTP_HOST || "(not set)"}`);
  console.log(`  SMTP Port:    ${config.SMTP_PORT || "(not set)"}`);
  console.log(`  SMTP User:    ${config.SMTP_USER || "(not set)"}`);
  console.log(`  Max Freq:     ${config.SMTP_MAX_FREQUENCY || "(not set)"}s`);
}

function printTemplateStatus(config) {
  const templates = [
    { key: "CONFIRMATION", label: "Confirmation (signup)" },
    { key: "RECOVERY", label: "Recovery (password reset)" },
    { key: "INVITE", label: "Invite" },
    { key: "MAGIC_LINK", label: "Magic Link" },
    { key: "EMAIL_CHANGE", label: "Email Change" },
    { key: "REAUTHENTICATION", label: "Reauthentication" },
  ];

  console.log("\n=== Current Email Template Status ===");
  for (const t of templates) {
    const subjectKey = `MAILER_SUBJECTS_${t.key}`;
    const contentKey = `MAILER_TEMPLATES_${t.key}_CONTENT`;
    const subject = config[subjectKey] || "(default)";
    const content = config[contentKey] || "";
    const isBranded = content.includes("Give Protocol");
    console.log(`  ${t.label}:`);
    console.log(`    Subject:  ${subject}`);
    console.log(`    Branded:  ${isBranded ? "Yes ✓" : "No ✗ (needs update)"}`);
  }
}

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
    SITE_URL: PROD_SITE_URL,
    URI_ALLOW_LIST: ALLOWED_REDIRECTS.join(","),

    MAILER_SUBJECTS_CONFIRMATION: "Confirm your email — Give Protocol",
    MAILER_TEMPLATES_CONFIRMATION_CONTENT: readTemplate("confirm-signup.html"),

    MAILER_SUBJECTS_RECOVERY: "Reset your password — Give Protocol",
    MAILER_TEMPLATES_RECOVERY_CONTENT: readTemplate("recovery.html"),

    MAILER_SUBJECTS_INVITE: "You've been invited to Give Protocol",
    MAILER_TEMPLATES_INVITE_CONTENT: readTemplate("invite-user.html"),

    MAILER_SUBJECTS_MAGIC_LINK: "Your sign-in link — Give Protocol",
    MAILER_TEMPLATES_MAGIC_LINK_CONTENT: readTemplate("magic-link.html"),

    MAILER_SUBJECTS_EMAIL_CHANGE: "Confirm your new email — Give Protocol",
    MAILER_TEMPLATES_EMAIL_CHANGE_CONTENT: readTemplate("change-email.html"),

    MAILER_SUBJECTS_REAUTHENTICATION: "Confirm your identity — Give Protocol",
    MAILER_TEMPLATES_REAUTHENTICATION_CONTENT: readTemplate("reauthentication.html"),
  };

  await updateConfig(patch);

  console.log("Deployed successfully:\n");
  console.log("  ✓ Site URL → " + PROD_SITE_URL);
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

  const smtpOk = updated.SMTP_ADMIN_EMAIL && updated.SMTP_HOST;
  if (!smtpOk) {
    console.log("\n⚠  WARNING: Custom SMTP does not appear to be configured.");
    console.log("   Emails will come from Supabase's default sender, NOT giveprotocol.io.");
    console.log("   To fix: go to Supabase Dashboard → Project Settings → Auth → SMTP Settings");
    console.log("   and configure Resend SMTP (smtp.resend.com, port 465, SSL).");
  } else {
    console.log(`\n  SMTP sender: ${updated.SMTP_ADMIN_EMAIL} (${updated.SMTP_SENDER_NAME || "no name"})`);
  }
}

deploy().catch((err) => {
  console.error("\nFailed:", err.message);
  process.exit(1);
});
