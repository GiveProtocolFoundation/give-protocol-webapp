/** localStorage key used for all consent reads/writes. */
export const CONSENT_STORAGE_KEY = "giveprotocol.consent.v1";
const SCHEMA_VERSION = 1;

export interface ConsentCategories {
  essential: true;
  analytics: boolean;
}

export interface ConsentRecord {
  version: number;
  decidedAt: string;
  categories: ConsentCategories;
}

function isSSR(): boolean {
  return typeof window === "undefined";
}

/**
 * Read the stored consent record.
 * Returns null when:
 *  - running server-side
 *  - key is absent
 *  - JSON parse fails
 *  - schema version doesn't match (treat as undecided)
 */
export function readConsent(): ConsentRecord | null {
  if (isSSR()) return null;
  try {
    const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== SCHEMA_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Persist a consent decision.  Always forces essential:true.
 */
export function writeConsent(categories: { analytics: boolean }): ConsentRecord {
  const record: ConsentRecord = {
    version: SCHEMA_VERSION,
    decidedAt: new Date().toISOString(),
    categories: { essential: true, analytics: categories.analytics },
  };
  if (!isSSR()) {
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  }
  return record;
}

/**
 * Remove the stored consent record, reverting the visitor to "undecided".
 */
export function clearConsent(): void {
  if (!isSSR()) {
    localStorage.removeItem(CONSENT_STORAGE_KEY);
  }
}
