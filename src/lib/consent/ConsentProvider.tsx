import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
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
// Provider
// ---------------------------------------------------------------------------

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const [record, setRecord] = useState<ConsentRecord | null>(() =>
    readConsent(),
  );

  // Dev-only: ?_consentReset=1 forces the banner back to the undecided state
  // so developers can verify the banner without clearing localStorage manually.
  useEffect(() => {
    if (import.meta.env?.DEV) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("_consentReset") === "1") {
        clearConsent();
        setRecord(null);
      }
    }
  }, []);

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

  const value: ConsentContextValue = {
    categories: record?.categories ?? defaultCategories,
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

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a <ConsentProvider>");
  }
  return ctx;
}
