import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FaBluesky, FaGithub, FaDiscord } from "react-icons/fa6";
import { Logo } from "@/components/Logo";
import { useTranslation } from "@/hooks/useTranslation";
import { DOCS_CONFIG } from "@/config/docs";
import { CustomizeModal } from "@/components/consent/CustomizeModal";

/** Footer branding with logo and tagline. */
function FooterBrand() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 min-w-0 lg:pr-16 mb-4 lg:mb-0">
      <Link
        to="/"
        className="flex items-center mb-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded text-xl font-bold text-white"
      >
        <Logo className="h-6 w-6 mr-2" />
        Give Protocol
      </Link>
      <p className="text-sm text-white/90">{t("footer.brand.tagline")}</p>
    </div>
  );
}

/** Footer resource navigation links. */
function FooterResources() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 min-w-0 lg:pl-16">
      <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
        {t("footer.resources.title")}
      </h3>
      <ul className="space-y-2">
        <li>
          <Link
            to="/faq"
            className="text-sm text-white/90 hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1 transition-colors inline-block"
          >
            {t("footer.resources.faq")}
          </Link>
        </li>
        <li>
          <a
            href={DOCS_CONFIG.url}
            className="text-sm text-white/90 hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1 transition-colors inline-block"
          >
            {t("nav.docs")}
          </a>
        </li>
        <li>
          <Link
            to="/about"
            className="text-sm text-white/90 hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1 transition-colors inline-block"
          >
            {t("footer.resources.about")}
          </Link>
        </li>
      </ul>
    </div>
  );
}

/** Footer legal navigation links + cookie preferences. */
function FooterLegal() {
  const { t } = useTranslation();
  const [showCookieModal, setShowCookieModal] = useState(false);
  const cookieBtnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
          {t("footer.legal.title")}
        </h3>
        <ul className="space-y-2">
          <li>
            <Link
              to="/legal"
              className="text-sm text-white/90 hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1 transition-colors inline-block"
            >
              {t("footer.legal.terms")}
            </Link>
          </li>
          <li>
            <Link
              to="/privacy"
              className="text-sm text-white/90 hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1 transition-colors inline-block"
            >
              {t("footer.legal.privacy")}
            </Link>
          </li>
          <li>
            <button
              ref={cookieBtnRef}
              type="button"
              onClick={() => setShowCookieModal(true)}
              className="text-sm text-white/90 hover:text-white focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded px-1 -mx-1 transition-colors inline-block bg-transparent border-0 cursor-pointer p-0"
            >
              Cookie preferences
            </button>
          </li>
        </ul>
      </div>

      {showCookieModal && (
        <CustomizeModal
          onClose={() => setShowCookieModal(false)}
          triggerRef={cookieBtnRef}
        />
      )}
    </>
  );
}

/** Footer social media icon links. */
function FooterConnect() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
        {t("footer.connect.title")}
      </h3>
      <div className="flex space-x-4">
        <a
          href="https://giveprotocol.bsky.social"
          className="text-white/90 hover:text-white transition-colors focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded p-2"
          aria-label="Bluesky"
        >
          <FaBluesky aria-hidden="true" className="h-5 w-5" />
        </a>
        <a
          href="https://github.com/giveprotocol"
          className="text-white/90 hover:text-white transition-colors focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded p-2"
          aria-label="GitHub"
        >
          <FaGithub aria-hidden="true" className="h-5 w-5" />
        </a>
        <a
          href="https://discord.gg/giveprotocol"
          className="text-white/90 hover:text-white transition-colors focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded p-2"
          aria-label="Discord"
        >
          <FaDiscord aria-hidden="true" className="h-5 w-5" />
        </a>
      </div>
    </div>
  );
}

/** Site-wide footer with resource links, legal links, and social media icons. */
export const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-gradient-to-r from-emerald-600 to-teal-600 border-t border-emerald-700">
      <div className="max-w-7xl mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-8">
          <FooterBrand />
          <FooterResources />
          <FooterLegal />
          <FooterConnect />
        </div>
        <div className="mt-16 border-t border-white/20 pt-8">
          <p className="text-sm text-white/90">
            © {new Date().getFullYear()} {t("footer.copyright")}
          </p>
        </div>
      </div>
    </footer>
  );
};
