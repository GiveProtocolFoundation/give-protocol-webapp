import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useConsent } from "@/lib/consent/ConsentProvider";
import { CustomizeModal } from "./CustomizeModal";

/**
 * Fixed bottom-of-viewport consent banner.
 *
 * - Only renders when `useConsent().hasDecided === false`.
 * - Does NOT trap pointer events outside its strip.
 * - Three equal-weight actions: Accept all / Decline non-essential / Customize.
 * - "Customize" opens <CustomizeModal>; ESC inside the modal returns focus
 *   to the "Customize" button (banner stays visible until a decision is made).
 * - a11y: role=region, aria-label, first action receives focus on mount.
 */
export function CookieBanner() {
  const { hasDecided, accept, decline } = useConsent();
  const [showModal, setShowModal] = useState(false);

  // Refs for focus management
  const acceptBtnRef = useRef<HTMLButtonElement>(null);
  const customizeBtnRef = useRef<HTMLButtonElement>(null);

  // Send focus to the first action when the banner first appears
  useEffect(() => {
    if (!hasDecided) {
      acceptBtnRef.current?.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally run only on mount

  if (hasDecided) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Cookie consent"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="flex-1 text-sm text-gray-700">
              We use cookies for essential site functions and, with your
              permission, anonymous error replay and performance analytics to
              improve the site. You can change this anytime in the footer.{" "}
              <Link
                to="/privacy"
                className="text-emerald-600 underline hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              >
                Privacy&nbsp;policy
              </Link>
            </p>

            {/* Three equal-weight actions in tab order */}
            <div className="flex flex-row flex-shrink-0 gap-3">
              <button
                ref={acceptBtnRef}
                type="button"
                onClick={() => accept({ essential: true, analytics: true })}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Accept all
              </button>

              <button
                type="button"
                onClick={() => decline()}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Decline non-essential
              </button>

              <button
                ref={customizeBtnRef}
                type="button"
                onClick={() => setShowModal(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
              >
                Customize
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <CustomizeModal
          onClose={() => setShowModal(false)}
          triggerRef={customizeBtnRef}
        />
      )}
    </>
  );
}
