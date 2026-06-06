import React, { useCallback, useEffect, useRef, useState } from "react";
import { useConsent } from "@/lib/consent/ConsentProvider";

// ---------------------------------------------------------------------------
// Focus trap hook
// ---------------------------------------------------------------------------

const FOCUSABLE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function useFocusTrap(
  containerRef: React.RefObject<HTMLDivElement>,
  active: boolean,
) {
  useEffect(() => {
    if (!active || !containerRef.current) return;
    const container = containerRef.current;

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));

    // Move initial focus to the first focusable element inside the modal
    getFocusable()[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = getFocusable();
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, containerRef]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface CustomizeModalProps {
  onClose: () => void;
  /**
   * Optional ref to the element that triggered the modal.
   * Focus is returned there when the modal closes.
   */
  triggerRef?: React.RefObject<HTMLElement>;
}

/**
 * Cookie preferences dialog.
 *
 * - Focus-trapped while open (custom trap, no Radix dependency).
 * - ESC closes (banner remains if still undecided).
 * - Backdrop click closes without writing consent.
 * - Save calls accept() and closes; Cancel closes without writing.
 */
export function CustomizeModal({ onClose, triggerRef }: CustomizeModalProps) {
  const { categories, accept } = useConsent();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(
    categories.analytics,
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);

  useFocusTrap(containerRef, true);

  // Capture current focus so we can restore it on close
  useEffect(() => {
    prevFocusRef.current = document.activeElement as HTMLElement | null;
    return () => {
      const returnTarget = triggerRef?.current ?? prevFocusRef.current;
      returnTarget?.focus();
    };
  }, [triggerRef]);

  // ESC key closes the modal
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function handleSave() {
    accept({ essential: true, analytics: analyticsEnabled });
    onClose();
  }

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-modal-title"
    >
      <div
        ref={containerRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2
            id="cookie-modal-title"
            className="text-lg font-semibold text-gray-900"
          >
            Cookie preferences
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Essential row — always on, toggle disabled */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">Essential</p>
              <p className="mt-0.5 text-xs text-gray-500">
                Required for core site features such as navigation and
                authentication. Cannot be disabled.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked="true"
              disabled
              className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-not-allowed rounded-full bg-emerald-600 opacity-60 focus:outline-none"
              aria-label="Essential cookies — always on"
            >
              <span className="pointer-events-none inline-block h-5 w-5 mt-0.5 ml-0.5 translate-x-5 rounded-full bg-white shadow" />
            </button>
          </div>

          {/* Analytics row */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                Analytics &amp; error replay
              </p>
              <p className="mt-0.5 text-xs text-gray-500">
                Anonymous performance metrics and error-replay sessions to help
                us diagnose bugs and improve the site.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={analyticsEnabled}
              onClick={() => setAnalyticsEnabled((v) => !v)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${
                analyticsEnabled ? "bg-emerald-600" : "bg-gray-200"
              }`}
              aria-label={`Analytics cookies — ${analyticsEnabled ? "on" : "off"}`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 mt-0.5 ml-0.5 rounded-full bg-white shadow transition-transform duration-200 ${
                  analyticsEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
