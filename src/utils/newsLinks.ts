/** How a news item's link should be rendered. */
export type NewsLinkKind = "internal" | "external" | "none";

/**
 * Classifies an admin-entered news link. Only app-relative paths ("/about")
 * and http(s) URLs are linkable; anything else (javascript:, data:, protocol-
 * relative "//host", bare words, blank) is treated as no link so it can never
 * be rendered as a clickable href.
 * @param url - The stored link value
 * @returns "internal" for app paths, "external" for http(s), otherwise "none"
 */
export function classifyNewsLink(url?: string | null): NewsLinkKind {
  const value = url?.trim() ?? "";
  if (value.length === 0) return "none";
  if (value.startsWith("//")) return "none";
  if (value.startsWith("/")) return "internal";
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? "external"
      : "none";
  } catch {
    return "none";
  }
}

/**
 * Whether a link is acceptable to save from the admin form. Blank is allowed
 * (the item is then shown without a link).
 * @param url - The form value
 * @returns True when blank, an app path, or an http(s) URL
 */
export function isValidNewsLink(url: string): boolean {
  return url.trim().length === 0 || classifyNewsLink(url) !== "none";
}
