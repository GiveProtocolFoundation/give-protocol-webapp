/**
 * Service for GDPR privacy request operations.
 * Wraps the privacy-export and privacy-erasure Supabase Edge Functions.
 */

import { supabase } from "@/lib/supabase";
import { ENV } from "@/config/env";

/**
 * Returns the base URL for invoking Supabase Edge Functions, derived from `SUPABASE_URL`.
 * @returns The functions root URL (e.g. `https://<project>.supabase.co/functions/v1`).
 */
function getFunctionsBaseUrl(): string {
  const supabaseUrl = ENV.SUPABASE_URL ?? "";
  return `${supabaseUrl}/functions/v1`;
}

/** Get the current user's auth token for Edge Function calls. */
async function getAuthToken(): Promise<string> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    throw new Error("Not authenticated. Please sign in to continue.");
  }
  return session.access_token;
}

interface EdgeFunctionOptions {
  method: string;
  body?: string;
  headers?: Record<string, string>;
}

/** Perform a fetch to an Edge Function with the user's auth token. */
async function callEdgeFunction(
  path: string,
  options: EdgeFunctionOptions,
): Promise<Response> {
  const token = await getAuthToken();
  const url = `${getFunctionsBaseUrl()}${path}`;

  return fetch(url, {
    method: options.method,
    body: options.body,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

/** Result returned after submitting a GDPR data export request. */
export interface ExportRequestResult {
  request_id: string;
  status: "pending" | "processing" | "ready" | "expired" | "failed";
  download_url?: string;
  expires_at?: string;
  estimated_delivery_date?: string;
  next_allowed_at?: string;
  existing_request_id?: string;
}

/** Result returned after submitting a GDPR right-to-erasure request. */
export interface ErasureRequestResult {
  request_id: string;
  status: "pending" | "cancelled" | "processing" | "completed" | "failed";
  scheduled_deletion_date?: string;
  message?: string;
  blockchain_notice?: string;
  existing_request_id?: string;
}

/** Result returned when checking the status of a pending data export request. */
export interface ExportStatusResult {
  request_id: string;
  status: "pending" | "processing" | "ready" | "expired" | "failed";
  download_url?: string;
  expires_at?: string;
  requested_at?: string;
  completed_at?: string;
  message?: string;
}

/**
 * Submit a GDPR Art. 20 data export request.
 * Rate-limited to one request per 30 days.
 *
 * @returns The export request result including download URL when ready
 * @throws Error with a user-friendly message on failure
 */
export async function requestDataExport(): Promise<ExportRequestResult> {
  const response = await callEdgeFunction("/privacy-export", {
    method: "POST",
  });

  const data = (await response.json()) as ExportRequestResult & {
    error?: string;
  };

  if (response.status === 429) {
    const nextAllowed = data.next_allowed_at
      ? `Next allowed: ${data.next_allowed_at}`
      : "";
    throw new Error(
      data.error ?? `You may request one export per 30 days. ${nextAllowed}`,
    );
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to create export request");
  }

  return data;
}

/**
 * Check the status of a data export request.
 *
 * @param requestId - The export request ID
 * @returns Current status and download URL if ready
 * @throws Error if the request is not found or call fails
 */
export async function getExportStatus(
  requestId: string,
): Promise<ExportStatusResult> {
  const response = await callEdgeFunction(`/privacy-export/${requestId}`, {
    method: "GET",
  });

  const data = (await response.json()) as ExportStatusResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to fetch export status");
  }

  return data;
}

/**
 * Submit a GDPR Art. 17 erasure (right to be forgotten) request.
 * A 30-day cooling-off period is applied before deletion occurs.
 *
 * @param reason - Optional reason for the erasure request
 * @returns The erasure request result with scheduled deletion date
 * @throws Error with a user-friendly message on failure
 */
export async function requestAccountErasure(
  reason?: string,
): Promise<ErasureRequestResult> {
  const response = await callEdgeFunction("/privacy-erasure", {
    method: "POST",
    body: JSON.stringify({ confirm: true, reason }),
  });

  const data = (await response.json()) as ErasureRequestResult & {
    error?: string;
  };

  if (response.status === 409) {
    throw new Error(
      data.error ?? "An erasure request is already pending for your account.",
    );
  }

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to create erasure request");
  }

  return data;
}

/**
 * Cancel a pending GDPR erasure request within the 30-day cooling-off period.
 *
 * @param requestId - The erasure request ID to cancel
 * @returns Cancellation confirmation
 * @throws Error if request not found, already processed, or call fails
 */
export async function cancelErasureRequest(
  requestId: string,
): Promise<ErasureRequestResult> {
  const response = await callEdgeFunction(`/privacy-erasure/${requestId}`, {
    method: "DELETE",
  });

  const data = (await response.json()) as ErasureRequestResult & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to cancel erasure request");
  }

  return data;
}

/**
 * Fetch the current user's active erasure request (if any).
 *
 * @returns The pending erasure request or null if none exists
 */
export async function getActiveErasureRequest(): Promise<{
  id: string;
  status: string;
  scheduled_deletion_date: string;
  requested_at: string;
} | null> {
  const { data, error } = await supabase
    .from("erasure_requests")
    .select("id, status, scheduled_deletion_date, requested_at")
    .in("status", ["pending", "processing"])
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch erasure request: ${error.message}`);
  }

  return data;
}

/**
 * Fetch the current user's most recent export request (if any).
 *
 * @returns The most recent export request or null if none exists
 */
export async function getMostRecentExportRequest(): Promise<{
  id: string;
  status: string;
  requested_at: string;
  completed_at: string | null;
} | null> {
  const { data, error } = await supabase
    .from("export_requests")
    .select("id, status, requested_at, completed_at")
    .order("requested_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch export request: ${error.message}`);
  }

  return data;
}
