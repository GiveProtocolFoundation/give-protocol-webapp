/**
 * Resolver for charity image URLs hosted on unreliable third-party
 * placeholder services. The seed data originally referenced
 * picsum.photos (currently unreachable) and a deprecated Supabase
 * storage project, which left featured organizations on /browse and
 * profile pages without images (GIV-936).
 *
 * Instead of depending on those hosts, branded cover images are
 * self-hosted under /images/charities/. This module rewrites any
 * logo/photo URL that points at a known-dead placeholder host to the
 * matching self-hosted asset.
 */

/** Fallback cover used when no org-specific asset exists. */
export const DEFAULT_CHARITY_COVER = "/images/charities/default.svg";

/** Hosts that only ever served seed placeholder images and are now dead. */
const PLACEHOLDER_IMAGE_HOSTS = new Set([
  "picsum.photos",
  "fastly.picsum.photos",
  "etqbojasfmpieigeefdj.supabase.co",
]);

/** Local asset path prefix for org-specific covers. */
const LOCAL_COVER_PREFIX = "/images/charities/";

/**
 * Extracts the hostname from an absolute URL.
 * @param url - Absolute URL string
 * @returns Hostname or null when the URL cannot be parsed
 */
function hostnameOf(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Maps an EIN to a safe local asset filename (alphanumerics and dashes).
 * @param ein - Employer Identification Number (e.g. "99-1230001")
 * @returns Sanitized filename or null when the EIN is unusable
 */
function einToAssetName(ein: string | null | undefined): string | null {
  if (!ein) return null;
  const sanitized = ein.replace(/[^a-zA-Z0-9-]/g, "");
  return sanitized.length > 0 ? sanitized : null;
}

/**
 * Repairs a charity image URL whose host is a known-dead placeholder
 * service, rewriting it to the matching self-hosted cover. Unlike
 * {@link resolveCharityImageUrl}, null stays null so pages with their
 * own null-fallbacks (initials avatars, gradient banners) keep that UX.
 *
 * @param url - Raw image URL from charity_profiles (may be null)
 * @param ein - EIN of the charity, used to pick the local cover
 * @returns Repaired URL, null when the input was null/empty
 * @example
 * ```typescript
 * repairCharityImageUrl("https://picsum.photos/seed/x/400/300", "99-1230003")
 * // "/images/charities/99-1230003.svg"
 *
 * repairCharityImageUrl(null, "99-1230003") // null
 * ```
 */
export function repairCharityImageUrl(
  url: string | null | undefined,
  ein: string | null | undefined,
): string | null {
  if (!url) return null;

  const host = hostnameOf(url);
  if (host && PLACEHOLDER_IMAGE_HOSTS.has(host)) {
    const asset = einToAssetName(ein);
    return asset ? `${LOCAL_COVER_PREFIX}${asset}.svg` : DEFAULT_CHARITY_COVER;
  }

  return url;
}

/**
 * Resolves a charity image URL to a reliable source. URLs on known-dead
 * placeholder hosts are replaced with self-hosted covers keyed by EIN;
 * healthy absolute URLs and existing local paths pass through unchanged;
 * null/empty values fall back to the branded default cover.
 *
 * @param url - Raw image URL from charity_profiles (may be null)
 * @param ein - EIN of the charity, used to pick the local cover
 * @returns Image URL that is safe to render
 * @example
 * ```typescript
 * resolveCharityImageUrl("https://picsum.photos/seed/x/400/300", "99-1230003")
 * // "/images/charities/99-1230003.svg"
 *
 * resolveCharityImageUrl("https://example.org/logo.png", "99-1230003")
 * // "https://example.org/logo.png"
 *
 * resolveCharityImageUrl(null, "99-1230003")
 * // "/images/charities/default.svg"
 * ```
 */
export function resolveCharityImageUrl(
  url: string | null | undefined,
  ein: string | null | undefined,
): string {
  return repairCharityImageUrl(url, ein) ?? DEFAULT_CHARITY_COVER;
}
