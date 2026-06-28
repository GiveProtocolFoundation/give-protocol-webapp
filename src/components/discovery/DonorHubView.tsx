import React, { useCallback, useMemo, useState } from "react";
import { DiscoveryShell } from "./DiscoveryShell";
import { DonorStatBar } from "./DonorStatBar";
import { DiscoveryFilters } from "./DiscoveryFilters";
import {
  emptyDiscoveryFilters,
  type DiscoveryFiltersState,
} from "./discoveryFiltersState";
import { ProjectCard } from "./ProjectCard";
import { DailyWisdomCard } from "./DailyWisdomCard";
import { NewsUpdatesCard } from "./NewsUpdatesCard";
import { FeaturedCausesCarousel } from "./FeaturedCausesCarousel";
import { FeaturedPortfolioFundsCarousel } from "./FeaturedPortfolioFundsCarousel";
import { DiscoveryTabs, useDiscoveryTab } from "./DiscoveryTabs";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDonorData } from "@/hooks/useDonorData";
import { useGivingStreak } from "@/hooks/useGivingStreak";
import { useScheduledDonations } from "@/hooks/useScheduledDonations";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import { useGeographicFilterParams } from "@/hooks/useGeographicFilterParams";

/**
 * Authenticated donor/volunteer landing for /browse. Personal impact stats sit
 * atop the tab bar, filter block, and a "Personalized for You" grid.
 * The right rail carries the Daily Wisdom card and platform news.
 */
export const DonorHubView: React.FC = () => {
  const { data } = useDonorData();
  const { count: activeRecurringGrants } = useScheduledDonations();
  const streak = useGivingStreak(data?.donations);
  const [activeTab, setActiveTab] = useDiscoveryTab();

  const initialFilters = useMemo<DiscoveryFiltersState>(() => {
    const firstCharity = data?.donations?.[0]?.charity;
    const hint = firstCharity?.split(" ")[0] ?? "";
    return {
      ...emptyDiscoveryFilters,
      searchTerm: hint.length >= 2 ? hint : "",
    };
  }, [data?.donations]);

  const [filters, setFilters] = useState<DiscoveryFiltersState>(initialFilters);

  const handleFiltersChange = useCallback((next: DiscoveryFiltersState) => {
    setFilters(next);
  }, []);

  const { filterState, filterCountry } = useGeographicFilterParams(
    filters.hqLocations,
    filters.impactLocations,
  );

  const effectiveCountry =
    filterCountry || (filters.searchTerm || filterState ? "" : "US");

  const { organizations, loading } = useCharityOrganizationSearch({
    searchTerm: filters.searchTerm,
    filterState,
    filterCountry: effectiveCountry,
    onPlatformOnly: filters.onPlatformOnly,
  });

  const hasHistoryHint = Boolean(initialFilters.searchTerm);

  const charitiesContent = (
    <>
      <section aria-label="Filter charities">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Personalized for You
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {hasHistoryHint
              ? "Based on your recent giving"
              : "Trending on the platform"}
          </p>
        </div>
        <DiscoveryFilters
          value={filters}
          onChange={handleFiltersChange}
          showViewToggle={false}
        />
      </section>

      <section aria-label="Charity results">
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 md:gap-8">
          {loading && organizations.length === 0 ? (
            <Skeleton className="h-72" count={6} />
          ) : (
            organizations.map((org) => (
              <ProjectCard key={org.ein} organization={org} />
            ))
          )}
        </div>
        {!loading && organizations.length === 0 && (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            No matches yet. Try a different search or clear your location
            filters.
          </div>
        )}
      </section>
    </>
  );

  const main = (
    <>
      <DiscoveryTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "charities" && charitiesContent}
      {activeTab === "causes" && <FeaturedCausesCarousel />}
      {activeTab === "funds" && <FeaturedPortfolioFundsCarousel />}
    </>
  );

  const rail = (
    <>
      <DailyWisdomCard />
      <NewsUpdatesCard />
    </>
  );

  return (
    <DiscoveryShell
      topBar={
        <DonorStatBar
          totalImpact={data?.totalDonated ?? 0}
          activeRecurringGrants={activeRecurringGrants}
          givingStreakMonths={streak}
        />
      }
      main={main}
      rail={rail}
    />
  );
};
