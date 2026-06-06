import { useEffect, useRef, useState, type RefObject } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { useConsent } from "@/lib/consent/ConsentProvider";
import { CustomizeModal } from "./CustomizeModal";

/**
 * Fixed bottom-of-viewport consent banner.
 *
 * - Only renders when `useConsent().hasDecided === false`.
 * - Does NOT trap pointer events outside its strip.
 * - Three equal-weight actions: Accept all / Decline non-essential / Customize.
 * - "Customize" opens <CustomizeModal showCloseButton={false}>.
 *   ESC inside the modal closes only the modal; banner remains until a
 *   decision is made.
 * - a11y: role=region, aria-label, first action receives focus on mount.
 */

interface BannerActionsProps {
  acceptBtnRef: RefObject<HTMLButtonElement>;
  onAcceptAll: () => void;
  onDecline: () => void;
  onCustomize: () => void;
  t: (key: string) => string;
}

/** Three equal-weight action buttons rendered inside the banner strip. */
function BannerActions({
  acceptBtnRef,
  onAcceptAll,
  onDecline,
  onCustomize,
  t,
}: BannerActionsProps) {
  return (
    <div className="flex flex-row flex-shrink-0 gap-3">
      <button
        ref={acceptBtnRef}
        type="button"
        onClick={onAcceptAll}
        className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {t("consent.banner.acceptAll")}
      </button>

      <button
        type="button"
        onClick={onDecline}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {t("consent.banner.decline")}
      </button>

      <button
        type="button"
        onClick={onCustomize}
        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
      >
        {t("consent.banner.customize")}
      </button>
    </div>
  );
}

export function CookieBanner() {
  const { t } = useTranslation();
  const { hasDecided, accept, decline } = useConsent();
  const [showModal, setShowModal] = useState(false);

  const acceptBtnRef = useRef<HTMLButtonElement>(null);

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
      {/* skipcq: JS-0764 -- consent banner requires explicit role="region" per AC */}
      <section
        role="region"
        aria-label={t("consent.banner.ariaLabel")}
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg"
      >
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <p className="flex-1 text-sm text-gray-700">
              {t("consent.banner.body")}{" "}
              <Link
                to="/privacy"
                className="text-emerald-600 underline hover:text-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded"
              >
                {t("consent.banner.privacyLink")}
              </Link>
            </p>

            <BannerActions
              acceptBtnRef={acceptBtnRef}
              onAcceptAll={() => accept({ essential: true, analytics: true })}
              onDecline={() => decline()}
              onCustomize={() => setShowModal(true)}
              t={t}
            />
          </div>
        </div>
      </section>

      {showModal && (
        <CustomizeModal
          onClose={() => setShowModal(false)}
          showCloseButton={false}
        />
      )}
    </>
  );
}
