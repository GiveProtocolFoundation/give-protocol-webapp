import React, { useState, useEffect, useCallback, useMemo } from "react";
import { X, CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { getDesignationState } from "@/services/walletDesignationService";

interface OnboardingMeta {
  dismissed?: boolean;
  completedItems?: string[];
}

interface ChecklistItemDef {
  id: string;
  label: string;
  description: string;
  actionLabel?: string;
  actionTab?: string;
}

const CHECKLIST_ITEMS: ChecklistItemDef[] = [
  {
    id: "complete_profile",
    label: "Complete organization profile",
    description:
      "Add your organization name, description, address, and contact info.",
    actionLabel: "Go to Organization",
    actionTab: "organization",
  },
  {
    id: "upload_logo",
    label: "Upload logo or banner image",
    description: "Add a logo or banner to help donors recognize your charity.",
    actionLabel: "Go to Organization",
    actionTab: "organization",
  },
  {
    id: "connect_wallet",
    label: "Set up receiving wallet",
    description:
      "Choose a multisig Safe, institutional custody, or single-signer wallet to receive donations. Prove control by signing a message.",
    actionLabel: "Set up wallet",
    actionTab: "organization",
  },
  {
    id: "bank_details",
    label: "Set up bank details for fiat off-ramp",
    description:
      "Optional: configure banking info if you want to accept card donations.",
  },
  {
    id: "accept_terms",
    label: "Review and accept terms of service",
    description:
      "Read and confirm the Give Protocol charity terms and conditions.",
  },
];

const META_KEY = "onboarding_checklist";

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
}) => {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load persisted state from profiles.meta
  useEffect(() => {
    let isMounted = true;

    /** Fetches onboarding state from profiles.meta in Supabase. */
    const loadState = async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("meta")
          .eq("id", profileId)
          .single();

        if (!isMounted) return;

        if (error) {
          Logger.warn("Could not load onboarding state", { error, profileId });
          return;
        }

        const meta = (data?.meta as Record<string, unknown>) || {};
        const checklist = (meta[META_KEY] as OnboardingMeta) || {};

        if (checklist.dismissed) {
          setDismissed(true);
        }
        if (Array.isArray(checklist.completedItems)) {
          setCompletedItems(new Set(checklist.completedItems));
        }
      } catch (err) {
        Logger.warn("Exception loading onboarding state", {
          error: err,
          profileId,
        });
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadState();

    return () => {
      isMounted = false;
    };
  }, [profileId]);

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
  }, [completedItems, persistState]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const completedCount = useMemo(
    () => CHECKLIST_ITEMS.filter((item) => completedItems.has(item.id)).length,
    [completedItems],
  );

  const allComplete = completedCount === CHECKLIST_ITEMS.length;

  if (loading || dismissed) return null;

  return (
    <section
      className="bg-accent-subtle/40 dark:bg-accent-subtle/20 border border-line-accent/40 rounded-xl mb-6 overflow-hidden"
      aria-label="Onboarding checklist"
    >
      <ChecklistHeader
        completedCount={completedCount}
        totalCount={CHECKLIST_ITEMS.length}
        allComplete={allComplete}
        collapsed={collapsed}
        onToggleCollapse={handleToggleCollapse}
        onDismiss={handleDismiss}
      />

      {!collapsed && (
        <div className="px-5 pb-5">
          <ul className="space-y-3">
            {CHECKLIST_ITEMS.map((item) => (
              <ChecklistRow
                key={item.id}
                item={item}
                completed={completedItems.has(item.id)}
                onToggle={toggleItem}
                onNavigateTab={onNavigateTab}
              />
            ))}
          </ul>
          {allComplete && (
            <p className="mt-4 text-sm text-accent-base font-medium text-center">
              All steps complete! You can dismiss this checklist.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

/** Header row with progress bar, collapse toggle, and dismiss button. */
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
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="px-5 pt-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-semibold text-content-primary">
            Getting Started
          </h2>
          <p className="text-xs text-content-secondary mt-0.5">
            {completedCount} of {totalCount} steps complete
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleCollapse}
            className="p-1 rounded hover:bg-accent-subtle/60 dark:hover:bg-accent-subtle/40 text-accent-base hover:text-accent-hover transition-colors"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
          {allComplete && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-accent-subtle/60 dark:hover:bg-accent-subtle/40 text-accent-base hover:text-accent-hover transition-colors"
              aria-label="Dismiss onboarding checklist"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      <div className="w-full bg-line-subtle/60 dark:bg-line-subtle/15 rounded-full h-1.5">
        <progress className="sr-only" value={progressPercent} max={100} />
        <div
          className="bg-accent-base h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

/** A single checklist row with checkbox, label, description, and optional action link. */
function ChecklistRow({
  item,
  completed,
  onToggle,
  onNavigateTab,
}: {
  item: ChecklistItemDef;
  completed: boolean;
  onToggle: (_id: string) => void;
  onNavigateTab?: (_tab: string) => void;
}) {
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
      <button
        onClick={handleToggle}
        className="mt-0.5 flex-shrink-0 text-accent-base hover:text-accent-hover transition-colors"
        aria-label={completed ? `Uncheck ${item.label}` : `Check ${item.label}`}
        aria-pressed={completed}
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${completed ? "line-through text-content-muted" : "text-content-primary"}`}
        >
          {item.label}
        </p>
        {!completed && (
          <p className="text-xs text-content-muted mt-0.5">
            {item.description}
          </p>
        )}
      </div>
      {item.actionLabel && item.actionTab && onNavigateTab && !completed && (
        <button
          onClick={handleAction}
          className="flex-shrink-0 text-xs text-accent-base hover:text-accent-hover underline transition-colors"
        >
          {item.actionLabel}
        </button>
      )}
    </li>
  );
}
