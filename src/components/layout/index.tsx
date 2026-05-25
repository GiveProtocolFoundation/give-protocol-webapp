import React from "react";
import { useLocation } from "react-router-dom";
import { AppNavbar } from "@/components/AppNavbar";
import { Footer } from "@/components/Footer";
import { useTranslation } from "@/hooks/useTranslation";

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * App shell that wraps routed pages with the navbar, main content area, and footer.
 * The home route ("/") opts out of the shell because it ships its own full-page layout.
 */
export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const { t } = useTranslation();
  const isHomePage = location.pathname === "/";

  // Landing page has its own navigation and footer, so render without layout wrapper
  if (isHomePage) {
    return children;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Skip-to-content link for keyboard users (WCAG 2.4.1) */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-emerald-700 focus:ring-2 focus:ring-emerald-500"
      >
        {t("common.skipToMainContent", "Skip to main content")}
      </a>
      <AppNavbar />
      <main
        id="main-content"
        className="flex-grow w-full max-w-[1440px] mx-auto"
      >
        {children}
      </main>
      <Footer />
    </div>
  );
};
