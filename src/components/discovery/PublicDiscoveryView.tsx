import React, { useCallback, useState } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { DiscoveryShell } from "./DiscoveryShell";
import { DiscoveryFilters } from "./DiscoveryFilters";
import {
  emptyDiscoveryFilters,
  type DiscoveryFiltersState,
} from "./discoveryFiltersState";
import { ProjectCard } from "./ProjectCard";
import { WhyGiveProtocolRail } from "./WhyGiveProtocolRail";
import { NewsUpdatesCard } from "./NewsUpdatesCard";
import { HeroStats } from "./HeroStats";
import { FeaturedCharitiesCarousel } from "./FeaturedCharitiesCarousel";
import { FeaturedCausesCarousel } from "./FeaturedCausesCarousel";
import { FeaturedPortfolioFundsCarousel } from "./FeaturedPortfolioFundsCarousel";
import {
  DiscoveryTabs,
  getDiscoveryPanelId,
  getDiscoveryTabId,
  useDiscoveryTab,
} from "./DiscoveryTabs";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import { useGeographicFilterParams } from "@/hooks/useGeographicFilterParams";
import { Skeleton } from "@/components/ui/Skeleton";

/** Minimum characters before a search term counts as an active filter. */
const MIN_SEARCH_CHARS = 2;

/**
 * Unauthenticated /browse landing. A split hero with a headline sits above the
 * tab bar, filter block, and a responsive discovery grid.
 * The right rail carries a "Why Give Protocol" explainer plus platform news.
 */
export const PublicDiscoveryView: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useDiscoveryTab();
  const [filters, setFilters] = useState<DiscoveryFiltersState>(
    emptyDiscoveryFilters,
  );

  const { filterState, filterCountry } = useGeographicFilterParams(
    filters.hqLocations,
    filters.impactLocations,
  );

  // Only filters the backend actually applies count as "active": a search term
  // or an HQ location. Results are never silently restricted to one country.
  const hasActiveFilter =
    filters.searchTerm.trim().length >= MIN_SEARCH_CHARS ||
    filters.hqLocations.length > 0;

  const { organizations, loading, hasMore, error, loadMore } =
    useCharityOrganizationSearch({
      searchTerm: filters.searchTerm,
      filterState,
      filterCountry,
      onPlatformOnly: filters.onPlatformOnly,
    });

  const handleFiltersChange = useCallback((next: DiscoveryFiltersState) => {
    setFilters(next);
  }, []);

  const hero = (
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 lg:gap-12 items-center">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
          {t("app.name", "Give Protocol")}
        </p>
        <h1 className="mt-2 text-4xl md:text-5xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight leading-[1.1]">
          {t("browse.hero.title", "Transparent giving. Measurable change.")}
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 max-w-xl">
          {t(
            "browse.hero.subtitle",
            "Discover vetted causes, contribute via card or digital assets, and see the tangible footprint of your time and resources.",
          )}
        </p>
      </div>

      <HeroStats />
    </div>
  );

  const charitiesContent = (
    <>
      <section
        id="discover"
        aria-label={t("browse.filter.ariaLabel", "Filter charities")}
        className="scroll-mt-8"
      >
        <DiscoveryFilters value={filters} onChange={handleFiltersChange} />
      </section>

      {hasActiveFilter ? (
        <section aria-label={t("browse.results.ariaLabel", "Charity results")}>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 md:gap-8">
            {loading && organizations.length === 0 ? (
              <Skeleton className="h-72" count={6} />
            ) : (
              organizations.map((org) => (
                <ProjectCard key={org.ein} organization={org} />
              ))
            )}
          </div>
          {error !== null && (
            <div
              role="alert"
              className="text-center py-16 text-red-600 dark:text-red-400"
            >
              {t(
                "browse.results.error",
                "We couldn't run that search. Please try again.",
              )}
            </div>
          )}
          {error === null && !loading && organizations.length === 0 && (
            <div
              role="status"
              className="text-center py-16 text-gray-500 dark:text-gray-400"
            >
              {t(
                "browse.results.empty",
                "No organizations match that search yet. Try a different keyword or add a location filter.",
              )}
            </div>
          )}
          {hasMore && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-[10px] border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm font-medium px-6 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                {loading
                  ? t("browse.charity.loading", "Loading\u2026")
                  : t("browse.charity.loadMore", "Load More")}
              </button>
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

      <div
        role="tabpanel"
        id={getDiscoveryPanelId(activeTab)}
        aria-labelledby={getDiscoveryTabId(activeTab)}
        className="space-y-8"
      >
        {activeTab === "charities" && charitiesContent}
        {activeTab === "causes" && <FeaturedCausesCarousel />}
        {activeTab === "funds" && <FeaturedPortfolioFundsCarousel />}
      </div>
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
