import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import {
  DollarSign,
  Clock,
  Award,
  Download,
  Calendar,
  ExternalLink,
  Settings,
  ChevronUp,
  ChevronDown,
  ClipboardList,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Transaction } from "@/types/contribution";
import { DonationExportModal } from "@/components/contribution/DonationExportModal";
import { formatDate } from "@/utils/date";
import { useTranslation } from "@/hooks/useTranslation";
import { CurrencyDisplay } from "@/components/CurrencyDisplay";
import { WalletAliasSettings } from "@/components/settings/WalletAliasSettings";
import { ScheduledDonations } from "@/components/donor/ScheduledDonations";
import { SelfReportedHoursDashboard } from "@/components/volunteer/self-reported";
import {
  useUserContributionStats,
  useUnifiedContributions,
} from "@/hooks/useContributionStats";
import type { UnifiedContribution } from "@/services/contributionAggregationService";
import { useProfile } from "@/hooks/useProfile";
import { ENV } from "@/config/env";

type View =
  | "select"
  | "donor"
  | "charity"
  | "forgotPassword"
  | "forgotUsername";

type SortKey = "date" | "type" | "status" | "organization";

/**
 * Extracts sortable value from a contribution based on sort key
 */
function getSortValue(
  contribution: Transaction,
  key: SortKey,
): string | number {
  switch (key) {
    case "date":
      return new Date(contribution.timestamp).getTime();
    case "type":
      return contribution.purpose.toLowerCase();
    case "status":
      return contribution.status.toLowerCase();
    case "organization":
      return (contribution.metadata?.organization || "").toLowerCase();
    default:
      // All SortKey cases are handled above; this satisfies exhaustiveness checking
      return "";
  }
}

/**
 * Compares two values for sorting
 */
function compareValues(
  aValue: string | number,
  bValue: string | number,
  direction: "asc" | "desc",
): number {
  if (typeof aValue === "string" && typeof bValue === "string") {
    const result = aValue.localeCompare(bValue);
    return direction === "asc" ? result : -result;
  }
  if (aValue < bValue) return direction === "asc" ? -1 : 1;
  if (aValue > bValue) return direction === "asc" ? 1 : -1;
  return 0;
}

/**
 * Maps a UnifiedContribution to the Transaction shape used by the table and export modal
 */
function mapContributionToTransaction(c: UnifiedContribution): Transaction {
  if (c.isFiatDonation) {
    return {
      id: c.id,
      amount: c.amount || 0,
      cryptoType: "USD",
      fiatValue: c.amount || 0,
      timestamp: c.date,
      status: c.status === "completed" ? "completed" : "pending",
      purpose: "Fiat Donation",
      metadata: {
        organization: c.organizationName,
        category: "Fiat Donation",
        isFiatDonation: true,
        paymentMethod: c.paymentMethod,
        disbursementStatus: c.disbursementStatus,
      },
    };
  }

  if (c.type === "donation") {
    return {
      id: c.id,
      amount: c.amount || 0,
      cryptoType: "GLMR",
      fiatValue: c.amount || 0,
      timestamp: c.date,
      status: c.status === "completed" ? "completed" : "pending",
      purpose: "Donation",
      metadata: {
        organization: c.organizationName,
        category: "Donation",
      },
    };
  }

  // Volunteer contributions
  const purposeMap: Record<string, string> = {
    formal_volunteer: "Volunteer Hours",
    self_reported: "Volunteer Hours",
  };

  return {
    id: c.id,
    amount: 0,
    timestamp: c.date,
    status:
      c.status === "completed" || c.status === "validated"
        ? "completed"
        : "pending",
    purpose: purposeMap[c.type] || c.type,
    metadata: {
      organization: c.organizationName,
      hours: c.hours,
      description: c.description,
    },
  };
}

/** Skeleton placeholder for a single dashboard stat card. */
function DashboardSkeletonCard() {
  return (
    <Card className="p-6 flex items-center animate-pulse">
      <div className="h-12 w-12 bg-gray-200 rounded-full mr-4" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
        <div className="h-7 bg-gray-200 rounded w-16" />
      </div>
    </Card>
  );
}

/** Filter bar with year/type selectors and export button for contributions. */
function ContributionsFilterBar({
  selectedYear,
  selectedType,
  years,
  onYearChange,
  onTypeChange,
  onExport,
  t,
}: {
  selectedYear: string;
  selectedType: string;
  years: string[];
  onYearChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onTypeChange: (_e: React.ChangeEvent<HTMLSelectElement>) => void;
  onExport: () => void;
  t: (_key: string, _fallback?: string) => string;
}) {
  return (
    <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
      <h2 className="text-xl font-semibold text-gray-900">
        {t("dashboard.contributions")}
      </h2>
      <div className="flex items-center space-x-4 flex-wrap gap-2">
        <select
          value={selectedYear}
          onChange={onYearChange}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
          aria-label="Filter by year"
        >
          {years.map((year) => (
            <option key={year} value={year}>
              {year === "all" ? t("filter.allYears", "All Years") : year}
            </option>
          ))}
        </select>
        <select
          value={selectedType}
          onChange={onTypeChange}
          className="px-4 py-2 border border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
          aria-label="Filter by type"
        >
          <option value="all">{t("filter.allTypes", "All Types")}</option>
          <option value="Donation">{t("filter.donations", "Donations")}</option>
          <option value="Fiat Donation">
            {t("filter.fiatDonations", "Fiat Donations")}
          </option>
          <option value="Volunteer Application">
            {t("filter.volunteerApplications", "Volunteer Applications")}
          </option>
          <option value="Volunteer Hours">
            {t("filter.volunteerHours", "Volunteer Hours")}
          </option>
        </select>
        <Button
          onClick={onExport}
          variant="secondary"
          className="flex items-center"
        >
          <Download className="h-4 w-4 mr-2" />
          {t("contributions.export")}
        </Button>
      </div>
    </div>
  );
}

/** Sortable table header for the contributions table. */
function ContributionsTableHeader({
  onSortByDate,
  onSortByType,
  onSortByOrganization,
  onSortByStatus,
  getSortIcon,
  t,
}: {
  onSortByDate: () => void;
  onSortByType: () => void;
  onSortByOrganization: () => void;
  onSortByStatus: () => void;
  getSortIcon: (
    _key: "date" | "type" | "status" | "organization",
  ) => React.ReactNode;
  t: (_key: string, _fallback?: string) => string;
}) {
  return (
    <thead>
      <tr>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
          onClick={onSortByDate}
        >
          <span className="flex items-center gap-1">
            {t("contributions.date")}
            {getSortIcon("date")}
          </span>
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
          onClick={onSortByType}
        >
          <span className="flex items-center gap-1">
            {t("contributions.type")}
            {getSortIcon("type")}
          </span>
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
          onClick={onSortByOrganization}
        >
          <span className="flex items-center gap-1">
            {t("contributions.organization")}
            {getSortIcon("organization")}
          </span>
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          {t("contributions.details")}
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-50 select-none"
          onClick={onSortByStatus}
        >
          <span className="flex items-center gap-1">
            {t("contributions.status")}
            {getSortIcon("status")}
          </span>
        </th>
        <th
          scope="col"
          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
        >
          {t("contributions.verification")}
        </th>
      </tr>
    </thead>
  );
}

/** Mission-specific minimal line-art: hand offering a heart-token for the donor empty state. */
function GivingHeartIllustration(): React.ReactElement {
  return (
    <svg
      width="120"
      height="96"
      viewBox="0 0 120 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="mx-auto text-emerald-500"
    >
      {/* Sparkles around heart */}
      <path
        d="M86 16 V20"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M96 24 L99 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      <path
        d="M76 24 L73 21"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.6"
      />
      {/* Heart outline (recipient) */}
      <path
        d="M86 52 L70 38 C64 32 64 22 70 16 C76 10 86 10 86 18 C86 10 96 10 102 16 C108 22 108 32 102 38 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Open hand offering from below-left */}
      <path
        d="M14 78 C14 70 22 64 30 66 L52 70 C56 71 58 74 57 78 L54 86 C53 90 49 92 45 91 L20 86 C16 85 14 82 14 78 Z"
        stroke="currentColor"
        strokeWidth="1.75"
        fill="none"
        strokeLinejoin="round"
      />
      <path
        d="M30 66 V58"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M38 68 V60"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M46 70 V63"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {/* Coin rising from hand toward heart */}
      <circle
        cx="62"
        cy="58"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        fill="currentColor"
        fillOpacity="0.15"
      />
      <path
        d="M62 56 V60"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M60 58 H64"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Empty state for the donor contributions table — invites a first donation. */
function ContributionsEmptyState({
  t,
}: {
  t: (_key: string, _fallback?: string) => string;
}): React.ReactElement {
  return (
    <div className="py-16 px-6 text-center">
      <GivingHeartIllustration />
      <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-6">
        {t("contributions.emptyTitle", "Your giving journey starts here")}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6">
        {t(
          "contributions.emptyDescription",
          "Donations and volunteer hours you log will appear here. Find a cause that matters to you to get started.",
        )}
      </p>
      <Link
        to="/browse"
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-[10px] shadow-cta hover:shadow-[0_4px_18px_rgba(5,150,105,0.5)] transform hover:-translate-y-0.5 transition-all"
      >
        {t("contributions.browseCharities", "Browse charities")}
      </Link>
    </div>
  );
}

/**
 * Donor dashboard displaying contributions, stats, and volunteer hours
 * @returns GiveDashboard page element
 */
export const GiveDashboard: React.FC = () => {
  const [_view, _setView] = useState<View>("select"); // Prefixed as unused
  const { user, userType } = useAuth();
  const { isConnected } = useWeb3();
  const location = useLocation();
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [showExportModal, setShowExportModal] = useState(false);
  const [showWalletSettings, setShowWalletSettings] = useState(false);
  const [showScheduledDonations, setShowScheduledDonations] = useState(false);
  const [showVolunteerHours, setShowVolunteerHours] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: "date" | "type" | "status" | "organization" | null;
    direction: "asc" | "desc";
  }>({ key: null, direction: "asc" });
  const { t } = useTranslation();

  // Real data hooks
  const { profile } = useProfile();
  const { data: stats, isLoading: statsLoading } = useUserContributionStats();
  const { data: rawContributions = [], isLoading: contribLoading } =
    useUnifiedContributions({
      userId: profile?.id,
    });

  const contributions = useMemo(
    () => rawContributions.map(mapContributionToTransaction),
    [rawContributions],
  );

  // Check if we should show wallet settings from location state
  useEffect(() => {
    if (location.state?.showWalletSettings) {
      setShowWalletSettings(true);
    }
  }, [location.state]);

  /**
   * Determines if a navigation path is currently active and returns appropriate CSS classes
   * @param _path - The path to check against current location (unused parameter)
   * @returns CSS classes for active or inactive navigation state
   */
  const _isActive = (
    _path: string, // Prefixed as unused
  ) =>
    location.pathname === _path
      ? "bg-primary-100 text-primary-900"
      : "text-gray-700 hover:bg-primary-50";

  const handleYearChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedYear(e.target.value);
    },
    [],
  );

  const handleTypeChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedType(e.target.value);
    },
    [],
  );

  const handleShowExportModal = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const toggleScheduledDonations = useCallback(() => {
    setShowScheduledDonations(!showScheduledDonations);
  }, [showScheduledDonations]);

  const toggleWalletSettings = useCallback(() => {
    setShowWalletSettings(!showWalletSettings);
  }, [showWalletSettings]);

  const toggleVolunteerHours = useCallback(() => {
    setShowVolunteerHours(!showVolunteerHours);
  }, [showVolunteerHours]);

  const handleAdminRedirect = useCallback(() => {
    window.location.href = `${window.location.origin}/admin`;
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

  const handleSortByDate = useCallback(() => {
    handleSort("date");
  }, [handleSort]);

  const handleSortByType = useCallback(() => {
    handleSort("type");
  }, [handleSort]);

  const handleSortByOrganization = useCallback(() => {
    handleSort("organization");
  }, [handleSort]);

  const handleSortByStatus = useCallback(() => {
    handleSort("status");
  }, [handleSort]);

  const handleCloseExportModal = useCallback(() => {
    setShowExportModal(false);
  }, []);

  const getSortIcon = useCallback(
    (key: "date" | "type" | "status" | "organization") => {
      if (sortConfig.key !== key) {
        return <ChevronUp className="h-4 w-4 text-gray-400" />;
      }
      return sortConfig.direction === "asc" ? (
        <ChevronUp className="h-4 w-4 text-gray-600" />
      ) : (
        <ChevronDown className="h-4 w-4 text-gray-600" />
      );
    },
    [sortConfig],
  );

  const filteredContributions = contributions
    .filter((contribution) => {
      const contributionDate = new Date(contribution.timestamp);
      const matchesYear =
        selectedYear === "all" ||
        contributionDate.getFullYear().toString() === selectedYear;
      const matchesType =
        selectedType === "all" || contribution.purpose === selectedType;
      return matchesYear && matchesType;
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aValue = getSortValue(a, sortConfig.key);
      const bValue = getSortValue(b, sortConfig.key);
      return compareValues(aValue, bValue, sortConfig.direction);
    });

  const years = [
    "all",
    ...new Set(
      contributions.map((c) => new Date(c.timestamp).getFullYear().toString()),
    ),
  ].sort((a, b) => b.localeCompare(a));

  // Allow access if user is authenticated OR wallet is connected
  if (!user && !isConnected) {
    return <Navigate to="/auth" />;
  }

  // Redirect charity users to charity portal
  if (userType === "charity") {
    return <Navigate to="/charity-portal" />;
  }

  // Show blank page for admin users - they should use /admin instead
  if (userType === "admin") {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            {t("dashboard.adminTitle", "Admin Dashboard")}
          </h2>
          <p className="text-gray-600 mb-6">
            {t(
              "dashboard.adminNote",
              "Please use the admin panel to manage the platform.",
            )}
          </p>
          <Button onClick={handleAdminRedirect}>
            {t("dashboard.adminButton", "Go to Admin Panel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <header className="mb-8 flex justify-between items-start">
        <hgroup>
          <h1 className="text-3xl font-bold text-gray-900">
            {t("dashboard.title")}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {t("dashboard.subtitle")}
          </p>
        </hgroup>
        <div className="flex space-x-3 flex-shrink-0">
          <Button
            variant="primary"
            onClick={toggleVolunteerHours}
            className="flex items-center"
          >
            <ClipboardList className="h-4 w-4 mr-2" />
            {showVolunteerHours
              ? t("dashboard.hideVolunteerHours", "Hide Volunteer Hours")
              : t("dashboard.logVolunteerHours", "Log Volunteer Hours")}
          </Button>
          <Button
            variant="ghost"
            onClick={toggleScheduledDonations}
            className="flex items-center border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {showScheduledDonations
              ? t("dashboard.hideMonthlyDonations", "Hide Monthly Donations")
              : t("dashboard.viewMonthlyDonations", "View Monthly Donations")}
          </Button>
          <Button
            variant="ghost"
            onClick={toggleWalletSettings}
            className="flex items-center border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t("dashboard.walletSettings", "Wallet Settings")}
          </Button>
        </div>
      </header>

      {showWalletSettings && (
        <div className="mb-8">
          <WalletAliasSettings />
        </div>
      )}

      {showScheduledDonations && (
        <div className="mb-8">
          <ScheduledDonations />
        </div>
      )}

      {showVolunteerHours && (
        <div className="mb-8">
          <SelfReportedHoursDashboard onToggle={toggleVolunteerHours} />
        </div>
      )}

      {/* Metrics Grid - Flattened from 4 to 3 levels */}
      {statsLoading || contribLoading ? (
        <div className="grid gap-6 mb-8 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <DashboardSkeletonCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 mb-8 md:grid-cols-3">
          <Card className="p-6 flex items-center">
            <span className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-emerald-100 to-emerald-200 mr-4">
              <DollarSign className="h-5 w-5 text-emerald-600" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.totalDonations")}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                <CurrencyDisplay
                  amount={
                    (stats?.totalDonated || 0) + (stats?.totalFiatDonated || 0)
                  }
                />
              </p>
            </div>
          </Card>

          <Card className="p-6 flex items-center">
            <span className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-green-100 to-green-200 mr-4">
              <Clock className="h-5 w-5 text-green-600" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.volunteerHours")}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.totalVolunteerHours || 0}
              </p>
            </div>
          </Card>

          <Card className="p-6 flex items-center">
            <span className="h-11 w-11 shrink-0 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-100 to-amber-200 mr-4">
              <Award className="h-5 w-5 text-amber-600" />
            </span>
            <div>
              <p className="text-sm font-medium text-gray-600">
                {t("dashboard.skillsEndorsed")}
              </p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats?.skillsEndorsed || 0}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Contributions - Flattened to reduce nesting */}
      <div className="bg-white rounded-lg shadow-md mb-8 overflow-x-auto">
        <ContributionsFilterBar
          selectedYear={selectedYear}
          selectedType={selectedType}
          years={years}
          onYearChange={handleYearChange}
          onTypeChange={handleTypeChange}
          onExport={handleShowExportModal}
          t={t}
        />
        {filteredContributions.length === 0 ? (
          <ContributionsEmptyState t={t} />
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">Contribution history</caption>
            <ContributionsTableHeader
              onSortByDate={handleSortByDate}
              onSortByType={handleSortByType}
              onSortByOrganization={handleSortByOrganization}
              onSortByStatus={handleSortByStatus}
              getSortIcon={getSortIcon}
              t={t}
            />
            <tbody className="divide-y divide-gray-200">
              {filteredContributions.map((contribution) => (
                <tr key={contribution.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(contribution.timestamp, true)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {t(
                      `contribution.type.${contribution.purpose.toLowerCase().replace(" ", "")}`,
                      contribution.purpose,
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contribution.metadata?.organization ||
                      t("common.unknown", "Unknown")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {contribution.purpose === "Fiat Donation" && (
                      <>
                        <CurrencyDisplay amount={contribution.amount || 0} />
                        {contribution.metadata?.disbursementStatus && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({contribution.metadata.disbursementStatus})
                          </span>
                        )}
                      </>
                    )}
                    {contribution.purpose === "Donation" && (
                      <>
                        {contribution.amount} {contribution.cryptoType} (
                        <CurrencyDisplay amount={contribution.fiatValue || 0} />
                        )
                      </>
                    )}
                    {contribution.purpose === "Volunteer Hours" && (
                      <>
                        {contribution.metadata?.hours} {t("volunteer.hours")} -{" "}
                        {contribution.metadata?.description}
                      </>
                    )}
                    {contribution.purpose !== "Fiat Donation" &&
                      contribution.purpose !== "Donation" &&
                      contribution.purpose !== "Volunteer Hours" &&
                      contribution.metadata?.opportunity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        {
                          completed: "bg-green-100 text-green-800",
                          pending: "bg-yellow-100 text-yellow-800",
                        }[contribution.status] || "bg-red-100 text-red-800"
                      }`}
                    >
                      {t(
                        `status.${contribution.status}`,
                        contribution.status.charAt(0).toUpperCase() +
                          contribution.status.slice(1),
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contribution.hash ||
                    contribution.metadata?.verificationHash ? (
                      <a
                        href={`https://moonscan.io/tx/${contribution.hash || contribution.metadata?.verificationHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-emerald-600 hover:text-emerald-900 flex items-center truncate max-w-[100px] mr-1"
                        title={
                          contribution.hash ||
                          contribution.metadata?.verificationHash
                        }
                      >
                        {(
                          contribution.hash ||
                          contribution.metadata?.verificationHash ||
                          ""
                        ).substring(0, 10)}
                        ...
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    ) : (
                      t("common.notAvailable", "N/A")
                    )}
                    {contribution.metadata?.blockNumber && (
                      <div className="text-xs text-gray-500 mt-1">
                        {t("blockchain.block", "Block")} #
                        {contribution.metadata.blockNumber}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Skills & Endorsements - placeholder data, gated behind a local-only
          demo flag so production never shows the hardcoded list. */}
      {ENV.SHOW_DEMO_SKILLS && (
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">
              {t("skills.endorsements", "Skills & Endorsements")}
            </h2>
          </div>
          <div className="p-6 grid gap-4 md:grid-cols-2">
            {[
              { skill: "Web Development", endorsements: 5 },
              { skill: "Project Management", endorsements: 3 },
              { skill: "Event Planning", endorsements: 4 },
            ].map((item) => (
              <Link
                key={item.skill}
                to="/contributions"
                state={{
                  activeTab: "volunteer",
                  section: "endorsements",
                  skill: item.skill,
                }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <h3 className="text-sm font-medium text-gray-900">
                    {item.skill}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.endorsements}{" "}
                    {t("skills.endorsements", "endorsements")}
                  </p>
                </div>
                <Award className="h-5 w-5 text-emerald-600" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <DonationExportModal
          donations={contributions}
          onClose={handleCloseExportModal}
        />
      )}
    </div>
  );
};

export default GiveDashboard;
