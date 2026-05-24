import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/hooks/useTranslation";

/** Tab identifiers for the browse discovery page. */
export type DiscoveryTab = "charities" | "causes" | "funds";

const TAB_IDS: DiscoveryTab[] = ["charities", "causes", "funds"];

const VALID_TABS = new Set<string>(TAB_IDS);

/**
 * Reads the current discovery tab from the URL search params.
 * Falls back to "charities" when no valid tab param is present.
 * @param searchParams - URLSearchParams instance
 * @returns The active discovery tab
 */
export function readTabParam(searchParams: URLSearchParams): DiscoveryTab {
  const raw = searchParams.get("tab") ?? "";
  return VALID_TABS.has(raw) ? (raw as DiscoveryTab) : "charities";
}

/**
 * Hook that manages the active discovery tab via URL search params.
 * @returns Current tab and setter callback
 */
export function useDiscoveryTab(): [DiscoveryTab, (tab: DiscoveryTab) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = readTabParam(searchParams);

  const setTab = useCallback(
    (tab: DiscoveryTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (tab === "charities") {
            next.delete("tab");
          } else {
            next.set("tab", tab);
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return [activeTab, setTab];
}

interface DiscoveryTabsProps {
  activeTab: DiscoveryTab;
  onTabChange: (tab: DiscoveryTab) => void;
}

/**
 * Tab bar for switching between Charities, Causes, and Portfolio Funds
 * on the /browse discovery page.
 * @param props - Active tab and change handler
 * @returns Tab navigation component
 */
export const DiscoveryTabs: React.FC<DiscoveryTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();

  const tabs = useMemo(
    () => [
      { id: "charities" as DiscoveryTab, label: t("browse.tabs.charities", "Charities") },
      { id: "causes" as DiscoveryTab, label: t("browse.tabs.causes", "Causes") },
      { id: "funds" as DiscoveryTab, label: t("browse.tabs.funds", "Portfolio Funds") },
    ],
    [t],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const tab = event.currentTarget.dataset.tab as DiscoveryTab | undefined;
      if (tab && VALID_TABS.has(tab)) {
        onTabChange(tab);
      }
    },
    [onTabChange],
  );

  return (
    <nav
      aria-label={t("browse.tabs.ariaLabel", "Browse categories")}
      className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          data-tab={tab.id}
          aria-selected={activeTab === tab.id}
          onClick={handleClick}
          className={cn(
            "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1",
            activeTab === tab.id
              ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
              : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
          )}
        >
          {tab.label}
        </button>
      ))}
    </nav>
  );
};
