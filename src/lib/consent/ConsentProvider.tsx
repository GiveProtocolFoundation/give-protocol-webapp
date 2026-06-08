import React, { createContext, useCallback, useContext, useState } from "react";
import {
  clearConsent,
  readConsent,
  writeConsent,
  type ConsentCategories,
  type ConsentRecord,
} from "./storage";

// ---------------------------------------------------------------------------
// Context types
// ---------------------------------------------------------------------------

interface ConsentContextValue {
  /** Current consent category flags. */
  categories: ConsentCategories;
  /** True once the visitor has made an explicit accept/decline decision. */
  hasDecided: boolean;
  /**
   * Record an affirmative decision.
   * Always forces essential:true regardless of the value passed.
   */
  accept: (categories: { essential?: true; analytics: boolean }) => void;
  /** Convenience: accept with analytics:false. */
  decline: () => void;
  /**
   * Clear the stored record so the visitor is treated as undecided again.
   * Used by tests and the footer "withdraw" path.
   */
  reset: () => void;
}

const defaultCategories: ConsentCategories = {
  essential: true,
  analytics: false,
};

const ConsentContext = createContext<ConsentContextValue | null>(null);

// ---------------------------------------------------------------------------
// GA4 consent bridge
// ---------------------------------------------------------------------------

/**
 * Bridges the React consent state into gtag's consent API.
 *
 * - Fires on mount so returning visitors' stored consent is replayed into
 *   gtag before the 500 ms wait_for_update timer in index.html expires.
 * - Fires on every consent change so accept/decline immediately propagates.
 * - Null-safe: no-ops if window.gtag is unavailable (SSR, test environments).
 */
function useGAConsentBridge(categories: ConsentCategories): void {
  useEffect(() => {
    window.gtag?.("consent", "update", {
      analytics_storage: categories.analytics ? "granted" : "denied",
    });
  }, [categories.analytics]);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Provides cookie-consent state to the component tree.
 * @param children - React children to wrap
 * @returns Provider element
 */
export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<ConsentRecord | null>(() =>
    readConsent(),
  );

  const accept = useCallback(
    (cats: { essential?: true; analytics: boolean }) => {
      const updated = writeConsent({ analytics: cats.analytics });
      setRecord(updated);
    },
    [],
  );

  const decline = useCallback(() => {
    accept({ analytics: false });
  }, [accept]);

  const reset = useCallback(() => {
    clearConsent();
    setRecord(null);
  }, []);

  const categories = record?.categories ?? defaultCategories;

  useGAConsentBridge(categories);

  const value: ConsentContextValue = {
    categories,
    hasDecided: record !== null,
    accept,
    decline,
    reset,
  };

  return (
    <ConsentContext.Provider value={value}>{children}</ConsentContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Returns the current consent state and actions.
 * @returns ConsentContextValue
 * @throws Error if called outside ConsentProvider
 */
export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a <ConsentProvider>");
  }
  return ctx;
}
