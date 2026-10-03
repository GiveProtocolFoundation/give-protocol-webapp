import React, { useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { Logo } from "./Logo";
import { SettingsMenu } from "./SettingsMenu";
import { Menu, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { DOCS_CONFIG } from "@/config/docs";

interface NavLinksProps {
  isActive: (_path: string) => string;
  t: (_key: string) => string;
}

/**
 * Desktop navigation links component
 * @param isActive - Function to determine if a path is active
 * @param t - Translation function
 */
const DesktopNavLinks: React.FC<NavLinksProps> = ({ isActive, t }) => (
  <div className="hidden sm:ml-6 sm:flex sm:space-x-2">
    <Link
      to="/about"
      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${isActive("/about")}`}
    >
      {t("nav.about")}
    </Link>
    <a
      href={DOCS_CONFIG.url}
      className={
        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 text-gray-700 hover:bg-primary-50"
      }
    >
      {t("nav.docs")}
    </a>
    <Link
      to="/legal"
      className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${isActive("/legal")}`}
    >
      {t("nav.legal")}
    </Link>
  </div>
);

interface MobileMenuProps {
  isActive: (_path: string) => string;
  t: (_key: string) => string;
  onMenuClose: () => void;
  isLimitedNavPage: boolean;
}

/**
 * Mobile navigation menu component
 * @param isActive - Function to determine if a path is active
 * @param t - Translation function
 * @param onMenuClose - Callback to close the mobile menu
 * @param isLimitedNavPage - Whether the current page has limited navigation
 */
const MobileMenu: React.FC<MobileMenuProps> = ({
  isActive,
  t,
  onMenuClose,
  isLimitedNavPage,
}) => (
  <div className="sm:hidden" id="mobile-menu">
    <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-lg rounded-b-lg">
      <Link
        to="/about"
        className={`block px-3 py-3 rounded-md text-base font-medium ${isActive("/about")}`}
        onClick={onMenuClose}
      >
        {t("nav.about")}
      </Link>
      <a
        href={DOCS_CONFIG.url}
        className="block px-3 py-3 rounded-md text-base font-medium text-gray-700 hover:bg-primary-50"
        onClick={onMenuClose}
      >
        {t("nav.docs")}
      </a>
      <Link
        to="/legal"
        className={`block px-3 py-3 rounded-md text-base font-medium ${isActive("/legal")}`}
        onClick={onMenuClose}
      >
        {t("nav.legal")}
      </Link>
      {!isLimitedNavPage && (
        <Link
          to="/give-dashboard"
          className="block px-3 py-3 rounded-md text-base font-medium bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={onMenuClose}
        >
          {t("nav.launchApp")}
        </Link>
      )}
    </div>
  </div>
);

/** Top-level navigation bar with desktop/mobile responsive layout */
export const Navbar: React.FC = () => {
  const location = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();

  const isActive = useCallback(
    (path: string) =>
      location.pathname === path
        ? "bg-primary-100 text-primary-900"
        : "text-gray-700 hover:bg-primary-50",
    [location.pathname],
  );

  const handleMenuToggle = useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  const handleMenuClose = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Check if current page should only show limited navigation
  const isLimitedNavPage = ["/about", "/legal", "/privacy"].includes(
    location.pathname,
  );

  return (
    <nav className="bg-background-primary border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center h-16">
        <Link to="/" className="flex items-center">
          <Logo className="h-8 w-8" alt="" />
          <span className="ml-2 text-2xl font-bold font-inter text-primary-900">
            Give Protocol
          </span>
        </Link>

        <DesktopNavLinks isActive={isActive} t={t} />

        <SettingsMenu />
        {!isLimitedNavPage && (
          <Link
            to="/give-dashboard"
            className="inline-flex items-center px-4 py-2 border border-transparent
                       text-sm font-medium rounded-md text-white bg-emerald-600
                       hover:bg-emerald-700 shadow-cta hover:shadow-[0_4px_18px_rgba(5,150,105,0.5)]
                       transition-all duration-200 transform hover:-translate-y-0.5
                       active:translate-y-0 active:shadow-sm focus:outline-none focus:ring-2
                       focus:ring-offset-2 focus:ring-emerald-500"
          >
            {t("nav.launchApp")}
          </Link>
        )}

        {/* Mobile menu button */}
        <button
          type="button"
          className="sm:hidden inline-flex items-center justify-center ml-2 p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
          aria-controls="mobile-menu"
          aria-expanded={isMenuOpen}
          onClick={handleMenuToggle}
        >
          {isMenuOpen ? (
            <X className="block h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="block h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </div>

      {isMenuOpen && (
        <MobileMenu
          isActive={isActive}
          t={t}
          onMenuClose={handleMenuClose}
          isLimitedNavPage={isLimitedNavPage}
        />
      )}
    </nav>
  );
};
