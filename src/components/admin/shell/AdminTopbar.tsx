import React from "react";
import { useLocation } from "react-router-dom";
import { Search, Bell } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { ConnectButton } from "@/components/web3/ConnectButton";
import { resolveAdminPageMeta } from "./adminNav";

/**
 * Sticky admin top bar: route-derived breadcrumb + page title, a global search
 * field, a notification bell, and the live wallet connect control.
 *
 * The wallet control reuses the app's existing {@link ConnectButton} so all
 * web3 connection logic and state stay intact.
 */
export function AdminTopbar(): React.ReactElement {
  const { t } = useTranslation();
  const location = useLocation();
  const meta = resolveAdminPageMeta(location.pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 flex-none items-center gap-5 border-b border-[#e4e8e6] bg-[#f4f6f5]/90 px-8 backdrop-blur-md">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-medium text-[#7c8884]">
          {t("admin.dashboard.title", "Admin Dashboard")} /{" "}
          {t(meta.breadcrumbKey, meta.breadcrumbFallback)}
        </div>
        <h1 className="mt-px truncate text-[18px] font-bold tracking-[-0.015em] text-[#16201c]">
          {t(meta.titleKey, meta.titleFallback)}
        </h1>
      </div>

      {/* Global search (presentational chrome) */}
      <div className="hidden h-[38px] w-[300px] items-center gap-[9px] rounded-[10px] border border-[#e4e8e6] bg-white px-[13px] lg:flex">
        <Search size={15} strokeWidth={2} className="text-[#9aa5a0]" />
        <input
          type="search"
          placeholder={t(
            "admin.shell.searchPlaceholder",
            "Search donors, charities, tx hash…",
          )}
          aria-label={t("admin.shell.searchLabel", "Search the admin console")}
          className="w-full border-0 bg-transparent text-[13px] text-[#16201c] outline-none placeholder:text-[#9aa5a0]"
        />
        <span className="rounded-[5px] border border-[#e4e8e6] px-[5px] py-px text-[10.5px] font-semibold text-[#9aa5a0]">
          ⌘K
        </span>
      </div>

      {/* Notifications */}
      <button
        type="button"
        aria-label={t("admin.shell.notifications", "Notifications")}
        className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border border-[#e4e8e6] bg-white"
      >
        <Bell size={17} strokeWidth={1.9} className="text-[#445]" />
        <span className="absolute right-[9px] top-2 h-[7px] w-[7px] rounded-full border-[1.5px] border-white bg-[#e0533d]" />
      </button>

      {/* Wallet connect — reuses existing web3 control */}
      <ConnectButton />
    </header>
  );
}
