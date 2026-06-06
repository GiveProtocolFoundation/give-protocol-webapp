/**
 * Supabase Edge Function: gdpr-erasure-cron
 * @module gdpr-erasure-cron
 * @description Nightly cron that executes GDPR Art. 17 erasure for accounts
 * past their 30-day cooling-off period.
 *
 * Trigger: Called by pg_cron at 02:00 UTC daily, or via HTTP POST with
 * the service-role key (for manual runs / testing).
 *
 * Erasure sequence (per GIV-58 spec, amended by GIV-314):
 *   Step 1        — Collect audit data (blockchain refs from sbt_audit_log)
 *   Step 2        — Anonymize volunteer_applications PII fields
 *   Step 3        — Anonymize charity_profile authorized signer fields
 *   Step 4        — Anonymize charity_nominations.nominator_email
 *   Step 5        — Set volunteer_verifications.volunteer_id = NULL
 *   Step 5b       — Anonymize fiat_donations PII fields; set donor_id = NULL
 *   Step 5c-store — Delete custodian attestation objects from Storage (best-effort)
 *   Step 5c       — Anonymize charity_wallets PII (wallet_address, custodian fields)
 *   Step 6        — Hard delete wallet_aliases
 *   Step 7        — Hard delete user_identities
 *   Step 8        — Hard delete user_preferences
 *   Step 9        — Hard delete profiles
 *   Step 10       — Delete auth.users via Supabase Admin API (cascades downstream tables)
 *   Step 11       — Write deletion_audit_log entry
 *
 * Steps 1–9 (including 5c) run inside a DB transaction via an RPC function.
 * Step 5c-storage runs before the RPC so attestation URLs are still readable.
 * Step 10 is an external API call; on failure a compensating re-queue is attempted.
 * Step 11 is written regardless of step 10 outcome (with partial status on failure).
 *
 * Storage-limitation cleanup (per GIV-346/GIV-347, Art. 5(1)(e)):
 *   — Delete expired passkey_challenges (expires_at older than 1 hour)
 *   — Delete stale export_requests (expired/failed, requested_at older than 30 days)
 * These run every cycle regardless of whether any user erasures are processed.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ErasureTarget {
  userId: string;
  email: string;
  requestId: string;
  requestedAt: string;
}

interface BlockchainRef {
  table_name: string;
  source_row_id: string;
  blockchain_tx_hash: string | null;
  token_id: number | null;
  token_type: string;
}

interface ErasureResult {
  userId: string;
  success: boolean;
  stepsCompleted: string[];
  error?: string;
  authDeleteFailed?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEPS = {
  COLLECT_AUDIT_DATA: 'collect_audit_data',
  ANONYMIZE_VOLUNTEER_APPLICATIONS: 'anonymize_volunteer_applications',
  ANONYMIZE_CHARITY_PROFILE: 'anonymize_charity_profile',
  ANONYMIZE_CHARITY_NOMINATIONS: 'anonymize_charity_nominations',
  NULL_VOLUNTEER_VERIFICATIONS: 'null_volunteer_verifications',
  ANONYMIZE_FIAT_DONATIONS: 'anonymize_fiat_donations',
  DELETE_CHARITY_ATTESTATION_STORAGE: 'delete_charity_attestation_storage',
  ANONYMIZE_CHARITY_WALLETS: 'anonymize_charity_wallets',
  DELETE_WALLET_ALIASES: 'delete_wallet_aliases',
  DELETE_USER_IDENTITIES: 'delete_user_identities',
  DELETE_USER_PREFERENCES: 'delete_user_preferences',
  DELETE_PROFILES: 'delete_profiles',
  DELETE_AUTH_USER: 'delete_auth_user',
  WRITE_AUDIT_LOG: 'write_audit_log',
} as const;

const ATTESTATION_BUCKET = 'charity-attestations';

// ---------------------------------------------------------------------------
// Helper: SHA-256 hash of a string (no PII stored in audit log)
// ---------------------------------------------------------------------------

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Helper: extract storage path from a Supabase Storage URL
// ---------------------------------------------------------------------------

/**
 * Extracts the object path from a Supabase Storage signed/public URL.
 * Handles both public URLs (`/storage/v1/object/public/bucket/path`)
 * and signed URLs (`/storage/v1/object/sign/bucket/path?token=...`).
 * Falls back to using the full URL as a path if no pattern matches.
 *
 * @param url - The full Supabase Storage URL or relative path
 * @param bucket - The storage bucket name to strip from the path
 * @returns The object path within the bucket
 */
function extractStoragePath(url: string, bucket: string): string {
  // Try to parse as a URL and extract the path after /object/(public|sign)/bucket/
  try {
    const parsed = new URL(url, 'https://placeholder.supabase.co');
    const pathParts = parsed.pathname.split('/');
    // Find the bucket name in the path and return everything after it
    const bucketIdx = pathParts.indexOf(bucket);
    if (bucketIdx !== -1 && bucketIdx < pathParts.length - 1) {
      return pathParts.slice(bucketIdx + 1).join('/');
    }
  } catch {
    // Not a valid URL; fall through
  }

  // Fallback: if the URL contains the bucket name, extract the path after it
  const bucketPrefix = `${bucket}/`;
  const prefixIdx = url.indexOf(bucketPrefix);
  if (prefixIdx !== -1) {
    const afterBucket = url.substring(prefixIdx + bucketPrefix.length);
    // Strip any query string
    const qIdx = afterBucket.indexOf('?');
    return qIdx !== -1 ? afterBucket.substring(0, qIdx) : afterBucket;
  }

  // Last resort: use as-is (caller should handle failures gracefully)
  return url;
}

// ---------------------------------------------------------------------------
// Step 5c-storage: Delete custodian attestation objects from Storage
// ---------------------------------------------------------------------------

/**
 * Deletes custody attestation files from Supabase Storage for the given user.
 * Runs BEFORE the SQL anonymization step so the URLs are still available.
 * Failures are logged but do not abort the erasure — storage cleanup is
 * best-effort; SQL anonymization is the legal guarantee.
 *
 * @param userId - The user ID whose charities' attestation files to delete
 * @param supabase - Supabase client with service_role privileges
 * @returns List of step names completed
 */
async function deleteCharityAttestationStorage(
  userId: string,
  supabase: SupabaseClient,
): Promise<string[]> {
  // Find charity_profile IDs owned by this user
  const { data: charityProfiles } = await supabase
    .from('charity_profiles')
    .select('id')
    .eq('claimed_by', userId);

  const charityProfileIds = (charityProfiles ?? []).map((p) => p.id);

  if (charityProfileIds.length === 0) {
    return [STEPS.DELETE_CHARITY_ATTESTATION_STORAGE];
  }

  // Find wallets with attestation documents
  const { data: wallets } = await supabase
    .from('charity_wallets')
    .select('custodian_attestation_doc_url, charity_profile_id')
    .not('custodian_attestation_doc_url', 'is', null)
    .in('charity_profile_id', charityProfileIds);

  for (const wallet of wallets ?? []) {
    if (!wallet.custodian_attestation_doc_url) continue;
    try {
      const path = extractStoragePath(wallet.custodian_attestation_doc_url, ATTESTATION_BUCKET);
      const { error } = await supabase.storage.from(ATTESTATION_BUCKET).remove([path]);
      if (error) {
        console.error(
          `[gdpr-erasure-cron] Failed to delete attestation object ` +
          `(charity_profile=${wallet.charity_profile_id}, path=${path}): ${error.message}`,
        );
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(
        `[gdpr-erasure-cron] Error deleting attestation object for ` +
        `charity_profile=${wallet.charity_profile_id}: ${msg}`,
      );
    }
  }

  return [STEPS.DELETE_CHARITY_ATTESTATION_STORAGE];
}

// ---------------------------------------------------------------------------
// Step 1: Collect blockchain refs for sbt_audit_log (before any deletion)
// ---------------------------------------------------------------------------

async function collectBlockchainRefs(
  userId: string,
  supabase: SupabaseClient,
): Promise<{ refs: BlockchainRef[]; stepsCompleted: string[] }> {
  const stepsCompleted: string[] = [];

  // Collect self_reported_hours with blockchain refs
  const { data: selfReported } = await supabase
    .from('self_reported_hours')
    .select('id, blockchain_tx_hash, sbt_token_id')
    .eq('volunteer_id', userId)
    .not('blockchain_tx_hash', 'is', null);

  // Collect volunteer_verifications with blockchain refs
  const { data: verifications } = await supabase
    .from('volunteer_verifications')
    .select('id, blockchain_tx_hash, nft_token_id')
    .eq('volunteer_id', userId)
    .not('blockchain_tx_hash', 'is', null);

  const refs: BlockchainRef[] = [];

  for (const row of selfReported ?? []) {
    if (!row.blockchain_tx_hash) continue;
    refs.push({
      table_name: 'self_reported_hours',
      source_row_id: row.id,
      blockchain_tx_hash: row.blockchain_tx_hash,
      token_id: row.sbt_token_id ?? null,
      token_type: 'SBT',
    });
  }

  for (const row of verifications ?? []) {
    if (!row.blockchain_tx_hash) continue;
    refs.push({
      table_name: 'volunteer_verifications',
      source_row_id: row.id,
      blockchain_tx_hash: row.blockchain_tx_hash,
      token_id: row.nft_token_id ?? null,
      token_type: 'NFT',
    });
  }

  // Insert sbt_audit_log entries (batch)
  if (refs.length > 0) {
    const auditEntries = refs.map((ref) => ({
      deleted_user_id: userId,
      table_name: ref.table_name,
      source_row_id: ref.source_row_id,
      blockchain_tx_hash: ref.blockchain_tx_hash,
      token_id: ref.token_id,
      token_type: ref.token_type,
    }));

    const { error: auditInsertError } = await supabase
      .from('sbt_audit_log')
      .insert(auditEntries);

    if (auditInsertError) {
      throw new Error(`Step 1 sbt_audit_log insert failed: ${auditInsertError.message}`);
    }
  }

  stepsCompleted.push(STEPS.COLLECT_AUDIT_DATA);
  return { refs, stepsCompleted };
}

// ---------------------------------------------------------------------------
// Steps 2–9: Transactional PII erasure via RPC
// ---------------------------------------------------------------------------

async function executeTransactionalErasure(
  userId: string,
  email: string,
  supabase: SupabaseClient,
): Promise<string[]> {
  // Call a server-side RPC that wraps steps 2–9 in a single transaction.
  // The RPC is defined in the migration 20260408000001_gdpr_erasure_rpc.sql
  const { error } = await supabase.rpc('execute_gdpr_erasure', {
    p_user_id: userId,
    p_user_email: email,
  });

  if (error) {
    throw new Error(`Transactional erasure RPC failed: ${error.message}`);
  }

  return [
    STEPS.ANONYMIZE_VOLUNTEER_APPLICATIONS,
    STEPS.ANONYMIZE_CHARITY_PROFILE,
    STEPS.ANONYMIZE_CHARITY_NOMINATIONS,
    STEPS.NULL_VOLUNTEER_VERIFICATIONS,
    STEPS.ANONYMIZE_FIAT_DONATIONS,
    STEPS.ANONYMIZE_CHARITY_WALLETS,
    STEPS.DELETE_WALLET_ALIASES,
    STEPS.DELETE_USER_IDENTITIES,
    STEPS.DELETE_USER_PREFERENCES,
    STEPS.DELETE_PROFILES,
  ];
}

// ---------------------------------------------------------------------------
// Step 10: Delete auth.users via Admin API
// ---------------------------------------------------------------------------

async function deleteAuthUser(
  userId: string,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  const response = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${userId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const body = await response.text().catch(() => 'unknown error');
    throw new Error(`Auth user deletion failed (HTTP ${response.status}): ${body}`);
  }
}

// ---------------------------------------------------------------------------
// Step 11: Write deletion_audit_log
// ---------------------------------------------------------------------------

async function writeDeletionAuditLog(
  target: ErasureTarget,
  stepsCompleted: string[],
  blockchainRefs: BlockchainRef[],
  supabase: SupabaseClient,
): Promise<void> {
  const emailHash = await sha256Hex(target.email);

  const blockchainRefsJson = blockchainRefs.length > 0
    ? blockchainRefs.map((r) => ({
        table: r.table_name,
        row_id: r.source_row_id,
        tx_hash: r.blockchain_tx_hash,
        token_id: r.token_id,
        token_type: r.token_type,
      }))
    : null;

  const { error } = await supabase
    .from('deletion_audit_log')
    .insert({
      user_id: target.userId,
      email_hash: emailHash,
      requested_at: target.requestedAt,
      processed_at: new Date().toISOString(),
      steps_completed: stepsCompleted,
      blockchain_refs: blockchainRefsJson,
      request_source: 'user_self_service',
    });

  if (error) {
    // Log but don't throw — the user has already been deleted; we should not
    // surface this as a failure that re-queues the erasure.
    console.error(`Step 11 deletion_audit_log write failed for user ${target.userId}: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Core erasure orchestrator for a single user
// ---------------------------------------------------------------------------

async function eraseUser(
  target: ErasureTarget,
  supabase: SupabaseClient,
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<ErasureResult> {
  const allStepsCompleted: string[] = [];
  let blockchainRefs: BlockchainRef[] = [];

  try {
    // Mark erasure_request as processing
    await supabase
      .from('erasure_requests')
      .update({ status: 'processing' })
      .eq('id', target.requestId);

    // Step 1: Collect audit data
    const { refs, stepsCompleted: step1Steps } = await collectBlockchainRefs(target.userId, supabase);
    blockchainRefs = refs;
    allStepsCompleted.push(...step1Steps);

    // Step 5c-storage: Delete custodian attestation objects (before SQL anonymization)
    const storageSteps = await deleteCharityAttestationStorage(target.userId, supabase);
    allStepsCompleted.push(...storageSteps);

    // Steps 2–9 (including 5c SQL): Transactional PII erasure
    const transactionalSteps = await executeTransactionalErasure(target.userId, target.email, supabase);
    allStepsCompleted.push(...transactionalSteps);

    // Step 10: Delete auth.users
    try {
      await deleteAuthUser(target.userId, supabaseUrl, serviceRoleKey);
      allStepsCompleted.push(STEPS.DELETE_AUTH_USER);
    } catch (authErr) {
      const authErrMsg = authErr instanceof Error ? authErr.message : String(authErr);
      console.error(`Step 10 auth user deletion failed for ${target.userId}: ${authErrMsg}`);

      // Compensating re-queue: reset erasure_request to pending so it retries
      // next nightly run. Profiles row is already deleted, so this is a safe
      // partial state — the user can no longer log in, and PII is anonymized.
      await supabase
        .from('erasure_requests')
        .update({
          status: 'pending',
          error_message: `Auth deletion failed (will retry): ${authErrMsg}`,
        })
        .eq('id', target.requestId);

      // Step 11: Write partial audit log
      await writeDeletionAuditLog(target, allStepsCompleted, blockchainRefs, supabase);

      return {
        userId: target.userId,
        success: false,
        stepsCompleted: allStepsCompleted,
        error: authErrMsg,
        authDeleteFailed: true,
      };
    }

    // Step 11: Write completion audit log
    allStepsCompleted.push(STEPS.WRITE_AUDIT_LOG);
    await writeDeletionAuditLog(target, allStepsCompleted, blockchainRefs, supabase);

    // Mark erasure_request as completed
    await supabase
      .from('erasure_requests')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('id', target.requestId);

    return {
      userId: target.userId,
      success: true,
      stepsCompleted: allStepsCompleted,
      authDeleteFailed: false,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`Erasure failed for user ${target.userId}: ${errMsg}`);

    // Write partial audit log so we have a record of what was completed
    await writeDeletionAuditLog(target, allStepsCompleted, blockchainRefs, supabase).catch(
      (logErr) => console.error('Failed to write partial audit log:', logErr),
    );

    // Mark erasure_request as failed
    await supabase
      .from('erasure_requests')
      .update({ status: 'failed', error_message: errMsg })
      .eq('id', target.requestId);

    return {
      userId: target.userId,
      success: false,
      stepsCompleted: allStepsCompleted,
      error: errMsg,
    };
  }
}

// ---------------------------------------------------------------------------
// Find users due for erasure
// ---------------------------------------------------------------------------

async function findErasureTargets(supabase: SupabaseClient): Promise<ErasureTarget[]> {
  // Join profiles + erasure_requests to find accounts past cooling-off
  const { data, error } = await supabase
    .from('erasure_requests')
    .select(`
      id,
      user_id,
      requested_at,
      profiles!inner (scheduled_for_deletion_at)
    `)
    .eq('status', 'pending')
    .lte('scheduled_deletion_date', new Date().toISOString());

  if (error) {
    throw new Error(`Failed to query erasure targets: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Fetch auth emails for each user (needed for charity_nominations lookup + audit log hash)
  const targets: ErasureTarget[] = [];
  for (const row of data) {
    const { data: authUser } = await supabase.auth.admin.getUserById(row.user_id);
    const email = authUser?.user?.email ?? '';
    targets.push({
      userId: row.user_id,
      email,
      requestId: row.id,
      requestedAt: row.requested_at,
    });
  }

  return targets;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request) => {
  // Allow both GET (pg_cron HTTP trigger) and POST (manual run)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Only callable by service-role (cron or admin)
  const authHeader = req.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '') ?? '';
  if (token !== serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const runStart = new Date().toISOString();
  console.log(`[gdpr-erasure-cron] Run started at ${runStart}`);

  try {
    const targets = await findErasureTargets(supabase);
    console.log(`[gdpr-erasure-cron] Found ${targets.length} account(s) due for erasure`);

    const results: ErasureResult[] = [];
    for (const target of targets) {
      console.log(`[gdpr-erasure-cron] Processing erasure for user ${target.userId}`);
      const result = await eraseUser(target, supabase, supabaseUrl, serviceRoleKey);
      results.push(result);
      console.log(
        `[gdpr-erasure-cron] User ${target.userId}: ${result.success ? 'SUCCESS' : 'FAILED'} — ` +
        `steps completed: ${result.stepsCompleted.join(', ')}`,
      );
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.length - successCount;

    if (results.length > 0) {
      console.log(`[gdpr-erasure-cron] Erasure complete. Success: ${successCount}, Failed: ${failCount}`);
    }

    // -----------------------------------------------------------------
    // Storage-limitation cleanup — Art. 5(1)(e)
    // Runs every cycle regardless of whether any user erasures ran.
    // -----------------------------------------------------------------

    // 1. Delete expired passkey_challenges (older than 1 hour past expiry)
    const challengeThreshold = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: deletedChallenges, error: challengesError } = await supabase
      .from('passkey_challenges')
      .delete()
      .lt('expires_at', challengeThreshold)
      .select('id');

    const expiredPasskeyChallenges = challengesError ? 0 : (deletedChallenges?.length ?? 0);
    if (challengesError) {
      console.error(`[gdpr-erasure-cron] passkey_challenges cleanup failed: ${challengesError.message}`);
    } else {
      console.log(`[gdpr-erasure-cron] Cleaned up ${expiredPasskeyChallenges} expired passkey_challenges`);
    }

    // 2. Delete stale export_requests (expired/failed, older than 30 days)
    const exportThreshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: deletedExports, error: exportsError } = await supabase
      .from('export_requests')
      .delete()
      .in('status', ['expired', 'failed'])
      .lt('requested_at', exportThreshold)
      .select('id');

    const staleExportRequests = exportsError ? 0 : (deletedExports?.length ?? 0);
    if (exportsError) {
      console.error(`[gdpr-erasure-cron] export_requests cleanup failed: ${exportsError.message}`);
    } else {
      console.log(`[gdpr-erasure-cron] Cleaned up ${staleExportRequests} stale export_requests`);
    }

    console.log(`[gdpr-erasure-cron] Run complete`);

    return new Response(
      JSON.stringify({
        processed: results.length,
        succeeded: successCount,
        failed: failCount,
        cleanup: {
          expiredPasskeyChallenges,
          staleExportRequests,
        },
        runStart,
        results: results.map((r) => ({
          userId: r.userId,
          success: r.success,
          stepsCompleted: r.stepsCompleted,
          error: r.error ?? null,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    console.error(`[gdpr-erasure-cron] Fatal error: ${message}`);
    return new Response(JSON.stringify({ error: message, runStart }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
