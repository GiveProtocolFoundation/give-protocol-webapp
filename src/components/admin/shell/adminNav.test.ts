import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
  resolveAdminPageMeta,
  type AdminNavItem,
} from "./adminNav";

/** Looks up a nav item by id, throwing if absent (keeps tests strict, no `!`). */
function getNavItem(id: string): AdminNavItem {
  const item = ADMIN_NAV_ITEMS.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown admin nav item: ${id}`);
  return item;
}

describe("ADMIN_NAV_ITEMS", () => {
  it("defines an entry for every admin route group", () => {
    expect(ADMIN_NAV_ITEMS.length).toBeGreaterThan(0);
    expect(ADMIN_NAV_ITEMS.some((i) => i.group === "overview")).toBe(true);
    expect(ADMIN_NAV_ITEMS.some((i) => i.group === "operations")).toBe(true);
  });

  it("marks only the dashboard entry as exact-match", () => {
    const exact = ADMIN_NAV_ITEMS.filter((i) => i.exact);
    expect(exact).toHaveLength(1);
    expect(exact[0].id).toBe("dashboard");
  });

  it("flags the charities entry for the pending badge", () => {
    const charities = ADMIN_NAV_ITEMS.find((i) => i.id === "charities");
    expect(charities?.showPendingBadge).toBe(true);
  });
});

describe("isAdminNavItemActive", () => {
  const dashboard = getNavItem("dashboard");
  const charities = getNavItem("charities");

  it("matches the dashboard only on an exact path", () => {
    expect(isAdminNavItemActive(dashboard, "/admin")).toBe(true);
    expect(isAdminNavItemActive(dashboard, "/admin/charities")).toBe(false);
    expect(isAdminNavItemActive(dashboard, "/admin/reports")).toBe(false);
  });

  it("matches a prefix route and its nested children", () => {
    expect(isAdminNavItemActive(charities, "/admin/charities")).toBe(true);
    expect(isAdminNavItemActive(charities, "/admin/charities/abc")).toBe(true);
  });

  it("does not match sibling routes that merely share a prefix", () => {
    // "/admin/charity-requests" must not activate the "/admin/charities" item.
    expect(isAdminNavItemActive(charities, "/admin/charity-requests")).toBe(
      false,
    );
    expect(isAdminNavItemActive(charities, "/admin")).toBe(false);
  });
});

describe("resolveAdminPageMeta", () => {
  it("resolves the dashboard heading and Overview breadcrumb", () => {
    const meta = resolveAdminPageMeta("/admin");
    expect(meta.titleKey).toBe("admin.dashboard.title");
    expect(meta.breadcrumbKey).toBe("admin.nav.overview");
  });

  it("resolves an Operations route's title and breadcrumb", () => {
    const meta = resolveAdminPageMeta("/admin/charities");
    expect(meta.titleKey).toBe("admin.charity.title");
    expect(meta.breadcrumbKey).toBe("admin.nav.operations");
  });

  it("resolves an Overview route's title and breadcrumb", () => {
    const meta = resolveAdminPageMeta("/admin/reports");
    expect(meta.titleKey).toBe("admin.nav.reports");
    expect(meta.breadcrumbKey).toBe("admin.nav.overview");
  });

  it("resolves a title for routes without a sidebar entry", () => {
    const meta = resolveAdminPageMeta("/admin/charity-requests");
    expect(meta.titleKey).toBe("admin.actions.charityRequests");
  });

  it("falls back to the dashboard heading for unmapped routes", () => {
    const meta = resolveAdminPageMeta("/admin/does-not-exist");
    expect(meta.titleKey).toBe("admin.dashboard.title");
    expect(meta.breadcrumbFallback).toBe("Overview");
  });

  it("matches the longest route prefix for nested paths", () => {
    const meta = resolveAdminPageMeta("/admin/portfolio-funds/123/edit");
    expect(meta.titleKey).toBe("admin.portfolio.title");
  });
});
