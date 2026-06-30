import React, { useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/utils/cn";
import { Logo } from "@/components/Logo";
import {
  ADMIN_NAV_ITEMS,
  isAdminNavItemActive,
  type AdminNavGroup,
  type AdminNavItem,
} from "./adminNav";
import { usePendingCharitiesCount } from "./usePendingCharitiesCount";

/** A single navigation row, styled active/idle from the current route. */
function NavRow({
  item,
  active,
  pendingCount,
}: {
  item: AdminNavItem;
  active: boolean;
  pendingCount?: number;
}): React.ReactElement {
  const { t } = useTranslation();
  const Icon = item.icon;
  const showBadge =
    item.showPendingBadge === true &&
    pendingCount !== undefined &&
    pendingCount > 0;

  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-[11px] rounded-[9px] px-3 py-[9px] text-[13.5px] no-underline transition-colors duration-150",
        active
          ? "bg-[#1b8a6b] font-semibold text-white"
          : "font-medium text-[#bcd4ca] hover:bg-white/5",
      )}
    >
      <Icon
        size={17}
        strokeWidth={1.9}
        className={active ? "text-white" : "text-[#7fbfa6]"}
      />
      <span className="flex-1">{t(item.labelKey, item.labelFallback)}</span>
      {showBadge && (
        <span
          className={cn(
            "rounded-full px-[7px] py-px font-mono-data text-[10.5px] font-bold text-white",
            active ? "bg-white/15" : "bg-[#e0533d]",
          )}
        >
          {pendingCount}
        </span>
      )}
    </Link>
  );
}

/** Section header label ("Overview" / "Operations"). */
function SectionLabel({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="px-3 pb-1.5 pt-2 text-[10.5px] font-bold uppercase tracking-[0.11em] text-[#4f9279]">
      {children}
    </div>
  );
}

/** Sidebar footer: signed-in user chip with a sign-out control. */
function UserFooter({
  email,
  onSignOut,
}: {
  email: string;
  onSignOut: () => void;
}): React.ReactElement {
  const { t } = useTranslation();
  const initials = (email.slice(0, 2) || "AD").toUpperCase();
  const label =
    email !== "" ? email.split("@")[0] : t("admin.shell.adminLabel", "admin");

  return (
    <div className="border-t border-white/[0.08] p-3">
      <div className="flex items-center gap-2.5 rounded-[10px] bg-white/[0.04] px-2.5 py-[9px]">
        <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-[#1fae7f] text-[13px] font-bold text-[#04231a]">
          {initials}
        </div>
        <div className="min-w-0 flex-1 leading-[1.2]">
          <div className="truncate text-[13px] font-semibold text-white">
            {label}
          </div>
          <div className="text-[11px] text-[#5fae93]">
            {t("admin.shell.superAdmin", "Super Admin")}
          </div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          aria-label={t("admin.shell.signOut", "Sign out")}
          className="flex flex-none items-center justify-center text-[#5fae93] transition-colors hover:text-white"
        >
          <LogOut size={15} strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

/**
 * Persistent admin console sidebar: brand header, route-bound navigation, and a
 * user/sign-out footer. The active item derives from the current route.
 */
export function AdminSidebar(): React.ReactElement {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const pendingCount = usePendingCharitiesCount();

  const handleSignOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/auth");
    }
  }, [logout, navigate]);

  const groups: { id: AdminNavGroup; labelKey: string; fallback: string }[] = [
    { id: "overview", labelKey: "admin.nav.overview", fallback: "Overview" },
    {
      id: "operations",
      labelKey: "admin.nav.operations",
      fallback: "Operations",
    },
  ];

  return (
    <aside className="relative flex w-[248px] flex-none flex-col bg-[#0e352c] text-[#cfe0d9]">
      {/* Brand header */}
      <div className="flex items-center gap-[11px] border-b border-white/[0.08] px-5 pb-[18px] pt-[22px]">
        <Logo className="h-[34px] w-[34px] flex-none" />
        <div className="leading-[1.05]">
          <div className="text-[15px] font-bold tracking-[-0.01em] text-white">
            Give Protocol
          </div>
          <div className="mt-0.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#5fae93]">
            {t("admin.nav.consoleLabel", "Admin Console")}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col gap-0.5">
            <SectionLabel>{t(group.labelKey, group.fallback)}</SectionLabel>
            {ADMIN_NAV_ITEMS.filter((item) => item.group === group.id).map(
              (item) => (
                <NavRow
                  key={item.id}
                  item={item}
                  active={isAdminNavItemActive(item, location.pathname)}
                  pendingCount={pendingCount}
                />
              ),
            )}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <UserFooter email={user?.email ?? ""} onSignOut={handleSignOut} />
    </aside>
  );
}
