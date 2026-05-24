import React, { useCallback } from "react";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import { CharityOrganizationCard } from "./CharityOrganizationCard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/hooks/useTranslation";

interface CharityGridProps {
  searchTerm: string;
  filterState: string;
  filterCountry: string;
  onPlatformOnly: boolean;
  className?: string;
}

/**
 * Grid of charity organization cards with server-side search and pagination.
 * @param props - Search term, state/country filters, on-platform toggle, and optional className
 * @returns The rendered grid component
 */
export const CharityGrid: React.FC<CharityGridProps> = ({
  searchTerm,
  filterState,
  filterCountry,
  onPlatformOnly,
  className,
}) => {
  const { t } = useTranslation();
  const { organizations, loading, hasMore, error, loadMore } =
    useCharityOrganizationSearch({
      searchTerm,
      filterState,
      filterCountry,
      onPlatformOnly,
    });

  const handleLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  const hasInput =
    searchTerm.trim().length >= 2 ||
    Boolean(filterState) ||
    Boolean(filterCountry);

  if (!hasInput && !loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          {t(
            "browse.charity.searchPrompt",
            "Enter a search term or add a location filter to find charities.",
          )}
        </p>
      </div>
    );
  }

  if (loading && organizations.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          {t(
            "browse.charity.noResults",
            "No charities found matching your criteria.",
          )}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div
        className={cn("grid gap-6 md:grid-cols-2 lg:grid-cols-3", className)}
      >
        {organizations.map((org) => (
          <CharityOrganizationCard key={org.ein} organization={org} />
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center mt-8">
          <Button
            variant="secondary"
            onClick={handleLoadMore}
            disabled={loading}
          >
            {loading
              ? t("browse.charity.loading", "Loading...")
              : t("browse.charity.loadMore", "Load More")}
          </Button>
        </div>
      )}
    </div>
  );
};
