import React, { useCallback, useState } from "react";
import { DiscoveryShell } from "./DiscoveryShell";
import { DiscoveryFilters } from "./DiscoveryFilters";
import {
  emptyDiscoveryFilters,
  type DiscoveryFiltersState,
} from "./discoveryFiltersState";
import { ProjectCard } from "./ProjectCard";
import { WhyGiveProtocolRail } from "./WhyGiveProtocolRail";
import { NewsUpdatesCard } from "./NewsUpdatesCard";
import { FeaturedCharitiesCarousel } from "./FeaturedCharitiesCarousel";
import { FeaturedCausesCarousel } from "./FeaturedCausesCarousel";
import { FeaturedPortfolioFundsCarousel } from "./FeaturedPortfolioFundsCarousel";
import { DiscoveryTabs, useDiscoveryTab } from "./DiscoveryTabs";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import { useGeographicFilterParams } from "@/hooks/useGeographicFilterParams";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Unauthenticated /browse landing. A split hero with a headline sits above the
 * tab bar, filter block, and a responsive discovery grid.
 * The right rail carries a "Why Give Protocol" explainer plus platform news.
 */
export const PublicDiscoveryView: React.FC = () => {
  const [activeTab, setActiveTab] = useDiscoveryTab();
  const [filters, setFilters] = useState<DiscoveryFiltersState>(
    emptyDiscoveryFilters,
  );

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

  const handleFiltersChange = useCallback((next: DiscoveryFiltersState) => {
    setFilters(next);
  }, []);

  const hasActiveFilter =
    filters.searchTerm.trim().length >= 2 ||
    filters.impactLocations.length > 0 ||
    filters.hqLocations.length > 0 ||
    filters.onPlatformOnly;

  const HeroContent = () => (
    <div>
      <p className="text-sm font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
        Give Protocol
      </p>
      <h1 className="mt-2 text-4xl md:text-5xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-[1.1]">
        Giving, verified on-chain.
      </h1>
      <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl">
        Discover verified nonprofits, donate with crypto or card, and trace
        your impact from wallet to cause.
      </p>
    </div>
  );

  const StatItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </dd>
    </div>
  );

  const HeroStats = () => (
    <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-gray-900 dark:to-teal-950/40 p-6 md:p-8">
      <dl className="grid grid-cols-2 gap-6">
        <StatItem label="Networks supported" value="3+" />
        <StatItem label="Verified donations" value="10k+" />
      </dl>
    </div>
  );

  const hero = (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-center">
      <HeroContent />
      <HeroStats />
    </div>
  );
              Charitable sectors
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
              7
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Verified organizations
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
              On-chain
            </dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Volunteer hours
            </dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
              Verified
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );

  const charitiesContent = (
    <>
      <section
        id="discover"
        aria-label="Filter charities"
        className="scroll-mt-8"
      >
        <DiscoveryFilters
          value={filters}
          onChange={handleFiltersChange}
          showViewToggle={false}
        />
      </section>

      {hasActiveFilter ? (
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
              No organizations match that search yet. Try a different keyword or
              add a location filter.
            </div>
          )}
        </section>
      ) : (
        <FeaturedCharitiesCarousel />
      )}
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
      <WhyGiveProtocolRail />
      <NewsUpdatesCard />
    </>
  );

  return <DiscoveryShell topBar={hero} main={main} rail={rail} />;
};
