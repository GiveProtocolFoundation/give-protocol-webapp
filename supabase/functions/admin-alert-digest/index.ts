/**
 * Supabase Edge Function: admin-alert-digest
 * @module admin-alert-digest
 * @description Emails platform admins when admin matters cross the GIV-721
 * high-priority threshold (sitting more than 3 days without action).
 *
 * Trigger: called daily at 08:00 UTC by pg_cron via invoke_admin_alert_digest(),
 * or manually via HTTP POST with the service-role key.
 *
 * Flow:
 *   1. Fetch current high-priority matters via get_admin_alert_digest() RPC
 *   2. Diff against admin_alert_notifications (already-notified ledger)
 *   3. Prune ledger rows whose matter is no longer high priority (resolved),
 *      so a recurrence re-notifies
 *   4. If any matters are newly high priority, email every platform admin
 *      (get_admin_notification_emails RPC, fallback ADMIN_ALERT_EMAIL)
 *   5. Record the newly notified matters in the ledger
 *
 * Required env:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - RESEND_API_KEY            (optional; if missing the function no-ops)
 *   - ADMIN_ALERT_EMAIL         (optional; fallback when no admin profiles)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ADMIN_EMAIL = "support@giveprotocol.io";
const ADMIN_DASHBOARD_URL = "https://giveprotocol.io/admin";

/** Review-queue URL per alert type, mirrored from AdminDashboard ALERT_ROUTES. */
const ALERT_URLS: Record<string, string> = {
  pending_verification: "https://giveprotocol.io/admin/charities",
  removal_request: "https://giveprotocol.io/admin/donors",
  expired_validation: "https://giveprotocol.io/admin/volunteer-validation",
  pending_validation: "https://giveprotocol.io/admin/volunteer-validation",
  donation_flag: "https://giveprotocol.io/admin/donations",
};

interface DigestAlertRow {
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  entity_id: string;
  entity_type: string;
  created_at: string;
  count: number;
}

interface LedgerRow {
  alert_type: string;
  entity_id: string;
}

/**
 * Creates a JSON response.
 * @param body - Response body object to serialize
 * @param status - HTTP status code
 * @returns Response with JSON content-type
 */
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Escapes HTML special characters to prevent injection in email content.
 * @param text - Raw text to escape
 * @returns Text with &lt;, &gt;, and &amp; entities
 */
function escapeHtml(text: string): string {
  return text.replace(/[<>&]/g, (char) => {
    if (char === "<") return "&lt;";
    if (char === ">") return "&gt;";
    return "&amp;";
  });
}

/**
 * Composite ledger key for an alert row.
 * @param alertType - Alert type slug
 * @param entityId - Entity UUID
 * @returns Stable dedup key
 */
function alertKey(alertType: string, entityId: string): string {
  return `${alertType}:${entityId}`;
}

/**
 * Builds the digest email HTML listing newly escalated matters.
 * @param newAlerts - Matters that newly crossed the 3-day threshold
 * @param totalHigh - Total count of currently high-priority matters
 * @returns Email HTML body
 */
function buildEmailHtml(
  newAlerts: DigestAlertRow[],
  totalHigh: number,
): string {
  const items = newAlerts
    .map((a) => {
      const url = ALERT_URLS[a.alert_type] ?? ADMIN_DASHBOARD_URL;
      const age = Math.floor(
        (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24),
      );
      return (
        `<li style="margin-bottom:8px;">` +
        `<strong>${escapeHtml(a.title)}</strong> — ${escapeHtml(a.description)}` +
        ` <em>(waiting ${age} day${age === 1 ? "" : "s"})</em>` +
        ` · <a href="${url}">Review</a>` +
        `</li>`
      );
    })
    .join("");

  return (
    `<div style="font-family:sans-serif;max-width:600px;">` +
    `<h2>High-priority admin matters need your attention</h2>` +
    `<p>The following ${newAlerts.length === 1 ? "matter has" : `${newAlerts.length} matters have`} ` +
    `been waiting for admin action for more than 3 days:</p>` +
    `<ul>${items}</ul>` +
    `<p>${totalHigh} high-priority matter${totalHigh === 1 ? " is" : "s are"} currently open in total.</p>` +
    `<p><a href="${ADMIN_DASHBOARD_URL}">Open the admin dashboard</a></p>` +
    `<p style="color:#6b7873;font-size:12px;">Give Protocol · automated high-priority digest (GIV-721)</p>` +
    `</div>`
  );
}

/**
 * Sends an email via the Resend API.
 * @param resendApiKey - Resend API key
 * @param to - Recipient address
 * @param subject - Email subject
 * @param html - Email HTML body
 * @returns True when Resend accepted the send
 */
async function sendEmail(
  resendApiKey: string,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  const sendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Give Protocol <notifications@giveprotocol.io>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!sendResponse.ok) {
    const errText = await sendResponse.text();
    console.error(
      `Resend API error ${sendResponse.status} sending to ${to}:`,
      errText,
    );
    return false;
  }
  return true;
}

/**
 * Resolves the list of admin recipient emails.
 * @param supabase - Service-role Supabase client
 * @returns Admin emails, falling back to ADMIN_ALERT_EMAIL when none exist
 */
async function getRecipients(supabase: SupabaseClient): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_admin_notification_emails");
  if (error) {
    console.error("get_admin_notification_emails failed:", error.message);
  }
  const emails = ((data ?? []) as Array<{ email: string }>)
    .map((r) => r.email)
    .filter((e) => typeof e === "string" && e.length > 0);

  if (emails.length === 0) {
    emails.push(Deno.env.get("ADMIN_ALERT_EMAIL") ?? DEFAULT_ADMIN_EMAIL);
  }
  return emails;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase configuration" }, 500);
  }

  // Only pg_cron (via invoke_admin_alert_digest) or operators with the
  // service-role key may trigger the digest.
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.replace("Bearer ", "") ?? "";
  if (token !== serviceRoleKey) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // 1. Current high-priority matters (> 3 days old)
  const { data: alertData, error: alertError } = await supabase.rpc(
    "get_admin_alert_digest",
  );
  if (alertError) {
    console.error("get_admin_alert_digest failed:", alertError.message);
    return jsonResponse({ error: alertError.message }, 500);
  }
  const highAlerts = (alertData ?? []) as DigestAlertRow[];
  const currentKeys = new Set(
    highAlerts.map((a) => alertKey(a.alert_type, a.entity_id)),
  );

  // 2. Already-notified ledger
  const { data: ledgerData, error: ledgerError } = await supabase
    .from("admin_alert_notifications")
    .select("alert_type, entity_id");
  if (ledgerError) {
    console.error("Ledger read failed:", ledgerError.message);
    return jsonResponse({ error: ledgerError.message }, 500);
  }
  const ledger = (ledgerData ?? []) as LedgerRow[];
  const notifiedKeys = new Set(
    ledger.map((r) => alertKey(r.alert_type, r.entity_id)),
  );

  // 3. Prune ledger rows for matters no longer high priority (resolved)
  const stale = ledger.filter(
    (r) => !currentKeys.has(alertKey(r.alert_type, r.entity_id)),
  );
  for (const row of stale) {
    await supabase
      .from("admin_alert_notifications")
      .delete()
      .eq("alert_type", row.alert_type)
      .eq("entity_id", row.entity_id);
  }

  // 4. Matters that newly crossed the threshold
  const newAlerts = highAlerts.filter(
    (a) => !notifiedKeys.has(alertKey(a.alert_type, a.entity_id)),
  );
  if (newAlerts.length === 0) {
    return jsonResponse(
      { sent: 0, newAlerts: 0, totalHigh: highAlerts.length },
      200,
    );
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) {
    // No email capability configured — report and leave the ledger untouched
    // so the matters are emailed once a key is provisioned.
    console.warn("RESEND_API_KEY not set; skipping digest email send.");
    return jsonResponse(
      { sent: 0, newAlerts: newAlerts.length, skipped: "no RESEND_API_KEY" },
      200,
    );
  }

  const recipients = await getRecipients(supabase);
  const subject = `[Give Protocol] ${newAlerts.length} admin matter${
    newAlerts.length === 1 ? "" : "s"
  } now high priority`;
  const html = buildEmailHtml(newAlerts, highAlerts.length);

  let sent = 0;
  for (const recipient of recipients) {
    const ok = await sendEmail(resendApiKey, recipient, subject, html);
    if (ok) sent += 1;
  }

  // 5. Record notified matters only when at least one email went out,
  //    so a full send failure retries on the next run.
  if (sent > 0) {
    const rows = newAlerts.map((a) => ({
      alert_type: a.alert_type,
      entity_id: a.entity_id,
    }));
    const { error: upsertError } = await supabase
      .from("admin_alert_notifications")
      .upsert(rows, { onConflict: "alert_type,entity_id" });
    if (upsertError) {
      console.error("Ledger upsert failed:", upsertError.message);
    }
  }

  return jsonResponse(
    {
      sent,
      recipients: recipients.length,
      newAlerts: newAlerts.length,
      totalHigh: highAlerts.length,
    },
    200,
  );
});
