import React from "react";
import { cn } from "@/utils/cn";

interface DiscoveryShellProps {
  topBar?: React.ReactNode;
  main: React.ReactNode;
  rail?: React.ReactNode;
  bottom?: React.ReactNode;
  className?: string;
}

/**
 * Layout primitive for the /browse Discovery Hub.
 * Provides a centered 1440px container with an optional top bar, a main + right rail body,
 * and a bottom slot. Internal gutters follow an 8pt rhythm (gap-6=24px, gap-8=32px).
 */
export const DiscoveryShell: React.FC<DiscoveryShellProps> = ({
  topBar,
  main,
  rail,
  bottom,
  className,
}) => {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-8 md:py-12",
        className,
      )}
    >
      {topBar !== undefined && topBar !== null && (
        <div className="mb-10">{topBar}</div>
      )}

      <div
        className={cn(
          "grid grid-cols-1 gap-8 lg:gap-10",
          rail ? "lg:grid-cols-[minmax(0,1fr)_360px]" : "",
        )}
      >
        <div className="min-w-0 space-y-8 overflow-x-hidden">{main}</div>
        {rail !== undefined && rail !== null && (
          <aside className="min-w-0 space-y-6">{rail}</aside>
        )}
      </div>

      {bottom !== undefined && bottom !== null && (
        <div className="mt-10">{bottom}</div>
      )}
    </div>
  );
};
