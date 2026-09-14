/**
 * Shared confirmation URL generator for Supabase Auth send-email-hook (GIV-81/GIV-909).
 *
 * @module send-email-hook-url
 */

const CANONICAL_SITE_URL = "https://giveprotocol.io";

export interface EmailDataUrlParams {
  site_url?: string | null;
  redirect_to?: string | null;
  token_hash: string;
  email_action_type: string;
}

/**
 * Determine the webapp base origin for authentication callbacks/confirmations.
 *
 * Ensures confirmation links never target the Supabase API Gateway (e.g. api.giveprotocol.io
 * or /auth/v1) which causes "No API key found in request" errors when clicked.
 *
 * @param {object} emailData - Email data payload from GoTrue hook.
 * @param {string | null} [emailData.site_url] - Configured site_url from GoTrue.
 * @param {string | null} [emailData.redirect_to] - Redirect target from signup options.
 * @returns {string} The resolved web application origin (e.g. "https://giveprotocol.io").
 */
export function getWebappBaseUrl(emailData: {
  site_url?: string | null;
  redirect_to?: string | null;
}): string {
  // 1. Try deriving from redirect_to (client origin provided by webapp during signup)
  if (emailData.redirect_to) {
    try {
      const parsed = new URL(emailData.redirect_to);
      const host = parsed.hostname.toLowerCase();
      if (
        parsed.origin &&
        !host.startsWith("api.") &&
        !host.includes("supabase.co")
      ) {
        return parsed.origin;
      }
    } catch {
      // ignore invalid URL
    }
  }

  // 2. Try site_url if it's a valid web app URL and not an API gateway
  if (emailData.site_url) {
    try {
      const parsed = new URL(emailData.site_url);
      const host = parsed.hostname.toLowerCase();
      if (
        parsed.origin &&
        !host.startsWith("api.") &&
        !host.includes("supabase.co")
      ) {
        return parsed.origin;
      }
    } catch {
      // ignore invalid URL
    }
  }

  // 3. Fall back to canonical webapp URL
  return CANONICAL_SITE_URL;
}

/**
 * Build the full confirmation URL for email links.
 *
 * @param {EmailDataUrlParams} emailData - Email data payload from GoTrue hook.
 * @returns {string} Absolute confirmation URL pointing to /auth/confirm.
 */
export function buildConfirmationUrl(emailData: EmailDataUrlParams): string {
  const base = getWebappBaseUrl(emailData);
  const params = new URLSearchParams({
    token_hash: emailData.token_hash,
    type: emailData.email_action_type,
  });
  if (emailData.redirect_to) {
    params.set("next", emailData.redirect_to);
  }
  return `${base}/auth/confirm?${params.toString()}`;
}
