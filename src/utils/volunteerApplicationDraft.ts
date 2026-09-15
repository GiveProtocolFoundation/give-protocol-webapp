/**
 * Builds the localStorage key used to autosave a volunteer application draft.
 * @param opportunityId - The volunteer opportunity being applied to
 * @returns Storage key scoped to that opportunity
 */
export function volunteerDraftKey(opportunityId: string): string {
  return `volunteer-application-draft:${opportunityId}`;
}

/**
 * Loads a previously autosaved draft from localStorage.
 * @param key - Storage key from volunteerDraftKey
 * @returns The parsed draft, or null if none exists or storage is unavailable
 */
export function loadDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Persists a draft to localStorage, silently ignoring storage failures.
 * @param key - Storage key from volunteerDraftKey
 * @param data - The draft data to persist
 */
export function saveDraft<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Storage unavailable (e.g., private browsing quota) — autosave is best-effort.
  }
}

/**
 * Removes a saved draft from localStorage, silently ignoring storage failures.
 * @param key - Storage key from volunteerDraftKey
 */
export function clearDraft(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to clear.
  }
}
