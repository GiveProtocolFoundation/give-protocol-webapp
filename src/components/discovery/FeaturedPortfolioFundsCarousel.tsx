import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Heart, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  useFeaturedPortfolioFunds,
  type FeaturedPortfolioFund,
} from "@/hooks/useFeaturedPortfolioFunds";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/hooks/useTranslation";

const AUTO_ADVANCE_MS = 6000;
const CARDS_PER_PAGE = 3;

/** Splits an array into fixed-size groups for carousel pagination. */
function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/** Single featured-fund card rendered inside a carousel page. */
function FeaturedFundCard({ fund }: { fund: FeaturedPortfolioFund }) {
  const { t } = useTranslation();
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
        {fund.imageUrl ? (
          <img
            src={fund.imageUrl}
            alt={`${fund.name} cover`}
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

/**
 * Auto-advancing carousel of portfolio funds curated by admins.
 * Pauses on hover/focus; supports arrow navigation and dot indicators.
 * @param props - Optional heading and subheading overrides
 * @returns Carousel component or null when no funds exist
 */
export const FeaturedPortfolioFundsCarousel: React.FC<
  FeaturedPortfolioFundsCarouselProps
> = ({ heading, subheading }) => {
  const { t } = useTranslation();
  const displayHeading =
    heading ?? t("browse.funds.heading", "Portfolio Funds");
  const displaySubheading =
    subheading ??
    t(
      "browse.funds.subheading",
      "Curated giving portfolios that distribute donations across verified charities.",
    );
  const { funds, loading } = useFeaturedPortfolioFunds();
  const [pageIndex, setPageIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const pages = useMemo(() => chunk(funds, CARDS_PER_PAGE), [funds]);

  useEffect(() => {
    setPageIndex((current) =>
      pages.length === 0 ? 0 : current % pages.length,
    );
  }, [pages.length]);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (paused || pages.length <= 1) return undefined;
    intervalRef.current = setInterval(() => {
      setPageIndex((current) => (current + 1) % pages.length);
    }, AUTO_ADVANCE_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused, pages.length]);

  const handlePrev = useCallback(() => {
    setPageIndex((current) =>
      pages.length === 0 ? 0 : (current - 1 + pages.length) % pages.length,
    );
  }, [pages.length]);

  const handleNext = useCallback(() => {
    setPageIndex((current) =>
      pages.length === 0 ? 0 : (current + 1) % pages.length,
    );
  }, [pages.length]);

  const handlePause = useCallback(() => setPaused(true), []);
  const handleResume = useCallback(() => setPaused(false), []);

  const handleDotClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const index = Number.parseInt(
        event.currentTarget.dataset.index ?? "0",
        10,
      );
      if (!Number.isNaN(index)) setPageIndex(index);
    },
    [],
  );

  if (loading) {
    return (
      <section aria-label={t("browse.funds.ariaLabel", "Portfolio Funds")}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {displayHeading}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {displaySubheading}
          </p>
        </div>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 md:gap-8">
          <Skeleton className="h-80" count={CARDS_PER_PAGE} />
        </div>
      </section>
    );
  }

  if (pages.length === 0) {
    return (
      <section aria-label={t("browse.funds.ariaLabel", "Portfolio Funds")}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {displayHeading}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {displaySubheading}
          </p>
        </div>
        <div className="text-center py-16 text-gray-500 dark:text-gray-400">
          <Heart className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
          <p>
            {t(
              "browse.funds.empty",
              "No portfolio funds available yet. Check back soon!",
            )}
          </p>
        </div>
      </section>
    );
  }

  const activePage = pages[pageIndex] ?? pages[0];
  const showNav = pages.length > 1;

  return (
    <section
      aria-label={t("browse.funds.ariaLabel", "Portfolio Funds")}
      aria-roledescription="carousel"
      aria-live="polite"
      onMouseEnter={handlePause}
      onMouseLeave={handleResume}
      onFocus={handlePause}
      onBlur={handleResume}
    >
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {displayHeading}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {displaySubheading}
          </p>
        </div>
        {showNav && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              aria-label={t(
                "browse.funds.prevAria",
                "Previous portfolio funds",
              )}
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={t("browse.funds.nextAria", "Next portfolio funds")}
              className="inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 md:gap-8">
        {activePage.map((fund) => (
          <FeaturedFundCard key={fund.id} fund={fund} />
        ))}
      </div>

      {showNav && (
        <div className="mt-5 flex justify-center gap-2" aria-hidden="true">
          {pages.map((page, index) => (
            <button
              key={`page-${page[0]?.id ?? index}`}
              type="button"
              data-index={index}
              tabIndex={-1}
              onClick={handleDotClick}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === pageIndex
                  ? "bg-emerald-600 w-6"
                  : "bg-gray-300 dark:bg-gray-700 w-1.5",
              )}
            />
          ))}
        </div>
      )}
    </section>
  );
};
