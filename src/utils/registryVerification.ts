/**
 * Registry-agnostic description of where a charity's legal status was verified.
 *
 * Charity records come from national registries (the IRS Business Master File
 * for the US, SAT for Mexico, and others as they are added). The UI must never
 * claim "IRS-verified" for a non-US record, so badge text is derived from the
 * record's `registry_source` instead. Adding a registry is a one-line entry in
 * REGISTRIES; unrecognised sources still render honestly using their raw name.
 */

/** Registry details used to label a charity record. */
export interface RegistryInfo {
  /** Short display name, e.g. "IRS". */
  shortName: string;
  /** True when the registry's identifier is a national tax ID (e.g. the US EIN). */
  idIsTaxId?: boolean;
}

/** Known registries keyed by normalised `registry_source`. */
const REGISTRIES: Record<string, RegistryInfo> = {
  IRS_BMF: { shortName: "IRS", idIsTaxId: true },
};

/** Normalises a registry_source value for lookup (case, spaces, hyphens). */
function normalizeSource(source: string): string {
  return source
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

/** Strips characters we never want in badge text and bounds its length. */
function cleanDisplayName(source: string): string {
  return source.replace(/[<>]/g, "").replace(/_/g, " ").trim().slice(0, 24);
}

/**
 * Resolves registry info for a charity record.
 * @param registrySource - The record's `registry_source` value
 * @returns Registry info, or null when the source is missing or blank
 */
export function getRegistryInfo(
  registrySource: string | null | undefined,
): RegistryInfo | null {
  if (!registrySource || registrySource.trim().length === 0) return null;

  const known = REGISTRIES[normalizeSource(registrySource)];
  if (known) return known;

  const shortName = cleanDisplayName(registrySource);
  return shortName.length > 0 ? { shortName } : null;
}
