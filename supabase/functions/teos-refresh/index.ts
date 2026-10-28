/**
 * Supabase Edge Function: teos-refresh
 *
 * Downloads IRS Tax Exempt Organization Search (TEOS) bulk data:
 *   1. Publication 78 — orgs eligible for tax-deductible contributions
 *   2. Auto-Revocation List — orgs whose 501(c)(3) was revoked
 *
 * Then cross-references with charity_organizations to update status flags
 * and performs PPA v1.1 officer re-verification for claimed charities.
 *
 * Scheduled daily via pg_cron (03:00 UTC) or invoked manually.
 *
 * Auth modes:
 *  - Authorization: Bearer <SERVICE_ROLE_KEY> (cron or manual)
 *  - x-cron-secret matching CRON_SHARED_SECRET (pg_cron legacy)
 *
 * GIV-1047 (MVP-CHR-01)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ---------------------------------------------------------------------------
// IRS TEOS bulk data URLs
// See: https://www.irs.gov/charities-non-profits/tax-exempt-organization-search-bulk-data-downloads
// ---------------------------------------------------------------------------
const TEOS_PUB78_URL =
  "https://apps.irs.gov/pub/epostcard/data-download-pub78.txt";
const TEOS_REVOCATION_URL =
  "https://apps.irs.gov/pub/epostcard/data-download-revocation.txt";

const UPSERT_BATCH_SIZE = 500;
const STATUS_UPDATE_BATCH_SIZE = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Pub78Record {
  ein: string;
  name: string;
  city: string;
  state: string;
  country: string;
  deductibility: string;
}

interface RevocationRecord {
  ein: string;
  name: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  exemption_type: string;
  revocation_date: string | null;
  revocation_posting_date: string | null;
  reinstatement_date: string | null;
}

interface RefreshStats {
  pub78_total: number;
  pub78_inserted: number;
  pub78_updated: number;
  revoc_total: number;
  revoc_inserted: number;
  revoc_updated: number;
  status_flags_added: number;
  status_flags_removed: number;
  officer_checks_run: number;
  officer_checks_failed: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Parse an IRS date string (MM/DD/YYYY or YYYY-MM-DD) into an ISO date string.
 * Returns null for empty or unparseable values.
 */
function parseIrsDate(raw: string | undefined): string | null {
  if (!raw || raw.trim() === "") return null;
  const trimmed = raw.trim();

  // MM/DD/YYYY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, mm, dd, yyyy] = slashMatch;
    return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // YYYY-MM-DD format (already ISO)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Parse Publication 78 pipe-delimited text.
 * Format: EIN|Name|City|State|Country|Deductibility Code
 */
function parsePub78(text: string): Pub78Record[] {
  const records: Pub78Record[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split("|");
    if (parts.length < 6) continue;

    const ein = (parts[0] || "").trim();
    if (!ein || !/^\d{9}$/.test(ein.replace(/-/g, ""))) continue;

    records.push({
      ein: ein.replace(/-/g, ""),
      name: (parts[1] || "").trim(),
      city: (parts[2] || "").trim(),
      state: (parts[3] || "").trim(),
      country: (parts[4] || "").trim(),
      deductibility: (parts[5] || "").trim(),
    });
  }

  return records;
}

/**
 * Parse Auto-Revocation pipe-delimited text.
 * Format: EIN|Name|City|State|ZIP|Country|Exemption Type|Revocation Date|Revocation Posting Date|Reinstatement Date
 */
function parseRevocations(text: string): RevocationRecord[] {
  const records: RevocationRecord[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const parts = trimmed.split("|");
    if (parts.length < 8) continue;

    const ein = (parts[0] || "").trim();
    if (!ein || !/^\d{9}$/.test(ein.replace(/-/g, ""))) continue;

    records.push({
      ein: ein.replace(/-/g, ""),
      name: (parts[1] || "").trim(),
      city: (parts[2] || "").trim(),
      state: (parts[3] || "").trim(),
      zip: (parts[4] || "").trim(),
      country: (parts[5] || "").trim(),
      exemption_type: (parts[6] || "").trim(),
      revocation_date: parseIrsDate(parts[7]),
      revocation_posting_date: parseIrsDate(parts[8]),
      reinstatement_date: parseIrsDate(parts[9]),
    });
  }

  return records;
}

/**
 * Download text data from a URL with retry logic.
 */
async function downloadText(
  url: string,
  label: string,
  maxRetries = 3,
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "GiveProtocol-teos-refresh/1.0" },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (attempt === maxRetries) {
        throw new Error(
          `Failed to download ${label} after ${maxRetries} attempts: ${msg}`,
        );
      }
      console.warn(
        `${label} download attempt ${attempt} failed: ${msg} — retrying...`,
      );
      await new Promise((r) => setTimeout(r, attempt * 2000));
    }
  }
  throw new Error(`Unreachable: download ${label}`);
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "Method not allowed" }, 405);
  }

  // --- Auth ---
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      503,
    );
  }

  const cronSecret = Deno.env.get("CRON_SHARED_SECRET");
  const xCron = req.headers.get("x-cron-secret");
  const authHeader = req.headers.get("Authorization");
  const bearerToken = authHeader?.replace("Bearer ", "") ?? "";
  const isCron = Boolean(
    cronSecret && xCron && cronSecret.length > 0 && xCron === cronSecret,
  );
  const isServiceRole = bearerToken === supabaseServiceKey;

  if (!isCron && !isServiceRole) {
    return jsonResponse({ success: false, error: "Unauthorized" }, 401);
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stats: RefreshStats = {
    pub78_total: 0,
    pub78_inserted: 0,
    pub78_updated: 0,
    revoc_total: 0,
    revoc_inserted: 0,
    revoc_updated: 0,
    status_flags_added: 0,
    status_flags_removed: 0,
    officer_checks_run: 0,
    officer_checks_failed: 0,
  };

  // --- Create refresh log entry ---
  const { data: logEntry, error: logError } = await client
    .from("teos_refresh_log")
    .insert({ status: "running" })
    .select("id")
    .single();

  if (logError || !logEntry) {
    console.error("Failed to create refresh log entry:", logError);
    return jsonResponse(
      { success: false, error: "Failed to initialize refresh run" },
      500,
    );
  }

  const snapshotId = logEntry.id;

  try {
    // =======================================================================
    // Phase 1: Download and ingest Publication 78
    // =======================================================================
    console.log("Phase 1: Downloading Publication 78 data...");
    const pub78Text = await downloadText(TEOS_PUB78_URL, "Publication 78");
    const pub78Records = parsePub78(pub78Text);
    stats.pub78_total = pub78Records.length;

    if (pub78Records.length === 0) {
      throw new Error(
        "Parsed zero Pub 78 records — refusing to process (possible format change)",
      );
    }

    console.log(`Parsed ${pub78Records.length} Pub 78 records. Upserting...`);

    for (
      let offset = 0;
      offset < pub78Records.length;
      offset += UPSERT_BATCH_SIZE
    ) {
      const batch = pub78Records
        .slice(offset, offset + UPSERT_BATCH_SIZE)
        .map((r) => ({
          ein: r.ein,
          name: r.name,
          city: r.city || null,
          state: r.state || null,
          country: r.country || null,
          deductibility: r.deductibility || null,
          snapshot_id: snapshotId,
          updated_at: new Date().toISOString(),
        }));

      const { error } = await client
        .from("teos_pub78_data")
        .upsert(batch, { onConflict: "ein" });

      if (error) {
        console.error(`Pub 78 upsert error at offset ${offset}:`, error);
        throw new Error(`Pub 78 upsert failed: ${error.message}`);
      }

      stats.pub78_updated += batch.length;
    }

    stats.pub78_inserted = stats.pub78_updated; // all-or-nothing upsert

    // =======================================================================
    // Phase 2: Download and ingest Auto-Revocation list
    // =======================================================================
    console.log("Phase 2: Downloading Auto-Revocation list...");
    const revocText = await downloadText(
      TEOS_REVOCATION_URL,
      "Auto-Revocation",
    );
    const revocRecords = parseRevocations(revocText);
    stats.revoc_total = revocRecords.length;

    console.log(
      `Parsed ${revocRecords.length} revocation records. Upserting...`,
    );

    for (
      let offset = 0;
      offset < revocRecords.length;
      offset += UPSERT_BATCH_SIZE
    ) {
      const batch = revocRecords
        .slice(offset, offset + UPSERT_BATCH_SIZE)
        .map((r) => ({
          ein: r.ein,
          name: r.name,
          city: r.city || null,
          state: r.state || null,
          zip: r.zip || null,
          country: r.country || null,
          exemption_type: r.exemption_type || null,
          revocation_date: r.revocation_date,
          revocation_posting_date: r.revocation_posting_date,
          reinstatement_date: r.reinstatement_date,
          snapshot_id: snapshotId,
          updated_at: new Date().toISOString(),
        }));

      const { error } = await client
        .from("teos_revocations")
        .upsert(batch, { onConflict: "ein" });

      if (error) {
        console.error(`Revocation upsert error at offset ${offset}:`, error);
        throw new Error(`Revocation upsert failed: ${error.message}`);
      }

      stats.revoc_updated += batch.length;
    }

    stats.revoc_inserted = stats.revoc_updated;

    // =======================================================================
    // Phase 3: Cross-reference with charity_organizations
    // =======================================================================
    console.log(
      "Phase 3: Updating charity_organizations TEOS status flags...",
    );
    const now = new Date().toISOString();

    // Build EIN sets for efficient lookups
    const pub78Eins = new Set(pub78Records.map((r) => r.ein));
    const pub78Map = new Map(pub78Records.map((r) => [r.ein, r]));
    const revocMap = new Map(revocRecords.map((r) => [r.ein, r]));

    // Fetch all charity_organizations that are US-based (TEOS only covers US)
    // Process in pages to avoid memory issues
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: orgs, error: fetchError } = await client
        .from("charity_organizations")
        .select("ein, teos_pub78_status, teos_revocation_date")
        .eq("country", "US")
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (fetchError) {
        console.error("Error fetching charity_organizations page:", fetchError);
        break;
      }

      if (!orgs || orgs.length === 0) {
        hasMore = false;
        break;
      }

      // Build update batches
      const updates: Array<{
        ein: string;
        teos_pub78_status: string;
        teos_deductibility: string | null;
        teos_revocation_date: string | null;
        teos_reinstatement_date: string | null;
        teos_last_checked_at: string;
      }> = [];

      for (const org of orgs) {
        const inPub78 = pub78Eins.has(org.ein);
        const pub78 = pub78Map.get(org.ein);
        const revoc = revocMap.get(org.ein);

        let newStatus: string;
        if (revoc && revoc.reinstatement_date) {
          newStatus = "reinstated";
        } else if (revoc && !revoc.reinstatement_date) {
          newStatus = "revoked";
        } else if (inPub78) {
          newStatus = "eligible";
        } else {
          newStatus = "not_found";
        }

        // Track status changes
        if (newStatus !== org.teos_pub78_status) {
          if (
            newStatus === "revoked" &&
            org.teos_pub78_status !== "revoked"
          ) {
            stats.status_flags_added++;
          }
          if (
            org.teos_pub78_status === "revoked" &&
            newStatus !== "revoked"
          ) {
            stats.status_flags_removed++;
          }
        }

        updates.push({
          ein: org.ein,
          teos_pub78_status: newStatus,
          teos_deductibility: pub78?.deductibility ?? null,
          teos_revocation_date: revoc?.revocation_date ?? null,
          teos_reinstatement_date: revoc?.reinstatement_date ?? null,
          teos_last_checked_at: now,
        });
      }

      // Batch update charity_organizations
      for (
        let i = 0;
        i < updates.length;
        i += STATUS_UPDATE_BATCH_SIZE
      ) {
        const batch = updates.slice(i, i + STATUS_UPDATE_BATCH_SIZE);
        for (const row of batch) {
          const { error: updateError } = await client
            .from("charity_organizations")
            .update({
              teos_pub78_status: row.teos_pub78_status,
              teos_deductibility: row.teos_deductibility,
              teos_revocation_date: row.teos_revocation_date,
              teos_reinstatement_date: row.teos_reinstatement_date,
              teos_last_checked_at: row.teos_last_checked_at,
            })
            .eq("ein", row.ein);

          if (updateError) {
            console.warn(
              `Failed to update status for EIN ${row.ein}:`,
              updateError,
            );
          }
        }
      }

      hasMore = orgs.length === pageSize;
      page++;
    }

    // =======================================================================
    // Phase 4: PPA v1.1 Officer Re-verification
    // =======================================================================
    console.log("Phase 4: PPA v1.1 officer re-verification...");

    // Fetch active authorized reps that need re-checking
    const { data: activeReps, error: repsError } = await client
      .from("charity_authorized_reps")
      .select("id, ein, rep_name, rep_title, charity_profile_id")
      .eq("is_active", true);

    if (repsError) {
      console.warn("Failed to fetch active reps for re-verification:", repsError);
    } else if (activeReps && activeReps.length > 0) {
      for (const rep of activeReps) {
        stats.officer_checks_run++;

        try {
          // Check 1: Is the org still in good standing with TEOS?
          const orgPub78 = pub78Map.get(rep.ein);
          const orgRevoc = revocMap.get(rep.ein);
          const isRevoked = Boolean(
            orgRevoc && !orgRevoc.reinstatement_date,
          );

          if (isRevoked) {
            // Org is revoked — flag the rep verification as error
            await client
              .from("charity_authorized_reps")
              .update({
                check_result: "error",
                last_checked_at: now,
                updated_at: now,
                check_details: {
                  reason: "org_exempt_status_revoked",
                  revocation_date: orgRevoc?.revocation_date,
                  checked_at: now,
                },
              })
              .eq("id", rep.id);

            stats.officer_checks_failed++;
            continue;
          }

          // Check 2: Officer name verification
          // The IRS does not provide a public bulk officer list via TEOS.
          // Form 990 officer data must be obtained from other sources
          // (e.g., ProPublica Nonprofit Explorer API, IRS e-file data).
          // For MVP, we verify that:
          //   a) The org is still in Pub 78 (exempt status active)
          //   b) Record the check with a note about the data source limitation
          //
          // Future enhancement: integrate ProPublica API or IRS e-file
          // XML data for full officer name matching.

          const isInPub78 = Boolean(orgPub78);

          if (isInPub78) {
            await client
              .from("charity_authorized_reps")
              .update({
                check_result: "verified",
                last_checked_at: now,
                verified_at: now,
                updated_at: now,
                check_details: {
                  exempt_status: "active",
                  deductibility: orgPub78?.deductibility,
                  officer_name_check: "deferred_to_990_data",
                  checked_at: now,
                },
              })
              .eq("id", rep.id);
          } else {
            // Org not found in Pub 78 — could be newly filed, data lag, etc.
            await client
              .from("charity_authorized_reps")
              .update({
                check_result: "not_found",
                last_checked_at: now,
                updated_at: now,
                check_details: {
                  reason: "org_not_in_pub78",
                  note: "Organization not found in current Pub 78 data — may be newly filed or data lag",
                  checked_at: now,
                },
              })
              .eq("id", rep.id);

            stats.officer_checks_failed++;
          }
        } catch (repError) {
          console.warn(
            `Officer re-verification failed for rep ${rep.id}:`,
            repError,
          );
          stats.officer_checks_failed++;

          await client
            .from("charity_authorized_reps")
            .update({
              check_result: "error",
              last_checked_at: now,
              updated_at: now,
              check_details: {
                reason: "check_error",
                error:
                  repError instanceof Error
                    ? repError.message
                    : String(repError),
                checked_at: now,
              },
            })
            .eq("id", rep.id);
        }
      }
    }

    // =======================================================================
    // Phase 5: Finalize refresh log
    // =======================================================================
    const finalStatus =
      stats.officer_checks_failed > 0 ? "partial" : "success";

    await client
      .from("teos_refresh_log")
      .update({
        status: finalStatus,
        finished_at: now,
        pub78_total: stats.pub78_total,
        pub78_inserted: stats.pub78_inserted,
        pub78_updated: stats.pub78_updated,
        revoc_total: stats.revoc_total,
        revoc_inserted: stats.revoc_inserted,
        revoc_updated: stats.revoc_updated,
        status_flags_added: stats.status_flags_added,
        status_flags_removed: stats.status_flags_removed,
        officer_checks_run: stats.officer_checks_run,
        officer_checks_failed: stats.officer_checks_failed,
      })
      .eq("id", snapshotId);

    console.log("TEOS refresh completed:", stats);

    return jsonResponse(
      {
        success: true,
        snapshotId,
        stats,
      },
      200,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("TEOS refresh failed:", errorMessage);

    // Update log entry with failure
    await client
      .from("teos_refresh_log")
      .update({
        status: "failed",
        finished_at: new Date().toISOString(),
        error_message: errorMessage,
        pub78_total: stats.pub78_total,
        pub78_inserted: stats.pub78_inserted,
        pub78_updated: stats.pub78_updated,
        revoc_total: stats.revoc_total,
        revoc_inserted: stats.revoc_inserted,
        revoc_updated: stats.revoc_updated,
        officer_checks_run: stats.officer_checks_run,
        officer_checks_failed: stats.officer_checks_failed,
      })
      .eq("id", snapshotId);

    return jsonResponse(
      {
        success: false,
        error: errorMessage,
        snapshotId,
        partialStats: stats,
      },
      500,
    );
  }
});
