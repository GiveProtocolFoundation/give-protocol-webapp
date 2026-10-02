import React, { useState, useEffect, useCallback, useMemo } from "react";
import { X, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { useTranslation } from "@/hooks/useTranslation";
import { getDesignationState } from "@/services/walletDesignationService";
import { META_KEY, loadOnboardingState } from "./charityDashboardState";
import type { OnboardingState } from "./charityDashboardState";

interface ChecklistItemDef {
  id: string;
  labelKey: string;
  labelDefault: string;
  descriptionKey: string;
  descriptionDefault: string;
  actionLabelKey?: string;
  actionLabelDefault?: string;
  actionTab?: string;
  /** Completed automatically from account data; cannot be toggled by hand */
  auto?: boolean;
  /** Not required: excluded from the progress total */
  optional?: boolean;
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: "complete_profile",
    labelKey: "charity.onboarding.item.completeProfile.label",
    labelDefault: "Complete organization profile",
    descriptionKey: "charity.onboarding.item.completeProfile.description",
    descriptionDefault:
      "Add your organization name, description, address, and contact info.",
    actionLabelKey: "charity.onboarding.goToOrganization",
    actionLabelDefault: "Go to Organization",
    actionTab: "organization",
  },
  {
    id: "upload_logo",
    labelKey: "charity.onboarding.item.uploadLogo.label",
    labelDefault: "Upload logo or banner image",
    descriptionKey: "charity.onboarding.item.uploadLogo.description",
    descriptionDefault:
      "Add a logo or banner to help donors recognize your charity.",
    actionLabelKey: "charity.onboarding.goToOrganization",
    actionLabelDefault: "Go to Organization",
    actionTab: "organization",
    auto: true,
  },
  {
    id: "connect_wallet",
    labelKey: "charity.onboarding.item.connectWallet.label",
    labelDefault: "Set up receiving wallet",
    descriptionKey: "charity.onboarding.item.connectWallet.description",
    descriptionDefault:
      "Choose a multisig Safe, institutional custody, or single-signer wallet to receive donations. Prove control by signing a message.",
    actionLabelKey: "charity.onboarding.setupWallet",
    actionLabelDefault: "Set up wallet",
    actionTab: "organization",
    auto: true,
  },
  {
    id: "bank_details",
    labelKey: "charity.onboarding.item.bankDetails.label",
    labelDefault: "Set up bank details for fiat off-ramp",
    descriptionKey: "charity.onboarding.item.bankDetails.description",
    descriptionDefault:
      "Configure banking info if you want to accept card donations.",
    optional: true,
  },
  {
    id: "accept_terms",
    labelKey: "charity.onboarding.item.acceptTerms.label",
    labelDefault: "Review and accept terms of service",
    descriptionKey: "charity.onboarding.item.acceptTerms.description",
    descriptionDefault:
      "Read and confirm the Give Protocol charity terms and conditions.",
  },
];

const ITEMS_ID = "onboarding-checklist-items";

const REQUIRED_ITEMS = CHECKLIST_ITEMS.filter((item) => !item.optional);

/**
 * Counts completed required steps (optional steps never count toward progress).
 * @param completed - IDs of completed checklist items
 * @returns Number of required steps completed
 */
function countRequiredComplete(completed: Iterable<string>): number {
  const done = new Set(completed);
  return REQUIRED_ITEMS.filter((item) => done.has(item.id)).length;
}

/**
 * Picks the rows that should show an action link, so the same action
 * (e.g. "Go to Organization") is only offered once.
 * @param completed - IDs of completed checklist items
 * @returns IDs of items that render their action link
 */
function getActionItemIds(completed: Set<string>): Set<string> {
  const seen = new Set<string>();
  const ids = new Set<string>();
  for (const item of CHECKLIST_ITEMS) {
    if (completed.has(item.id) || !item.actionLabelKey || !item.actionTab) {
      continue;
    }
    const signature = `${item.actionTab}:${item.actionLabelKey}`;
    if (!seen.has(signature)) {
      seen.add(signature);
      ids.add(item.id);
    }
  }
  return ids;
}

interface CharityOnboardingChecklistProps {
  /** The profile row ID from the `profiles` table */
  profileId: string;
  /** The charity's registered wallet address for address-match validation */
  walletAddress?: string | null;
  /** Called when user clicks an action to navigate to a specific tab */
  onNavigateTab?: (_tab: string) => void;
  /** The charity's uploaded logo URL — auto-completes upload_logo step when present */
  logoUrl?: string | null;
  /** The charity's uploaded banner image URL — auto-completes upload_logo step when present */
  bannerImageUrl?: string | null;
  /**
   * Pre-loaded state from the parent. When provided (including null for a
   * failed load) the checklist skips its own fetch and renders immediately,
   * avoiding a layout shift after the page has loaded.
   */
  initialState?: OnboardingState | null;
  /** Called after the user dismisses the checklist */
  onDismiss?: () => void;
}

/**
 * Post-approval onboarding checklist banner for newly approved charities.
 * Persists progress in `profiles.meta.onboarding_checklist`.
 *
 * @param props.profileId - The charity profile ID to store checklist state
 * @param props.walletAddress - The charity's registered wallet address
 * @param props.onNavigateTab - Optional callback to navigate to a portal tab
 * @param props.logoUrl - The charity's uploaded logo URL
 * @param props.bannerImageUrl - The charity's uploaded banner image URL
 * @param props.initialState - Optional pre-loaded state that skips the internal fetch
 * @param props.onDismiss - Optional callback fired after the checklist is dismissed
 * @returns The onboarding checklist panel, or null when dismissed/complete
 */
export const CharityOnboardingChecklist: React.FC<
  CharityOnboardingChecklistProps
> = ({
  profileId,
  walletAddress: _walletAddress,
  onNavigateTab,
  logoUrl,
  bannerImageUrl,
  initialState,
  onDismiss,
}) => {
  const { t } = useTranslation();
  const [completedItems, setCompletedItems] = useState<Set<string>>(
    () => new Set(initialState?.completedItems ?? []),
  );
  const [dismissed, setDismissed] = useState(initialState?.dismissed ?? false);
  // Compact by default once the charity has made progress
  const [collapsed, setCollapsed] = useState(
    () => countRequiredComplete(initialState?.completedItems ?? []) > 0,
  );
  const [loading, setLoading] = useState(initialState === undefined);
  const hasInitialState = initialState !== undefined;

  // Load persisted state from profiles.meta unless the parent supplied it
  useEffect(() => {
    if (hasInitialState) return;
    let isMounted = true;

    /** Fetches onboarding state and applies it to local state. */
    const loadState = async () => {
      const state = await loadOnboardingState(profileId);
      if (!isMounted) return;
      if (state) {
        setDismissed(state.dismissed);
        setCompletedItems(new Set(state.completedItems));
        setCollapsed(countRequiredComplete(state.completedItems) > 0);
      }
      setLoading(false);
    };

    loadState();

    return () => {
      isMounted = false;
    };
  }, [profileId, hasInitialState]);

  // Auto-mark "connect_wallet" complete once the wallet designation has been
  // activated (status = 'active' in charity_profiles).
  useEffect(() => {
    let cancelled = false;
    /** Loads the wallet designation status from charity_profiles. */
    const load = async () => {
      const state = await getDesignationState(profileId);
      if (cancelled) return;
      if (state?.status === "active" && !completedItems.has("connect_wallet")) {
        setCompletedItems((prev) => new Set([...prev, "connect_wallet"]));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [profileId, completedItems]);

  /** Persists onboarding state to profiles.meta in Supabase. */
  const persistState = useCallback(
    async (newCompleted: Set<string>, newDismissed: boolean) => {
      try {
        const { data: currentData, error: fetchError } = await supabase
          .from("profiles")
          .select("meta")
          .eq("id", profileId)
          .single();

        if (fetchError) {
          Logger.warn("Could not fetch meta for onboarding persist", {
            error: fetchError,
            profileId,
          });
          return;
        }

        const currentMeta =
          (currentData?.meta as Record<string, unknown>) || {};
        const updatedMeta = {
          ...currentMeta,
          [META_KEY]: {
            dismissed: newDismissed,
            completedItems: Array.from(newCompleted),
          },
        };

        const { error: updateError } = await supabase
          .from("profiles")
          .update({ meta: updatedMeta })
          .eq("id", profileId);

        if (updateError) {
          Logger.warn("Could not persist onboarding state", {
            error: updateError,
            profileId,
          });
        }
      } catch (err) {
        Logger.warn("Exception persisting onboarding state", {
          error: err,
          profileId,
        });
      }
    },
    [profileId],
  );

  // Auto-mark upload_logo complete when a logo or banner image URL is present
  useEffect(() => {
    if (loading) return;
    const hasImage = Boolean(logoUrl) || Boolean(bannerImageUrl);
    if (hasImage && !completedItems.has("upload_logo")) {
      setCompletedItems((prev) => {
        const next = new Set([...prev, "upload_logo"]);
        persistState(next, dismissed);
        return next;
      });
    }
  }, [
    logoUrl,
    bannerImageUrl,
    completedItems,
    loading,
    dismissed,
    persistState,
  ]);

  const toggleItem = useCallback(
    (itemId: string) => {
      setCompletedItems((prev) => {
        const next = new Set(prev);
        if (next.has(itemId)) {
          next.delete(itemId);
        } else {
          next.add(itemId);
        }
        persistState(next, dismissed);
        return next;
      });
    },
    [dismissed, persistState],
  );

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    persistState(completedItems, true);
    onDismiss?.();
  }, [completedItems, persistState, onDismiss]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const completedCount = useMemo(
    () => countRequiredComplete(completedItems),
    [completedItems],
  );
  const actionItemIds = useMemo(
    () => getActionItemIds(completedItems),
    [completedItems],
  );

  const allComplete = completedCount === REQUIRED_ITEMS.length;

  if (loading || dismissed) return null;

  return (
    <section
      className="bg-accent-subtle/40 dark:bg-accent-subtle/20 border border-line-accent/40 rounded-xl mb-6 overflow-hidden"
      aria-label={t("charity.onboarding.ariaLabel", "Onboarding checklist")}
    >
      <ChecklistHeader
        completedCount={completedCount}
        totalCount={REQUIRED_ITEMS.length}
        allComplete={allComplete}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        onDismiss={handleDismiss}
      />

      {!collapsed && (
        <div id={ITEMS_ID} className="px-5 pb-5">
          <ul className="space-y-3">
            {CHECKLIST_ITEMS.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                completed={completedItems.has(item.id)}
                showAction={actionItemIds.has(item.id)}
                onToggle={toggleItem}
                onNavigateTab={onNavigateTab}
              />
            ))}
          </ul>
          {allComplete && (
            <p className="mt-4 text-sm text-accent-base font-medium text-center">
              {t(
                "charity.onboarding.allComplete",
                "All steps complete! You can dismiss this checklist.",
              )}
            </p>
          )}
        </div>
      )}
    </section>
  );
};

/** Compact header: title, progress, expand toggle, and dismiss once complete. */
function ChecklistHeader({
  completedCount,
  totalCount,
  allComplete,
  collapsed,
  onToggleCollapse,
  onDismiss,
}: {
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onDismiss: () => void;
}) {
  const { t } = useTranslation();
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const iconClass = "h-4 w-4 shrink-0 text-accent-base";

  return (
    <div className="px-5 pt-3 pb-3">
      <div className="flex items-center gap-2 mb-2">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-expanded={!collapsed}
          aria-controls={ITEMS_ID}
          aria-label={
            collapsed
              ? t("charity.onboarding.expand", "Expand checklist")
              : t("charity.onboarding.collapse", "Collapse checklist")
          }
          className="flex flex-1 min-w-0 items-center gap-3 text-left rounded hover:text-accent-hover transition-colors"
        >
          <h2 className="text-sm font-semibold text-content-primary">
            {t("charity.onboarding.title", "Getting Started")}
          </h2>
          <span className="text-xs text-content-secondary">
            {t(
              "charity.onboarding.progress",
              "{{completed}} of {{total}} steps complete",
              { completed: completedCount, total: totalCount },
            )}
          </span>
          {collapsed ? (
            <ChevronDown className={`${iconClass} ml-auto`} />
          ) : (
            <ChevronUp className={`${iconClass} ml-auto`} />
          )}
        </button>
        {allComplete && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded hover:bg-accent-subtle/60 dark:hover:bg-accent-subtle/40 text-accent-base hover:text-accent-hover transition-colors"
            aria-label={t(
              "charity.onboarding.dismiss",
              "Dismiss onboarding checklist",
            )}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="w-full bg-line-subtle/60 dark:bg-line-subtle/15 rounded-full h-1">
        <progress className="sr-only" value={progressPercent} max={100} />
        <div
          className="bg-accent-base h-1 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/** Status icon: a toggle for manual steps, a read-only mark for auto-detected ones. */
function ChecklistStatusIcon({
  item,
  label,
  completed,
  onToggle,
}: {
  item: ChecklistItemDef;
  label: string;
  completed: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const Icon = completed ? CheckCircle2 : Circle;

  if (item.auto) {
    const autoLabel = completed
      ? t("charity.onboarding.stepDone", "{{label}} (completed)", { label })
      : t(
          "charity.onboarding.stepAuto",
          "{{label}} (completes automatically)",
          { label },
        );
    return (
      <span
        role="img"
        aria-label={autoLabel}
        className="mt-0.5 flex-shrink-0 text-accent-base"
      >
        <Icon className="h-5 w-5" />
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-0.5 flex-shrink-0 text-accent-base hover:text-accent-hover transition-colors"
      aria-label={
        completed
          ? t("charity.onboarding.uncheck", "Uncheck {{label}}", { label })
          : t("charity.onboarding.check", "Check {{label}}", { label })
      }
      aria-pressed={completed}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

/** A single checklist row with status icon, label, description, and optional action link. */
function ChecklistRow({
  item,
  completed,
  showAction,
  onToggle,
  onNavigateTab,
}: {
  item: ChecklistItemDef;
  completed: boolean;
  showAction: boolean;
  onToggle: (_id: string) => void;
  onNavigateTab?: (_tab: string) => void;
}) {
  const { t } = useTranslation();
  const label = t(item.labelKey, item.labelDefault);

  const handleToggle = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  const handleAction = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      if (item.actionTab && onNavigateTab) {
        onNavigateTab(item.actionTab);
      }
    },
    [item.actionTab, onNavigateTab],
  );

  return (
    <li className="flex items-start gap-3">
      <ChecklistStatusIcon
        item={item}
        label={label}
        completed={completed}
        onToggle={handleToggle}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${completed ? "line-through text-content-muted" : "text-content-primary"}`}
        >
          {label}
          {item.optional && (
            <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-content-muted bg-surface-sunken rounded">
              {t("charity.onboarding.optional", "Optional")}
            </span>
          )}
        </p>
        {!completed && (
          <p className="text-xs text-content-muted mt-0.5">
            {t(item.descriptionKey, item.descriptionDefault)}
          </p>
        )}
      </div>
      {showAction && item.actionLabelKey && onNavigateTab && (
        <button
          type="button"
          onClick={handleAction}
          className="flex-shrink-0 text-xs text-accent-base hover:text-accent-hover underline transition-colors"
        >
          {t(item.actionLabelKey, item.actionLabelDefault)}
        </button>
      )}
    </li>
  );
}
