// Mocks for @/components/discovery/* view components
// Mapped via moduleNameMapper — allows AppDashboard tests to verify routing
// logic without depending on the full discovery component tree.
import React from "react";

/** Mock PublicDiscoveryView component. */
export const PublicDiscoveryView = () =>
  React.createElement("div", { "data-testid": "public-view" });

/** Mock DiscoveryShellSkeleton component. */
export const DiscoveryShellSkeleton = () =>
  React.createElement("div", { "data-testid": "shell-skeleton" });
