// ---------------------------------------------------------------------------
// Consent storage – localStorage with versioned schema
// ---------------------------------------------------------------------------

export const CONSENT_STORAGE_KEY = "giveprotocol.consent.v1";
const SCHEMA_VERSION = 1;

/** Category flags persisted alongside the consent decision. */
export interface ConsentCategories {
  /** Always true – session cookies, CSRF, auth tokens. */
  essential: true;
  /** Sentry replay + perf tracing. */
  analytics: boolean;
}

/** Shape of the JSON blob we persist. */
export interface ConsentRecord {
  version: number;
  decidedAt: string;
  categories: ConsentCategories;
}

/**
 * Reads the consent record from localStorage.
 * Returns null when missing, corrupt, or version-mismatched.
 */
export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;

    const parsed: ConsentRecord = JSON.parse(raw);
    if (parsed.version !== SCHEMA_VERSION) return null;

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Writes a consent decision to localStorage.
 * Always forces `essential: true` regardless of what the caller passes.
 */
export function writeConsent(categories: {
  analytics: boolean;
}): ConsentRecord {
  const record: ConsentRecord = {
    version: SCHEMA_VERSION,
    decidedAt: new Date().toISOString(),
    categories: { essential: true, analytics: categories.analytics },
  };

  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  return record;
}

/** Removes the consent record from localStorage. */
export function clearConsent(): void {
  localStorage.removeItem(CONSENT_STORAGE_KEY);
}
