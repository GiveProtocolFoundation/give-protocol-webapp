import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  useFeaturedPortfolioFunds,
  type FeaturedPortfolioFund,
} from "@/hooks/useFeaturedPortfolioFunds";
import { useTranslation } from "@/hooks/useTranslation";
import { matchesQuery } from "@/utils/matchesQuery";
import { CarouselSearch } from "./CarouselSearch";
import { FeaturedCarousel } from "./FeaturedCarousel";

/** Single featured-fund card rendered inside a carousel page. */
function FeaturedFundCard({ fund }: { fund: FeaturedPortfolioFund }) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
        {fund.imageUrl ? (
          <img
            src={fund.imageUrl}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-emerald-950/40 dark:to-teal-950/40">
            <Heart
              aria-hidden="true"
              className="h-12 w-12 text-emerald-300 dark:text-emerald-600"
            />
          </div>
        )}
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-900/90 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full shadow-sm">
          <Heart aria-hidden="true" className="h-3.5 w-3.5" />
          {t("browse.funds.badge", "Portfolio Fund")}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-2">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            {fund.category}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Users aria-hidden="true" className="h-3.5 w-3.5" />
            {fund.charityCount}{" "}
            {fund.charityCount === 1
              ? t("browse.funds.charity", "charity")
              : t("browse.funds.charities", "charities")}
          </span>
        </div>

        <Link
          to={`/portfolio/${fund.id}`}
          className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight hover:text-emerald-700 dark:hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
        >
          {fund.name}
        </Link>

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
          {fund.description}
        </p>

        <div className="mt-auto pt-5">
          <Link
            to={`/portfolio/${fund.id}`}
            className="w-full inline-flex items-center justify-center rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            {t("browse.funds.donateCta", "Donate to Fund")}
          </Link>
        </div>
      </div>
    </Card>
  );
}

interface FeaturedPortfolioFundsCarouselProps {
  heading?: string;
  subheading?: string;
}

const getFundKey = (fund: FeaturedPortfolioFund) => fund.id;

/**
 * Carousel of portfolio funds curated by admins, with a client-side search over
 * the loaded funds.
 * @param props - Optional heading and subheading overrides
 * @returns The carousel with empty / error states
 */
export const FeaturedPortfolioFundsCarousel: React.FC<
  FeaturedPortfolioFundsCarouselProps
> = ({ heading, subheading }) => {
  const { t } = useTranslation();
  const { funds, loading, error } = useFeaturedPortfolioFunds();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      funds.filter((fund) =>
        matchesQuery(query, [fund.name, fund.description, fund.category]),
      ),
    [funds, query],
  );

  const renderCard = useCallback(
    (fund: FeaturedPortfolioFund) => <FeaturedFundCard fund={fund} />,
    [],
  );

  const searchPlaceholder = t(
    "browse.funds.searchPlaceholder",
    "Search portfolio funds...",
  );
  const hasQuery = query.trim().length > 0;
  const toolbar =
    funds.length > 0 ? (
      <CarouselSearch
        value={query}
        onChange={setQuery}
        placeholder={searchPlaceholder}
      />
    ) : undefined;

  return (
    <FeaturedCarousel
      items={filtered}
      loading={loading}
      error={error}
      getKey={getFundKey}
      renderCard={renderCard}
      heading={heading ?? t("browse.funds.heading", "Portfolio Funds")}
      subheading={
        subheading ??
        t(
          "browse.funds.subheading",
          "Curated giving portfolios that distribute donations across verified charities.",
        )
      }
      ariaLabel={t("browse.funds.ariaLabel", "Portfolio Funds")}
      prevLabel={t("browse.funds.prevAria", "Previous portfolio funds")}
      nextLabel={t("browse.funds.nextAria", "Next portfolio funds")}
      emptyIcon={<Heart className="h-12 w-12" />}
      emptyMessage={
        hasQuery
          ? t(
              "browse.search.noMatches",
              "Nothing matches \u201c{{query}}\u201d.",
              {
                query: query.trim(),
              },
            )
          : t(
              "browse.funds.empty",
              "No portfolio funds available yet. Check back soon!",
            )
      }
      toolbar={toolbar}
    />
  );
};
