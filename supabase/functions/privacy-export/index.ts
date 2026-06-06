/**
 * Supabase Edge Function: privacy-export
 * @module privacy-export
 * @description GDPR Art. 20 data portability export service.
 *
 * Routes:
 *   POST  /functions/v1/privacy-export         — create export request (rate-limited: 1/30 days)
 *   GET   /functions/v1/privacy-export/:id     — check status + get signed download URL
 *
 * When a POST is received the function:
 *   1. Checks rate limit (one request per 30 days per user)
 *   2. Inserts an export_requests row with status=pending
 *   3. Assembles the user's full data package synchronously (small enough for Edge Function)
 *   4. Uploads the JSON to Supabase Storage (gdpr-exports bucket, private)
 *   5. Marks the request ready with a 24h signed URL
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const RATE_LIMIT_DAYS = 30;
const EXPORT_TTL_HOURS = 24;
const STORAGE_BUCKET = 'gdpr-exports';

/** Build a JSON response with CORS headers. */
function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(
    JSON.stringify(body),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
}

/** Assemble the full data export package for the authenticated user. */
async function assembleExportPackage(
  userId: string,
  supabase: SupabaseClient,
): Promise<Record<string, unknown>> {
  const now = new Date().toISOString();

  // Fetch all user data in parallel
  // First, fetch charity profile IDs to query charity_wallets
  const { data: charityProfiles } = await supabase
    .from('charity_profiles')
    .select('id, ein, name, authorized_signer_name, authorized_signer_email, authorized_signer_phone, status, claimed_by')
    .eq('claimed_by', userId);

  const charityProfileIds = (charityProfiles ?? []).map((p) => p.id);

  const [
    authUserResult,
    profileResult,
    walletAliasesResult,
    userIdentityResult,
    userPrefsResult,
    volunteerAppsResult,
    volunteerHoursResult,
    selfReportedResult,
    volunteerVerifResult,
    fiatDonationsResult,
    charityWalletsResult,
    passkeysResult,
  ] = await Promise.all([
    supabase.auth.admin.getUserById(userId),
    supabase.from('profiles').select('*').eq('user_id', userId).single(),
    supabase.from('wallet_aliases').select('wallet_address, alias, created_at').eq('user_id', userId),
    supabase.from('user_identities').select('primary_auth_method, wallet_linked_at, created_at').eq('user_id', userId).single(),
    supabase.from('user_preferences').select('privacy_settings, notification_preferences').eq('user_id', userId).single(),
    supabase.from('volunteer_applications').select(
      'opportunity_id, status, applied_at, consent_given, international_transfers_consent, timezone'
    ).eq('applicant_id', userId),
    supabase.from('volunteer_hours').select(
      'hours, date_performed, description, status'
    ).eq('volunteer_id', userId),
    supabase.from('self_reported_hours').select(
      'activity_date, hours, activity_type, description, validation_status, blockchain_tx_hash, sbt_token_id'
    ).eq('volunteer_id', userId),
    supabase.from('volunteer_verifications').select(
      'verified_at, blockchain_tx_hash, nft_token_id, verification_hash'
    ).eq('volunteer_id', userId),
    supabase.from('fiat_donations').select(
      'charity_id, amount_cents, currency, payment_method, card_type, card_last_four, cause_name, fund_name, created_at'
    ).eq('donor_id', userId),
    charityProfileIds.length > 0
      ? supabase
          .from('charity_wallets')
          .select(
            'wallet_address, wallet_type, chain_id, is_primary, signer_count, signer_threshold, ' +
            'custodian_name, custodian_attestation_doc_url, proof_of_control_verified_at, ' +
            'risk_acknowledgment_at, created_at'
          )
          .in('charity_profile_id', charityProfileIds)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from('user_passkeys')
      .select('device_name, transports, created_at, last_used_at')
      .eq('user_id', userId),
  ]);

  const authUser = authUserResult.data?.user;
  const profile = profileResult.data;
  const identity = userIdentityResult.data;

  return {
    export_generated_at: now,
    give_protocol_version: '1.0',
    account: {
      email: authUser?.email ?? null,
      created_at: authUser?.created_at ?? null,
      auth_method: identity?.primary_auth_method ?? 'email',
      wallet_linked_at: identity?.wallet_linked_at ?? null,
    },
    profile: profile
      ? {
          name: profile.name ?? null,
          type: profile.type ?? null,
          meta: profile.meta ?? null,
        }
      : null,
    wallet_aliases: (walletAliasesResult.data ?? []).map((a) => ({
      wallet_address: a.wallet_address,
      alias: a.alias,
      created_at: a.created_at,
    })),
    user_preferences: userPrefsResult.data
      ? {
          privacy_settings: userPrefsResult.data.privacy_settings,
          notification_preferences: userPrefsResult.data.notification_preferences,
        }
      : null,
    volunteer_applications: (volunteerAppsResult.data ?? []).map((a) => ({
      opportunity_id: a.opportunity_id,
      status: a.status,
      applied_at: a.applied_at,
      consent_given: a.consent_given,
      international_transfers_consent: a.international_transfers_consent,
      timezone: a.timezone,
    })),
    volunteer_hours: (volunteerHoursResult.data ?? []).map((h) => ({
      hours: h.hours,
      date_performed: h.date_performed,
      description: h.description,
      status: h.status,
    })),
    self_reported_hours: (selfReportedResult.data ?? []).map((h) => ({
      activity_date: h.activity_date,
      hours: h.hours,
      activity_type: h.activity_type,
      description: h.description,
      validation_status: h.validation_status,
      blockchain_tx_hash: h.blockchain_tx_hash,
      sbt_token_id: h.sbt_token_id,
    })),
    volunteer_verifications: (volunteerVerifResult.data ?? []).map((v) => ({
      verified_at: v.verified_at,
      blockchain_tx_hash: v.blockchain_tx_hash,
      nft_token_id: v.nft_token_id,
    })),
    fiat_donations: (fiatDonationsResult.data ?? []).map((d) => ({
      charity_id: d.charity_id,
      amount_cents: d.amount_cents,
      currency: d.currency,
      payment_method: d.payment_method,
      card_type: d.card_type,
      card_last_four: d.card_last_four,
      cause_name: d.cause_name,
      fund_name: d.fund_name,
      created_at: d.created_at,
    })),
    charity_representative: (charityProfiles ?? []).map((p) => ({
      charity_ein: p.ein,
      charity_name: p.name,
      authorized_signer_name: p.authorized_signer_name ?? null,
      authorized_signer_email: p.authorized_signer_email ?? null,
      authorized_signer_phone: p.authorized_signer_phone ?? null,
      status: p.status,
    })),
    charity_wallets: (charityWalletsResult.data ?? []).map((w) => ({
      wallet_address: w.wallet_address,
      wallet_type: w.wallet_type,
      chain_id: w.chain_id,
      is_primary: w.is_primary,
      signer_count: w.signer_count ?? null,
      signer_threshold: w.signer_threshold ?? null,
      custodian_name: w.custodian_name ?? null,
      proof_of_control_verified_at: w.proof_of_control_verified_at ?? null,
      risk_acknowledgment_at: w.risk_acknowledgment_at ?? null,
      created_at: w.created_at,
    })),
    passkeys: (passkeysResult.data ?? []).map((p) => ({
      device_name: p.device_name,
      transports: p.transports,
      created_at: p.created_at,
      last_used_at: p.last_used_at,
    })),
  };
}

/** Handle POST /functions/v1/privacy-export — create export request. */
async function handleCreateExport(
  userId: string,
  supabase: SupabaseClient,
): Promise<Response> {
  // Rate limit: check for an export request within the last 30 days
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - RATE_LIMIT_DAYS);

  const { data: recentRequest } = await supabase
    .from('export_requests')
    .select('id, requested_at')
    .eq('user_id', userId)
    .neq('status', 'expired')
    .gte('requested_at', cutoff.toISOString())
    .order('requested_at', { ascending: false })
    .limit(1)
    .single();

  if (recentRequest) {
    const nextAllowedDate = new Date(recentRequest.requested_at);
    nextAllowedDate.setDate(nextAllowedDate.getDate() + RATE_LIMIT_DAYS);
    return jsonResponse({
      error: 'Rate limit exceeded. You may request one export per 30 days.',
      next_allowed_at: nextAllowedDate.toISOString(),
      existing_request_id: recentRequest.id,
    }, 429);
  }

  // Insert pending request
  const { data: request, error: insertError } = await supabase
    .from('export_requests')
    .insert({ user_id: userId, status: 'processing' })
    .select('id')
    .single();

  if (insertError || !request) {
    return jsonResponse({ error: 'Failed to create export request' }, 500);
  }

  const requestId = request.id;

  try {
    // Assemble data package
    const exportPackage = await assembleExportPackage(userId, supabase);
    const exportJson = JSON.stringify(exportPackage, null, 2);
    const exportBytes = new TextEncoder().encode(exportJson);

    // Upload to private storage bucket
    const storagePath = `${userId}/${requestId}/export.json`;
    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, exportBytes, {
        contentType: 'application/json',
        upsert: false,
      });

    if (uploadError) {
      await supabase
        .from('export_requests')
        .update({ status: 'failed', error_message: uploadError.message })
        .eq('id', requestId);
      return jsonResponse({ error: 'Failed to generate export file' }, 500);
    }

    // Generate signed URL (24h TTL)
    const expiresIn = EXPORT_TTL_HOURS * 60 * 60;
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storagePath, expiresIn);

    if (signedUrlError || !signedUrlData) {
      await supabase
        .from('export_requests')
        .update({ status: 'failed', error_message: 'Failed to generate signed URL' })
        .eq('id', requestId);
      return jsonResponse({ error: 'Failed to generate download URL' }, 500);
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + EXPORT_TTL_HOURS);

    // Mark request ready
    await supabase
      .from('export_requests')
      .update({
        status: 'ready',
        storage_path: storagePath,
        expires_at: expiresAt.toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    const estimatedDeliveryDate = new Date();
    return jsonResponse({
      request_id: requestId,
      status: 'ready',
      download_url: signedUrlData.signedUrl,
      expires_at: expiresAt.toISOString(),
      estimated_delivery_date: estimatedDeliveryDate.toISOString(),
    }, 202);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Export assembly failed';
    await supabase
      .from('export_requests')
      .update({ status: 'failed', error_message: message })
      .eq('id', requestId);
    return jsonResponse({ error: message }, 500);
  }
}

/** Handle GET /functions/v1/privacy-export/:requestId — check export status. */
async function handleGetExportStatus(
  userId: string,
  requestId: string,
  supabase: SupabaseClient,
): Promise<Response> {
  const { data: request, error } = await supabase
    .from('export_requests')
    .select('id, status, expires_at, storage_path, error_message, requested_at, completed_at')
    .eq('id', requestId)
    .eq('user_id', userId)
    .single();

  if (error || !request) {
    return jsonResponse({ error: 'Export request not found' }, 404);
  }

  // Check if the signed URL is still valid; if ready but expired, mark as expired
  if (request.status === 'ready' && request.expires_at) {
    const isExpired = new Date(request.expires_at) < new Date();
    if (isExpired) {
      await supabase
        .from('export_requests')
        .update({ status: 'expired' })
        .eq('id', requestId);
      return jsonResponse({
        request_id: requestId,
        status: 'expired',
        message: 'Download URL has expired. Submit a new export request.',
      }, 200);
    }
  }

  if (request.status !== 'ready' || !request.storage_path) {
    return jsonResponse({
      request_id: requestId,
      status: request.status,
      requested_at: request.requested_at,
    }, 200);
  }

  // Re-generate a fresh signed URL (in case the stored one aged)
  const expiresIn = EXPORT_TTL_HOURS * 60 * 60;
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(request.storage_path, expiresIn);

  if (signedUrlError || !signedUrlData) {
    return jsonResponse({ error: 'Failed to generate download URL' }, 500);
  }

  return jsonResponse({
    request_id: requestId,
    status: 'ready',
    download_url: signedUrlData.signedUrl,
    expires_at: request.expires_at,
    requested_at: request.requested_at,
    completed_at: request.completed_at,
  }, 200);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server configuration error' }, 503);
  }

  // Authenticate the calling user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return jsonResponse({ error: 'Missing authorization header' }, 401);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return jsonResponse({ error: 'Invalid or expired token' }, 401);
  }

  const url = new URL(req.url);
  // Path: /functions/v1/privacy-export or /functions/v1/privacy-export/:requestId
  const pathParts = url.pathname.split('/').filter(Boolean);
  const requestId = pathParts[pathParts.length - 1];
  const hasRequestId = requestId !== 'privacy-export' && requestId.length > 10;

  try {
    if (req.method === 'POST') {
      return await handleCreateExport(user.id, supabase);
    }

    if (req.method === 'GET' && hasRequestId) {
      return await handleGetExportStatus(user.id, requestId, supabase);
    }

    return jsonResponse({ error: 'Method not allowed' }, 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return jsonResponse({ error: message }, 500);
  }
});
