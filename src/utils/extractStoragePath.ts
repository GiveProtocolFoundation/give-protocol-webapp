/**
 * Extracts the object path from a Supabase Storage URL.
 *
 * Handles both public URLs (`/storage/v1/object/public/bucket/path`)
 * and signed URLs (`/storage/v1/object/sign/bucket/path?token=...`).
 * Falls back to using the full URL as a path if no pattern matches.
 *
 * @param url - The full Supabase Storage URL or relative path
 * @param bucket - The storage bucket name to strip from the path
 * @returns The object path within the bucket
 */
export function extractStoragePath(url: string, bucket: string): string {
  // Try to parse as a URL and extract the path after /object/(public|sign)/bucket/
  try {
    const parsed = new URL(url, "https://placeholder.supabase.co");
    const pathParts = parsed.pathname.split("/");
    // Find the bucket name in the path and return everything after it
    const bucketIdx = pathParts.indexOf(bucket);
    if (bucketIdx !== -1 && bucketIdx < pathParts.length - 1) {
      return pathParts.slice(bucketIdx + 1).join("/");
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
    const qIdx = afterBucket.indexOf("?");
    return qIdx !== -1 ? afterBucket.substring(0, qIdx) : afterBucket;
  }

  // Last resort: use as-is (caller should handle failures gracefully)
  return url;
}
