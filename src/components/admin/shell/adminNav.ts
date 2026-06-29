import {
  LayoutDashboard,
  BarChart3,
  Landmark,
  DollarSign,
  Activity,
  Wallet,
  ShieldCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";

/** A section grouping for the admin sidebar navigation. */
export type AdminNavGroup = "overview" | "operations";

/** A single admin sidebar navigation entry. */
export interface AdminNavItem {
  /** Stable identifier. */
  id: string;
  /** i18n key for the label. */
  labelKey: string;
  /** English fallback label. */
  labelFallback: string;
  /** Destination route. */
  to: string;
  /** Sidebar section this item belongs to. */
  group: AdminNavGroup;
  /** Icon component (Lucide). */
  icon: LucideIcon;
  /**
   * When true, the item is only active on an exact path match. Used for the
   * Dashboard entry, whose route is a prefix of every other admin route.
   */
  exact?: boolean;
  /** When true, render a pending-count badge sourced from live data. */
  showPendingBadge?: boolean;
}

/**
 * Admin sidebar navigation model. Routes map to the real admin router paths in
 * `src/routes/index.tsx`; the active item is derived from the current route,
 * never from local state.
 */
export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    id: "dashboard",
    labelKey: "admin.nav.dashboard",
    labelFallback: "Dashboard",
    to: "/admin",
    group: "overview",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    id: "reports",
    labelKey: "admin.nav.reports",
    labelFallback: "Reports & Analytics",
    to: "/admin/reports",
    group: "overview",
    icon: BarChart3,
  },
  {
    id: "charities",
    labelKey: "admin.nav.charities",
    labelFallback: "Charities",
    to: "/admin/charities",
    group: "operations",
    icon: Landmark,
    showPendingBadge: true,
  },
  {
    id: "donations",
    labelKey: "admin.nav.donations",
    labelFallback: "Donations",
    to: "/admin/donations",
    group: "operations",
    icon: DollarSign,
  },
  {
    id: "impact-metrics",
    labelKey: "admin.nav.impactMetrics",
    labelFallback: "Impact Metrics",
    to: "/admin/impact-metrics",
    group: "operations",
    icon: Activity,
  },
  {
    id: "portfolio-funds",
    labelKey: "admin.nav.portfolioFunds",
    labelFallback: "Portfolio Funds",
    to: "/admin/portfolio-funds",
    group: "operations",
    icon: Wallet,
  },
  {
    id: "content-moderation",
    labelKey: "admin.nav.contentModeration",
    labelFallback: "Content Moderation",
    to: "/admin/content-moderation",
    group: "operations",
    icon: ShieldCheck,
  },
  {
    id: "settings",
    labelKey: "admin.nav.settings",
    labelFallback: "System Settings",
    to: "/admin/settings",
    group: "operations",
    icon: SlidersHorizontal,
  },
];

/**
 * Determines whether a nav item is active for the given pathname.
 *
 * @param item - The navigation item to test.
 * @param pathname - The current router pathname.
 * @returns `true` when the item should render in its active state.
 */
export function isAdminNavItemActive(
  item: AdminNavItem,
  pathname: string,
): boolean {
  if (item.exact) {
    return pathname === item.to;
  }
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}

/** Metadata describing the page chrome (breadcrumb + title) for a route. */
export interface AdminPageMeta {
  titleKey: string;
  titleFallback: string;
  /** Breadcrumb section label key. */
  breadcrumbKey: string;
  breadcrumbFallback: string;
}

/**
 * Resolves the top-bar breadcrumb and title for the current admin route. Falls
 * back to the Dashboard heading for unmapped `/admin/*` routes.
 *
 * @param pathname - The current router pathname.
 * @returns The page meta used to render the top bar.
 */
export function resolveAdminPageMeta(pathname: string): AdminPageMeta {
  // Routes that own a sidebar entry reuse its label as the page title.
  const titleByPath: Record<string, { key: string; fallback: string }> = {
    "/admin": { key: "admin.dashboard.title", fallback: "Admin Dashboard" },
    "/admin/reports": {
      key: "admin.nav.reports",
      fallback: "Reports & Analytics",
    },
    "/admin/charities": {
      key: "admin.charity.title",
      fallback: "Charity Management",
    },
    "/admin/donations": {
      key: "admin.actions.donationMonitoring",
      fallback: "Donation Monitoring",
    },
    "/admin/impact-metrics": {
      key: "admin.nav.impactMetrics",
      fallback: "Impact Metrics",
    },
    "/admin/portfolio-funds": {
      key: "admin.portfolio.title",
      fallback: "Portfolio Funds",
    },
    "/admin/content-moderation": {
      key: "admin.actions.contentModeration",
      fallback: "Content Moderation",
    },
    "/admin/settings": {
      key: "admin.actions.systemSettings",
      fallback: "System Settings",
    },
    "/admin/charity-requests": {
      key: "admin.actions.charityRequests",
      fallback: "Charity Requests",
    },
    "/admin/platform-news": {
      key: "admin.news.title",
      fallback: "Platform News",
    },
  };

  // Find the longest matching prefix so nested routes still resolve a title.
  const match = Object.keys(titleByPath)
    .filter((path) =>
      path === "/admin"
        ? pathname === "/admin"
        : pathname === path || pathname.startsWith(`${path}/`),
    )
    .sort((a, b) => b.length - a.length)[0];

  const title = match
    ? titleByPath[match]
    : { key: "admin.dashboard.title", fallback: "Admin Dashboard" };

  // Breadcrumb section derives from the matching nav item's group.
  const navItem = ADMIN_NAV_ITEMS.find((item) =>
    isAdminNavItemActive(item, pathname),
  );
  const isOperations = navItem?.group === "operations";

  return {
    titleKey: title.key,
    titleFallback: title.fallback,
    breadcrumbKey: isOperations
      ? "admin.nav.operations"
      : "admin.nav.overview",
    breadcrumbFallback: isOperations ? "Operations" : "Overview",
  };
}
