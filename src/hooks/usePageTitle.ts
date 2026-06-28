import { useEffect } from "react";

/**
 * Sets the document title for accessibility (WCAG 2.4.2).
 * @param title - The page-specific title segment
 */
export const usePageTitle = (title: string): void => {
  useEffect(() => {
    document.title = `${title} | Give Protocol`;
    return () => {
      document.title = "Give Protocol - Smart Giving Platform";
    };
  }, [title]);
};
