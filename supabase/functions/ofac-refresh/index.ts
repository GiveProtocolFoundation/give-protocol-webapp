/**
 * Supabase Edge Function: ofac-refresh
 *
 * Downloads the OFAC SDN (Specially Designated Nationals) list in legacy CSV
 * form, parses it with the shared engine, and replaces the cache in
 * `ofac_sdn_entries`. Scheduled daily via pg_cron, or run manually.
 *
 * Auth modes:
 *  - With x-cron-secret matching CRON_SHARED_SECRET: pg_cron scheduled run.
 *  - With Authorization: Bearer <SERVICE_ROLE_KEY>: manual / admin run.
 *
 * GIV-1048 (MVP-CHR-01 criterion: TEOS/OFAC data rechecked on each refresh).
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import { parseSdnCsv, type SdnEntry } from "../_shared/ofac.ts";

const DEFAULT_SDN_CSV_URL =
  "https://www.treasury.gov/ofac/downloads/sdn.csv";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UPSERT_BATCH_SIZE = 500;

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
  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { success: false, error: "Server configuration error" },
      503,
    );
  }

  // Authorization: cron secret OR service-role key.
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

  const sdnCsvUrl = Deno.env.get("OFAC_SDN_CSV_URL") ?? DEFAULT_SDN_CSV_URL;

  let csvText: string;
  try {
    const response = await fetch(sdnCsvUrl, {
      headers: { "User-Agent": "GiveProtocol-ofac-refresh/1.0" },
    });
    if (!response.ok) {
      return jsonResponse(
        {
          success: false,
          error: `OFAC SDN download failed with HTTP ${response.status}`,
        },
        502,
      );
    }
    csvText = await response.text();
  } catch (error) {
    console.error("OFAC SDN download error:", error);
    return jsonResponse(
      { success: false, error: "OFAC SDN download failed" },
      502,
    );
  }

  let entries: SdnEntry[];
  try {
    entries = parseSdnCsv(csvText);
  } catch (error) {
    console.error("OFAC SDN parse error:", error);
    return jsonResponse(
      { success: false, error: "OFAC SDN parse failed" },
      500,
    );
  }

  if (entries.length === 0) {
    return jsonResponse(
      { success: false, error: "Parsed zero SDN entries; refusing to clear cache" },
      500,
    );
  }

  const client = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const snapshotAt = new Date().toISOString();

  // Insert/refresh in batches (and prune any stale entity numbers that are no
  // longer present in the list, so removed designations age out).
  try {
    for (let offset = 0; offset < entries.length; offset += UPSERT_BATCH_SIZE) {
      const batch = entries.slice(offset, offset + UPSERT_BATCH_SIZE).map(
        (entry) => ({
          entity_number: entry.entityNumber,
          name: entry.name,
          entry_type: entry.entryType,
          programs: entry.programs,
          remark: entry.remark,
          alt_names: entry.altNames,
          digital_currency_addresses: entry.digitalCurrencyAddresses,
          source: "ofac_sdn_csv",
          snapshot_at: snapshotAt,
          updated_at: new Date().toISOString(),
        }),
      );

      const { error } = await client
        .from("ofac_sdn_entries")
        .upsert(batch, { onConflict: "entity_number" });
      if (error) {
        console.error(`Failed upserting SDN batch at offset ${offset}:`, error);
        return jsonResponse(
          { success: false, error: "Failed to update SDN cache" },
          500,
        );
      }
    }

    const currentNumbers = entries.map((entry) => entry.entityNumber);
    const { error: pruneError } = await client
      .from("ofac_sdn_entries")
      .delete()
      .not("entity_number", "in", `(${currentNumbers.join(",")})`);
    if (pruneError) {
      // Non-fatal: stale rows will be ignored by screening anyway since the
      // engine compares against exact addresses/names; log and continue.
      console.warn("Failed to prune stale SDN entries:", pruneError);
    }
  } catch (error) {
    console.error("OFAC SDN store error:", error);
    return jsonResponse(
      { success: false, error: "Failed to store SDN cache" },
      500,
    );
  }

  return jsonResponse(
    {
      success: true,
      entries: entries.length,
      snapshotAt,
    },
    200,
  );
});