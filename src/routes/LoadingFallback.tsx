import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Page-shaped skeleton used as the Suspense fallback while lazy route chunks
 * load. Gives static pages visible structure instead of a blank screen during
 * chunk fetches (GIV-988).
 */
export const LoadingFallback: React.FC = () => (
  <div
    className="max-w-4xl mx-auto px-4 py-12"
    role="status"
    aria-label="Loading page"
  >
    <Skeleton className="h-9 w-2/3 mx-auto mb-4" />
    <Skeleton className="h-5 w-1/2 mx-auto mb-12" />
    <Skeleton className="h-7 w-1/3 mb-4" />
    <Skeleton className="h-16 w-full mb-3" />
    <Skeleton className="h-16 w-full mb-3" />
    <Skeleton className="h-16 w-full mb-12" />
    <Skeleton className="h-7 w-1/4 mb-4" />
    <Skeleton className="h-16 w-full mb-3" />
    <Skeleton className="h-16 w-full" />
  </div>
);
