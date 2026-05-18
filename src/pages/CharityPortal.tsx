import React, { useState, useEffect, useCallback, useRef } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUnifiedAuth } from "@/hooks/useUnifiedAuth";
import { useProfile } from "@/hooks/useProfile";
import { Plus, Heart, RefreshCw, Wallet, Search } from "lucide-react";
import {
  ApplicationsTab,
  CausesTab,
  HoursVerificationTab,
  ImpactProfileTab,
  OpportunitiesTab,
  OrganizationProfileTab,
  StatsCards,
  TransactionsTab,
} from "./charity-portal/components";
import { Button } from "@/components/ui/Button";
import type { Transaction } from "@/types/contribution";
import { DonationExportModal } from "@/components/contribution/DonationExportModal";
import { WalletLinkModal } from "@/components/wallet/WalletLinkModal";
import { useTranslation } from "@/hooks/useTranslation";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { CharityOnboardingChecklist } from "@/components/charity/CharityOnboardingChecklist";
import { VerificationStatusBanner } from "@/components/charity/VerificationStatusBanner";
import {
  getCharityWalletAddress,
} from "@/services/charityProfileService";

// Type definitions for Supabase data structures
interface DonationData {
  id?: string;
  amount?: string | number;
  created_at?: string;
  donor_id?: string;
  donor?: {
    id: string;
    user_id?: string;
  };
}

interface HourData {
  id?: string;
  hours?: string | number;
  volunteer_id?: string;
  date_performed?: string;
  description?: string;
  volunteer?: {
    id: string;
    user_id?: string;
  };
}

interface EndorsementData {
  id: string;
}

interface VolunteerData {
  volunteer_id: string;
}

interface FiatDonationData {
  id?: string;
  amount_cents?: number;
  created_at?: string;
  donor_id?: string;
  donor_name?: string;
  payment_method?: string;
  disbursement_status?: string;
  status?: string;
}

interface BasicStatsData {
  donations: DonationData[];
  fiatDonations: FiatDonationData[];
  hours: HourData[];
  endorsements: EndorsementData[];
  volunteers: VolunteerData[];
}

interface VolunteerApplication {
  id: string;
  full_name: string;
  opportunity?: {
    id: string;
    title: string;
  };
}

interface VolunteerHours {
  id: string;
  volunteer_id: string;
  volunteerName: string;
  hours: number;
  date_performed: string;
  description: string;
}

interface CharityOpportunity {
  id: string;
  title: string;
  description: string;
  skills: string[];
  commitment: string;
  location: string;
  type: string;
  work_language: string;
  status: string;
  created_at: string;
}

interface CharityCause {
  id: string;
  name: string;
  description: string;
  target_amount: number;
  raised_amount: number;
  category: string;
  image_url: string | null;
  location: string;
  timeline: string | null;
  status: string;
  created_at: string;
}

type TabKey =
  | "transactions"
  | "hours"
  | "applications"
  | "opportunities"
  | "causes"
  | "impact"
  | "organization";

interface TabDef {
  key: TabKey;
  labelKey: string;
  labelDefault: string;
  badge?: number;
}

/**
 * Tab navigation bar for the charity portal
 * @param tabs - Tab definitions with icons and badges
 * @param activeTab - Currently selected tab
 * @param onTabChange - Callback when a tab is clicked
 */
function CharityTabNav({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: TabDef[];
  activeTab: TabKey;
  onTabChange: (_tab: TabKey) => void;
}) {
  const { t } = useTranslation();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const tab = e.currentTarget.dataset.tab as TabKey;
      if (tab) onTabChange(tab);
    },
    [onTabChange],
  );

  return (
    <div className="mb-6 border-b border-line-subtle dark:border-line-subtle/15">
      <div
        className="flex gap-1 min-w-max overflow-x-auto -mb-px"
        role="tablist"
      >
        {tabs.map(({ key, labelKey, labelDefault, badge }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              data-tab={key}
              onClick={handleClick}
              role="tab"
              aria-selected={isActive}
              className={`relative px-4 py-3 text-sm transition-colors duration-200 border-b-[3px] -mb-px whitespace-nowrap ${
                isActive
                  ? "border-accent-base text-accent-base font-semibold"
                  : "border-transparent text-content-secondary font-medium hover:text-content-primary hover:border-line-subtle"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {t(labelKey, labelDefault)}
                {badge !== undefined && badge > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 bg-accent-subtle/60 dark:bg-accent-subtle/30 text-accent-base text-[11px] font-semibold rounded-full border border-line-accent/30">
                    {badge}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Skeleton placeholder for a single stat card. */
function SkeletonStatCard() {
  return (
    <div className="bg-surface-raised rounded-xl p-6 shadow-md animate-pulse">
      <div className="flex items-center">
        <div className="h-14 w-14 bg-surface-sunken rounded-full" />
        <div className="ml-4 flex-1">
          <div className="h-4 bg-surface-sunken rounded w-24 mb-2" />
          <div className="h-8 bg-surface-sunken rounded w-20" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton placeholder for content area. */
function SkeletonContent() {
  return (
    <div className="bg-surface-raised rounded-xl p-6 shadow-md animate-pulse">
      <div className="h-6 bg-surface-sunken rounded w-48 mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface-sunken rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** Loading skeleton for the charity portal dashboard. */
function CharityPortalSkeleton() {
  return (
    <div className="min-h-screen bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Skeleton Header */}
        <div className="mb-8 animate-pulse">
          <div className="h-9 bg-surface-sunken rounded w-64 mb-2" />
          <div className="h-5 bg-surface-sunken rounded w-80" />
        </div>
        {/* Skeleton Stats */}
        <div className="grid gap-6 mb-8 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <SkeletonStatCard key={i} />
          ))}
        </div>
        {/* Skeleton Tabs */}
        <div className="bg-surface-sunken rounded-xl p-1 mb-6 animate-pulse">
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-10 bg-surface-raised rounded-lg flex-1"
              />
            ))}
          </div>
        </div>
        {/* Skeleton Content */}
        <SkeletonContent />
      </div>
    </div>
  );
}

/** Global quick-nav search bar shown above the dashboard stats. */
function DashboardSearch({
  t,
}: {
  t: (_key: string, _fallback?: string) => string;
}) {
  return (
    <div className="relative mb-6">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted pointer-events-none" />
      <input
        type="search"
        aria-label={t("dashboard.search", "Search")}
        placeholder={t(
          "dashboard.searchPlaceholder",
          "Search projects, volunteers (Cmd+K)",
        )}
        className="w-full pl-10 pr-16 py-2.5 text-sm bg-surface-raised text-content-primary border border-line-subtle dark:border-line-subtle/15 rounded-lg shadow-sm placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-accent-base/30 focus:border-accent-base transition"
      />
      <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-content-muted bg-surface-sunken border border-line-subtle dark:border-line-subtle/15 rounded">
        ⌘K
      </kbd>
    </div>
  );
}

/** Overview header with title, last-updated timestamp, and refresh button. */
function OverviewHeader({
  lastUpdatedText,
  onRefresh,
  t,
}: {
  lastUpdatedText: string;
  onRefresh: () => void;
  t: (_key: string, _fallback?: string) => string;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-lg font-semibold text-content-primary">
        {t("dashboard.overview", "Overview")}
      </h2>
      <div className="flex items-center gap-3 text-sm text-content-muted">
        {lastUpdatedText && (
          <span>
            {t("dashboard.lastUpdated", "Last updated")}: {lastUpdatedText}
          </span>
        )}
        <button
          onClick={onRefresh}
          className="p-2 text-content-secondary hover:bg-surface-sunken rounded-full transition-colors"
          title={t("common.refresh", "Refresh")}
          aria-label={t("dashboard.refreshData", "Refresh data")}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Header for the charity portal with title and action buttons. */
function CharityPortalHeader({
  displayName,
  logoUrl,
  t,
}: {
  displayName?: string;
  logoUrl?: string | null;
  t: (_key: string, _fallback?: string) => string;
}) {
  const name = displayName || t("charity.dashboard", "Charity Dashboard");
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w: string) => w.charAt(0))
    .join("")
    .toUpperCase();

  return (
    <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="w-10 h-10 rounded-full object-cover border border-white shadow-sm flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm select-none">
              {initials}
            </span>
          </div>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{name}</h1>
          <p className="mt-1 text-gray-600">
            {t("charity.subtitle", "Manage your charity dashboard")}
          </p>
        </div>
      </div>
      <nav className="mt-4 md:mt-0 flex flex-wrap gap-3">
        <Link to="/charity-portal/create-opportunity">
          <Button variant="primary" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("volunteer.createOpportunity", "Create Opportunity")}
          </Button>
        </Link>
        <Link to="/charity-portal/create-cause">
          <Button
            variant="ghost"
            className="flex items-center gap-2 border border-line-accent/40 text-accent-base hover:bg-accent-subtle/40 dark:hover:bg-accent-subtle/20"
          >
            <Heart className="h-4 w-4" />
            {t("cause.createCause", "Create Cause")}
          </Button>
        </Link>
      </nav>
    </header>
  );
}

interface ConfirmDeleteModalProps {
  type: "cause" | "opportunity";
  onConfirm: () => void;
  onCancel: () => void;
}

/** Modal asking the user to confirm before permanently deleting a cause or opportunity. */
function ConfirmDeleteModal({
  type,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  const label = type === "cause" ? "cause" : "opportunity";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-surface-overlay rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-semibold text-content-primary mb-2">
          Delete {label}?
        </h2>
        <p className="text-content-secondary text-sm mb-6">
          This action cannot be undone. The {label} will be permanently removed.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Integrated notice shown when the charity has no receiving wallet configured. */
function CharityWalletBanner({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="bg-accent-subtle/30 dark:bg-accent-subtle/15 border-l-2 border-line-accent border-y border-r border-line-accent/30 rounded-r-md py-2.5 pl-4 pr-3 mb-6 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3 min-w-0">
        <Wallet className="h-4 w-4 text-accent-base shrink-0" />
        <p className="text-sm text-content-secondary truncate">
          <span className="font-medium text-content-primary">
            Receiving wallet not configured.
          </span>{" "}
          <span className="text-content-muted">
            Connect a wallet to receive on-chain donations.
          </span>
        </p>
      </div>
      <button
        onClick={onOpen}
        className="text-sm font-medium text-accent-base hover:text-accent-hover hover:underline shrink-0"
      >
        Set Up Wallet
      </button>
    </div>
  );
}

/**
 * Formats a date as a human-readable relative timestamp.
 * @param date - The date to format
 * @returns A string like "Just now", "1 minute ago", "5 minutes ago", or a locale time string
 */
function formatLastUpdated(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins === 1) return "1 minute ago";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  return date.toLocaleTimeString();
}

/** Charity management dashboard with tabs for transactions, volunteer hours, applications, opportunities, causes, and organization settings. */
export const CharityPortal: React.FC = () => {
  const { user, userType } = useAuth();
  const userId = user?.id ?? null;
  const { walletAddress: connectedWalletAddress } = useUnifiedAuth();
  const { profile, loading: profileLoading } = useProfile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabKey>("transactions");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "cause" | "opportunity";
    id: string;
  } | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [charityWalletAddress, setCharityWalletAddress] = useState<
    string | null | undefined
  >();
  const [sortConfig, setSortConfig] = useState<{
    key: "date" | "type" | "status" | "organization" | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const { t } = useTranslation();

  // State for charity statistics
  const [charityStats, setCharityStats] = useState({
    totalDonated: 0,
    volunteerHours: 0,
    skillsEndorsed: 0,
    activeVolunteers: 0,
  });

  // State for transactions, applications, hours, and opportunities
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pendingApplications, setPendingApplications] = useState<
    VolunteerApplication[]
  >([]);
  const [pendingHours, setPendingHours] = useState<VolunteerHours[]>([]);
  const [opportunities, setOpportunities] = useState<CharityOpportunity[]>([]);
  const [causes, setCauses] = useState<CharityCause[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [charityLogoUrl, setCharityLogoUrl] = useState<string | null>(null);
  const [charityBannerImageUrl, setCharityBannerImageUrl] = useState<
    string | null
  >(null);
  const [charityOrgName, setCharityOrgName] = useState<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch wallet address and charity profile header data whenever the user changes
  useEffect(() => {
    if (!userId) return;
    getCharityWalletAddress(userId).then((addr) => {
      if (isMountedRef.current) setCharityWalletAddress(addr);
    });
    supabase
      .from("charity_profiles")
      .select("name, logo_url, banner_image_url")
      .eq("claimed_by", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (isMountedRef.current) {
          setCharityOrgName(data?.name ?? null);
          setCharityLogoUrl(data?.logo_url ?? null);
          setCharityBannerImageUrl(data?.banner_image_url ?? null);
        }
      });
  }, [userId]);

  const handleLogoUploaded = useCallback((url: string | null) => {
    setCharityLogoUrl(url);
  }, []);

  const handleBannerUploaded = useCallback((url: string | null) => {
    setCharityBannerImageUrl(url);
  }, []);

  // Helper function to fetch basic statistics data
  const fetchBasicStats = useCallback(
    async (charityId: string): Promise<BasicStatsData> => {
      try {
        // Fetch donations first (most critical)
        const donationsResult = await supabase
          .from("donations")
          .select("amount")
          .eq("charity_id", charityId);

        if (donationsResult.error) {
          Logger.error("Error fetching donations:", {
            error: donationsResult.error,
            charityId,
          });
          throw donationsResult.error;
        }

        // Fetch volunteer hours with better error handling
        let hoursResult = { data: [], error: null };
        let volunteersResult = { data: [], error: null };

        try {
          hoursResult = await supabase
            .from("volunteer_hours")
            .select("hours")
            .eq("charity_id", charityId)
            .eq("status", "approved");

          if (hoursResult.error) {
            Logger.warn("Error fetching volunteer hours:", {
              error: hoursResult.error,
              charityId,
              errorCode: hoursResult.error.code,
              errorMessage: hoursResult.error.message,
            });
            hoursResult = { data: [], error: null }; // Use empty data instead of failing
          }
        } catch (err) {
          Logger.warn("Exception fetching volunteer hours:", {
            error: err,
            charityId,
          });
          hoursResult = { data: [], error: null };
        }

        try {
          volunteersResult = await supabase
            .from("volunteer_hours")
            .select("volunteer_id")
            .eq("charity_id", charityId)
            .eq("status", "approved");

          if (volunteersResult.error) {
            Logger.warn("Error fetching volunteers list:", {
              error: volunteersResult.error,
              charityId,
              errorCode: volunteersResult.error.code,
              errorMessage: volunteersResult.error.message,
            });
            volunteersResult = { data: [], error: null }; // Use empty data instead of failing
          }
        } catch (err) {
          Logger.warn("Exception fetching volunteers list:", {
            error: err,
            charityId,
          });
          volunteersResult = { data: [], error: null };
        }

        // Fetch skill endorsements with error handling
        let endorsementsResult = { data: [], error: null };
        try {
          endorsementsResult = await supabase
            .from("skill_endorsements")
            .select("id")
            .eq("recipient_id", charityId);

          if (endorsementsResult.error) {
            Logger.warn("Error fetching skill endorsements:", {
              error: endorsementsResult.error,
              charityId,
            });
            endorsementsResult = { data: [], error: null }; // Use empty data instead of failing
          }
        } catch (err) {
          Logger.warn("Exception fetching skill endorsements:", {
            error: err,
            charityId,
          });
          endorsementsResult = { data: [], error: null };
        }

        // Fetch fiat donations with error handling
        let fiatDonationsResult = { data: [], error: null };
        try {
          fiatDonationsResult = await supabase
            .from("fiat_donations")
            .select("id, amount_cents, disbursement_status")
            .eq("charity_id", charityId);

          if (fiatDonationsResult.error) {
            Logger.warn("Error fetching fiat donations:", {
              error: fiatDonationsResult.error,
              charityId,
            });
            fiatDonationsResult = { data: [], error: null };
          }
        } catch (err) {
          Logger.warn("Exception fetching fiat donations:", {
            error: err,
            charityId,
          });
          fiatDonationsResult = { data: [], error: null };
        }

        return {
          donations: Array.isArray(donationsResult.data)
            ? donationsResult.data
            : [],
          fiatDonations: Array.isArray(fiatDonationsResult.data)
            ? fiatDonationsResult.data
            : [],
          hours: Array.isArray(hoursResult.data) ? hoursResult.data : [],
          endorsements: Array.isArray(endorsementsResult.data)
            ? endorsementsResult.data
            : [],
          volunteers: Array.isArray(volunteersResult.data)
            ? volunteersResult.data
            : [],
        };
      } catch (err) {
        Logger.error("Critical error in fetchBasicStats:", {
          error: err,
          charityId,
        });
        throw err;
      }
    },
    [],
  );

  // Helper function to calculate statistics
  const calculateStats = useCallback((data: BasicStatsData) => {
    const cryptoDonated = data.donations.reduce((sum, donation) => {
      const amount = donation?.amount ? Number(donation.amount) : 0;
      return sum + amount;
    }, 0);

    const fiatDonated =
      data.fiatDonations.reduce((sum, donation) => {
        const cents = donation?.amount_cents
          ? Number(donation.amount_cents)
          : 0;
        return sum + cents;
      }, 0) / 100;

    const totalHours = data.hours.reduce((sum, hour) => {
      const hourCount = hour?.hours ? Number(hour.hours) : 0;
      return sum + hourCount;
    }, 0);

    const uniqueVolunteers = new Set(
      data.volunteers.filter((v) => v?.volunteer_id).map((v) => v.volunteer_id),
    );

    return {
      totalDonated: cryptoDonated + fiatDonated,
      volunteerHours: totalHours,
      skillsEndorsed: data.endorsements.length,
      activeVolunteers: uniqueVolunteers.size,
    };
  }, []);

  // Helper function to fetch and format detailed transactions
  const fetchTransactions = useCallback(async (charityId: string) => {
    // Fetch crypto donations
    const { data: detailedDonations, error } = await supabase
      .from("donations")
      .select(
        `
        id,
        amount,
        created_at,
        donor:donor_id (
          id,
          user_id
        )
      `,
      )
      .eq("charity_id", charityId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const donationsList = Array.isArray(detailedDonations)
      ? detailedDonations
      : [];

    const cryptoTransactions: Transaction[] = donationsList.map((donation) => ({
      id: donation?.id || "",
      hash: donation?.id || "",
      from: donation?.donor?.id || "",
      to: charityId,
      amount: donation?.amount ? Number(donation.amount) : 0,
      cryptoType: "ETH",
      fiatValue: donation?.amount ? Number(donation.amount) : 0,
      fee: donation?.amount ? Number(donation.amount) * 0.001 : 0,
      timestamp: donation?.created_at || new Date().toISOString(),
      status: "completed",
      purpose: "Donation",
      metadata: {
        organization: donation?.donor?.id
          ? `Donor (${donation.donor.id.substring(0, 8)}...)`
          : "Anonymous",
        donor: donation?.donor?.id
          ? `Donor (${donation.donor.id.substring(0, 8)}...)`
          : "Anonymous",
        category: "Donation",
      },
    }));

    // Fetch fiat donations
    let fiatTransactions: Transaction[] = [];
    try {
      const { data: fiatDonations, error: fiatError } = await supabase
        .from("fiat_donations")
        .select(
          "id, amount_cents, created_at, donor_name, payment_method, disbursement_status, status",
        )
        .eq("charity_id", charityId)
        .order("created_at", { ascending: false });

      if (fiatError) {
        Logger.warn("Error fetching fiat donations for transactions:", {
          error: fiatError,
          charityId,
        });
      } else {
        const fiatList = Array.isArray(fiatDonations) ? fiatDonations : [];
        fiatTransactions = fiatList.map((fd) => ({
          id: fd.id || "",
          amount: fd.amount_cents ? fd.amount_cents / 100 : 0,
          cryptoType: "USD",
          fiatValue: fd.amount_cents ? fd.amount_cents / 100 : 0,
          timestamp: fd.created_at || new Date().toISOString(),
          status:
            fd.status === "completed"
              ? ("completed" as const)
              : ("pending" as const),
          purpose: "Fiat Donation",
          metadata: {
            organization: fd.donor_name || "Anonymous",
            donor: fd.donor_name || "Anonymous",
            category: "Fiat Donation",
            isFiatDonation: true,
            paymentMethod: fd.payment_method,
            disbursementStatus: fd.disbursement_status,
          },
        }));
      }
    } catch (err) {
      Logger.warn("Exception fetching fiat donations for transactions:", {
        error: err,
        charityId,
      });
    }

    // Merge and sort by date descending
    const allTransactions = [...cryptoTransactions, ...fiatTransactions];
    allTransactions.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    return allTransactions;
  }, []);

  // Helper function to fetch volunteer applications
  const fetchVolunteerApplications = useCallback(async (charityId: string) => {
    const { data: opportunityIds, error: idsError } = await supabase
      .from("volunteer_opportunities")
      .select("id")
      .eq("charity_id", charityId);

    if (idsError) throw idsError;

    const validOpportunityIds =
      Array.isArray(opportunityIds) && opportunityIds.length > 0
        ? opportunityIds.map((opp) => opp.id).filter(Boolean)
        : [];

    if (validOpportunityIds.length === 0) {
      return [];
    }

    const { data: applications, error: applicationsError } = await supabase
      .from("volunteer_applications")
      .select(
        `
        id,
        full_name,
        opportunity:opportunity_id (
          id,
          title
        )
      `,
      )
      .eq("status", "pending")
      .in("opportunity_id", validOpportunityIds)
      .order("created_at", { ascending: false });

    if (applicationsError) throw applicationsError;

    return Array.isArray(applications) ? applications : [];
  }, []);

  // Helper function to fetch and format pending volunteer hours
  const fetchPendingHours = useCallback(async (charityId: string) => {
    try {
      const { data: pendingHoursData, error } = await supabase
        .from("volunteer_hours")
        .select(
          `id, volunteer_id, hours, date_performed, description,
          profiles:volunteer_id (
            display_name,
            full_name
          )`,
        )
        .eq("charity_id", charityId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        Logger.warn("Error fetching pending volunteer hours:", {
          error,
          charityId,
          errorCode: error.code,
          errorMessage: error.message,
        });
        return []; // Return empty array instead of throwing
      }

      const pendingHoursList = Array.isArray(pendingHoursData)
        ? pendingHoursData
        : [];

      return pendingHoursList.map((hour) => {
        const profile = hour?.profiles as
          | { display_name?: string | null; full_name?: string | null }
          | null
          | undefined;
        const volunteerName =
          profile?.display_name ?? profile?.full_name ?? "Anonymous Volunteer";
        return {
          id: hour?.id || "",
          volunteer_id: hour?.volunteer_id || "",
          volunteerName,
          hours: hour?.hours ? Number(hour.hours) : 0,
          date_performed: hour?.date_performed || new Date().toISOString(),
          description: hour?.description || "",
        };
      });
    } catch (err) {
      Logger.warn("Exception fetching pending volunteer hours:", {
        error: err,
        charityId,
      });
      return []; // Return empty array instead of throwing
    }
  }, []);

  // Helper function to fetch volunteer opportunities
  const fetchOpportunities = useCallback(async (charityId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from("volunteer_opportunities")
        .select("*")
        .eq("charity_id", charityId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        Logger.warn("Error fetching opportunities:", { error: fetchError });
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      Logger.warn("Exception fetching opportunities:", { error: err });
      return [];
    }
  }, []);

  // Helper function to fetch causes
  const fetchCauses = useCallback(async (charityId: string) => {
    try {
      const { data, error: fetchError } = await supabase
        .from("causes")
        .select("*")
        .eq("charity_id", charityId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        Logger.warn("Error fetching causes:", { error: fetchError });
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      Logger.warn("Exception fetching causes:", { error: err });
      return [];
    }
  }, []);

  const fetchCharityData = useCallback(async () => {
    if (!profile?.id) return;

    try {
      setLoading(true);
      setError(null);

      Logger.info("Fetching charity data", { profileId: profile.id });

      // Fetch basic statistics data
      const basicData = await fetchBasicStats(profile.id);
      if (!isMountedRef.current) return;
      const stats = calculateStats(basicData);
      setCharityStats(stats);

      // Fetch detailed data in parallel
      const [
        formattedTransactions,
        applicationsList,
        formattedHours,
        opportunitiesList,
        causesList,
      ] = await Promise.all([
        fetchTransactions(profile.id),
        fetchVolunteerApplications(profile.id),
        fetchPendingHours(profile.id),
        fetchOpportunities(profile.id),
        fetchCauses(profile.id),
      ]);

      if (!isMountedRef.current) return;
      setTransactions(formattedTransactions);
      setPendingApplications(applicationsList);
      setPendingHours(formattedHours);
      setOpportunities(opportunitiesList);
      setCauses(causesList);

      Logger.info("Successfully fetched all charity data");
    } catch (err) {
      if (!isMountedRef.current) return;
      const errorMessage = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : "";

      Logger.error("Error fetching charity data:", {
        error: errorMessage,
        stack: errorStack,
        state: { profileId: profile?.id },
      });

      setError("Failed to load charity data. Please try again.");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [
    profile?.id,
    fetchBasicStats,
    calculateStats,
    fetchTransactions,
    fetchVolunteerApplications,
    fetchPendingHours,
    fetchOpportunities,
    fetchCauses,
  ]);

  useEffect(() => {
    if (profile?.id) {
      fetchCharityData();
    }
  }, [profile?.id, fetchCharityData]);

  const handleRetry = useCallback(() => {
    setError(null);
    fetchCharityData();
  }, [fetchCharityData]);

  const lastRefreshTime = useRef<number>(0);

  const handleRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshTime.current < 3000) {
      return;
    }
    lastRefreshTime.current = now;
    fetchCharityData();
  }, [fetchCharityData]);

  // Last updated timestamp
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !error) {
      setLastUpdated(new Date());
    }
  }, [loading, error]);

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

  const handleTransactionsTab = useCallback(
    () => setActiveTab("transactions"),
    [],
  );
  const handleHoursTab = useCallback(() => setActiveTab("hours"), []);

  const handleShowExportModal = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const handleSort = useCallback(
    (key: "date" | "type" | "status" | "organization") => {
      setSortConfig((prevConfig) => ({
        key,
        direction:
          prevConfig.key === key && prevConfig.direction === "asc"
            ? "desc"
            : "asc",
      }));
    },
    [],
  );

  // Modal close handlers
  const handleCloseExportModal = useCallback(
    () => setShowExportModal(false),
    [],
  );

  const handleOpenWalletModal = useCallback(() => setShowWalletModal(true), []);
  const handleCloseWalletModal = useCallback(
    () => setShowWalletModal(false),
    [],
  );

  // Linking a personal wallet to the user account does NOT automatically set
  // the charity's official receiving wallet — that flow now requires a signed
  // attestation + email confirmation. See DesignatedWalletCard on the
  // Organization tab. The legacy auto-write was a security bug.
  const handleWalletLinked = useCallback(() => {
    // intentional no-op
  }, []);

  const handleOnboardingNavigate = useCallback((tab: string) => {
    const validTabs: TabKey[] = [
      "transactions",
      "hours",
      "applications",
      "opportunities",
      "causes",
      "impact",
      "organization",
    ];
    if (validTabs.includes(tab as TabKey)) {
      setActiveTab(tab as TabKey);
      if (tab === "organization") {
        // Wait for the tab panel to mount before scrolling.
        requestAnimationFrame(() => {
          document
            .getElementById("organization-profile")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }, []);

  // Cause handlers
  const handleEditCause = useCallback(
    (causeId: string) => {
      navigate(`/charity-portal/edit-cause/${causeId}`);
    },
    [navigate],
  );

  const handleRequestDeleteCause = useCallback((causeId: string) => {
    setDeleteConfirm({ type: "cause", id: causeId });
  }, []);

  // Opportunity handlers
  const handleEditOpportunity = useCallback(
    (opportunityId: string) => {
      navigate(`/charity-portal/edit-opportunity/${opportunityId}`);
    },
    [navigate],
  );

  const handleRequestDeleteOpportunity = useCallback(
    (opportunityId: string) => {
      setDeleteConfirm({ type: "opportunity", id: opportunityId });
    },
    [],
  );

  // Shared delete confirm/cancel
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === "cause") {
      const { error } = await supabase
        .from("causes")
        .delete()
        .eq("id", deleteConfirm.id);
      if (!error) {
        setCauses((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      }
    } else {
      const { error } = await supabase
        .from("volunteer_opportunities")
        .delete()
        .eq("id", deleteConfirm.id);
      if (!error) {
        setOpportunities((prev) =>
          prev.filter((o) => o.id !== deleteConfirm.id),
        );
      }
    }
    setDeleteConfirm(null);
  }, [deleteConfirm]);

  const handleCancelDelete = useCallback(() => {
    setDeleteConfirm(null);
  }, []);

  // Hours handlers
  const handleVerifyHours = useCallback(async (hoursId: string) => {
    const { error } = await supabase
      .from("volunteer_hours")
      .update({ status: "approved" })
      .eq("id", hoursId);
    if (!error) {
      setPendingHours((prev) => prev.filter((h) => h.id !== hoursId));
    }
  }, []);

  const handleRejectHours = useCallback(async (hoursId: string) => {
    const { error } = await supabase
      .from("volunteer_hours")
      .update({ status: "rejected" })
      .eq("id", hoursId);
    if (!error) {
      setPendingHours((prev) => prev.filter((h) => h.id !== hoursId));
    }
  }, []);

  const handleExportHours = useCallback(() => {
    const header = "Volunteer,Hours,Date,Description";
    const rows = pendingHours.map(
      (h) =>
        `"${h.volunteerName}",${h.hours},"${h.date_performed}","${h.description.replace(/"/g, '""')}"`,
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const blobUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = blobUrl;
    anchor.download = "volunteer-hours.csv";
    anchor.click();
    URL.revokeObjectURL(blobUrl);
  }, [pendingHours]);

  if (!user) {
    return <Navigate to="/login?type=charity" />;
  }

  if (profileLoading || loading) {
    return <CharityPortalSkeleton />;
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-status-danger/10 p-4 rounded-md text-status-danger">
          {error}
          <Button onClick={handleRetry} variant="secondary" className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Redirect donor users to give dashboard
  if (userType !== "charity") {
    return <Navigate to="/give-dashboard" />;
  }

  // Get pending counts for tab badges
  const pendingApplicationsCount = pendingApplications.length;
  const pendingHoursCount = pendingHours.length;

  return (
    <main className="min-h-screen bg-surface-base">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <CharityPortalHeader
          displayName={charityOrgName ?? profile?.display_name}
          logoUrl={charityLogoUrl}
          t={t}
        />

        {/* Verification status banner for pending/rejected/suspended charities */}
        <VerificationStatusBanner userId={user.id} />

        {/* Wallet setup banner when no receiving wallet is configured */}
        {charityWalletAddress === null && (
          <CharityWalletBanner onOpen={handleOpenWalletModal} />
        )}

        {/* Stats Row with Last Updated */}
        <OverviewHeader
          lastUpdatedText={lastUpdated ? formatLastUpdated(lastUpdated) : ""}
          onRefresh={handleRefresh}
          t={t}
        />

        {/* Wallet indicator when wallet is configured */}
        {typeof charityWalletAddress === "string" && (
          <div className="flex items-center gap-2 mb-4 text-xs text-accent-base">
            <Wallet className="h-3.5 w-3.5" />
            <span>
              Receiving wallet: {charityWalletAddress.slice(0, 6)}&hellip;
              {charityWalletAddress.slice(-4)}
            </span>
          </div>
        )}

        {/* Onboarding checklist for newly approved charities */}
        {profile?.id && (
          <CharityOnboardingChecklist
            profileId={profile.id}
            onNavigateTab={handleOnboardingNavigate}
            logoUrl={charityLogoUrl}
            bannerImageUrl={charityBannerImageUrl}
          />
        )}

        {/* Quick-nav search */}
        <DashboardSearch t={t} />

        {/* Enhanced Metrics Grid */}
        <StatsCards
          stats={charityStats}
          onTransactionsClick={handleTransactionsTab}
          onVolunteersClick={handleHoursTab}
        />

        {/* Tab Navigation */}
        <CharityTabNav
          tabs={[
            {
              key: "transactions",
              labelKey: "charity.transactions",
              labelDefault: "Transactions",
            },
            {
              key: "hours",
              labelKey: "volunteer.hoursVerification",
              labelDefault: "Hours",
              badge: pendingHoursCount,
            },
            {
              key: "applications",
              labelKey: "charity.applications",
              labelDefault: "Applications",
              badge: pendingApplicationsCount,
            },
            {
              key: "opportunities",
              labelKey: "volunteer.opportunities",
              labelDefault: "Opportunities",
            },
            {
              key: "causes",
              labelKey: "cause.causes",
              labelDefault: "Causes",
            },
            {
              key: "impact",
              labelKey: "impact.profile",
              labelDefault: "Impact Profile",
            },
            {
              key: "organization",
              labelKey: "organization.settings",
              labelDefault: "Organization",
            },
          ]}
          activeTab={activeTab}
          onTabChange={handleTabChange}
        />

        {/* Transaction History */}
        {activeTab === "transactions" && (
          <TransactionsTab
            transactions={transactions}
            sortConfig={sortConfig}
            onSort={handleSort}
            onShowExportModal={handleShowExportModal}
          />
        )}

        {/* Hours Verification (unified) */}
        {activeTab === "hours" && profile?.id && (
          <HoursVerificationTab
            pendingHours={pendingHours}
            profileId={profile.id}
            onVerify={handleVerifyHours}
            onReject={handleRejectHours}
            onExport={handleExportHours}
          />
        )}

        {/* Volunteer Applications */}
        {activeTab === "applications" && (
          <ApplicationsTab pendingApplications={pendingApplications} />
        )}

        {/* Volunteer Opportunities Management */}
        {activeTab === "opportunities" && (
          <OpportunitiesTab
            opportunities={opportunities}
            onEdit={handleEditOpportunity}
            onDelete={handleRequestDeleteOpportunity}
          />
        )}

        {/* Causes Tab */}
        {activeTab === "causes" && (
          <CausesTab
            causes={causes}
            onEdit={handleEditCause}
            onDelete={handleRequestDeleteCause}
          />
        )}

        {/* Impact Profile */}
        {activeTab === "impact" && profile?.id && (
          <ImpactProfileTab profileId={profile.id} />
        )}

        {/* Organization Profile */}
        {activeTab === "organization" && profile?.id && (
          <OrganizationProfileTab
            profileId={profile.id}
            onLogoUploaded={handleLogoUploaded}
            onBannerUploaded={handleBannerUploaded}
          />
        )}

        {/* Export Modal */}
        {showExportModal && (
          <DonationExportModal
            donations={transactions}
            onClose={handleCloseExportModal}
          />
        )}

        {/* Wallet Link Modal */}
        {showWalletModal && (
          <WalletLinkModal
            isOpen={showWalletModal}
            onClose={handleCloseWalletModal}
            onLinked={handleWalletLinked}
          />
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm !== null && (
          <ConfirmDeleteModal
            type={deleteConfirm.type}
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        )}
      </div>
    </main>
  );
};

export default CharityPortal;
