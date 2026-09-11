import React from "react";
import { useLocation } from "react-router-dom";
import { Logger } from "@/utils/logger";
import { LoadingFallback } from "./LoadingFallback";

interface RouteTransitionProps {
  children: React.ReactNode;
}

/**
 * Wraps routed pages with a Suspense fallback, logs page-view analytics, and resets scroll
 * position on each navigation.
 * @param props - Component props.
 * @param props.children - The route content to render.
 * @returns The transition wrapper element.
 */
export const RouteTransition: React.FC<RouteTransitionProps> = ({
  children,
}) => {
  const location = useLocation();

  React.useEffect(() => {
    // Log page views for analytics
    Logger.info("Page view", {
      path: location.pathname,
      timestamp: new Date().toISOString(),
    });

    // Scroll to top on route change
    window.scrollTo(0, 0);
  }, [location]);

  return (
    <React.Suspense fallback={<LoadingFallback />}>
      <div className="animate-fadeIn">{children}</div>
    </React.Suspense>
  );
};
