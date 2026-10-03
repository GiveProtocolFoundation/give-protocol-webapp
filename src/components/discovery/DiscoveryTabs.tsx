import React, { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/hooks/useTranslation";

/** Tab identifiers for the browse discovery page. */
export type DiscoveryTab = "charities" | "causes" | "funds";

const TAB_IDS: DiscoveryTab[] = ["charities", "causes", "funds"];

const VALID_TABS = new Set<string>(TAB_IDS);

/**
 * DOM id of a tab button, so panels can reference it via aria-labelledby.
 * @param tab - Discovery tab
 * @returns Element id
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getDiscoveryTabId(tab: DiscoveryTab): string {
  return `discovery-tab-${tab}`;
}

/**
 * DOM id of a tab panel, so tabs can reference it via aria-controls.
 * @param tab - Discovery tab
 * @returns Element id
 */
// eslint-disable-next-line react-refresh/only-export-components
export function getDiscoveryPanelId(tab: DiscoveryTab): string {
  return `discovery-panel-${tab}`;
}

/**
 * Reads the current discovery tab from the URL search params.
 * Falls back to "charities" when no valid tab param is present.
 * @param searchParams - URLSearchParams instance
 * @returns The active discovery tab
 */
// eslint-disable-next-line react-refresh/only-export-components
export function readTabParam(searchParams: URLSearchParams): DiscoveryTab {
  const raw = searchParams.get("tab") ?? "";
  return VALID_TABS.has(raw) ? (raw as DiscoveryTab) : "charities";
}

/**
 * Hook that manages the active discovery tab via URL search params.
 * @returns Current tab and setter callback
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useDiscoveryTab(): [
  DiscoveryTab,
  (_tab: DiscoveryTab) => void,
] {
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
  onTabChange: (_tab: DiscoveryTab) => void;
}

/**
 * Tab bar for switching between Charities, Causes, and Portfolio Funds
 * on the /browse discovery page. Implements the WAI-ARIA tabs pattern: a
 * `tablist` of `tab` buttons with roving tabindex, arrow/Home/End key support,
 * and `aria-controls` pointing at the matching `tabpanel`.
 * @param props - Active tab and change handler
 * @returns Tab list component
 */
export const DiscoveryTabs: React.FC<DiscoveryTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();

  const tabs = useMemo(
    () => [
      {
        id: "charities" as DiscoveryTab,
        label: t("browse.tabs.charities", "Charities"),
      },
      {
        id: "causes" as DiscoveryTab,
        label: t("browse.tabs.causes", "Causes"),
      },
      {
        id: "funds" as DiscoveryTab,
        label: t("browse.tabs.funds", "Portfolio Funds"),
      },
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

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const current = TAB_IDS.indexOf(
        event.currentTarget.dataset.tab as DiscoveryTab,
      );
      if (current === -1) return;

      let next = -1;
      if (event.key === "ArrowRight") next = (current + 1) % TAB_IDS.length;
      else if (event.key === "ArrowLeft")
        next = (current - 1 + TAB_IDS.length) % TAB_IDS.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = TAB_IDS.length - 1;
      if (next === -1) return;

      event.preventDefault();
      const nextTab = TAB_IDS[next];
      onTabChange(nextTab);
      document.getElementById(getDiscoveryTabId(nextTab))?.focus();
    },
    [onTabChange],
  );

  return (
    <div
      role="tablist"
      aria-label={t("browse.tabs.ariaLabel", "Browse categories")}
      className="flex gap-1 rounded-lg bg-gray-100 dark:bg-gray-800 p-1"
    >
      {tabs.map((tab) => {
        const selected = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            id={getDiscoveryTabId(tab.id)}
            type="button"
            role="tab"
            data-tab={tab.id}
            aria-selected={selected}
            aria-controls={getDiscoveryPanelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={handleClick}
            onKeyDown={handleKeyDown}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1",
              selected
                ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
