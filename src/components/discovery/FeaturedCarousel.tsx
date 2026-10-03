import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/hooks/useTranslation";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const AUTO_ADVANCE_MS = 6000;
const CARDS_PER_PAGE = 3;

const GRID_CLASS =
  "grid grid-cols-[repeat(auto-fill,minmax(320px,1fr))] gap-6 md:gap-8";

const NAV_BUTTON_CLASS =
  "inline-flex items-center justify-center h-9 w-9 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 hover:border-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2";

/**
 * Splits an array into fixed-size groups for carousel pagination.
 * @param items - Items to paginate
 * @param size - Items per page
 * @returns Array of pages
 */
function chunk<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

interface FeaturedCarouselProps<T> {
  items: T[];
  loading: boolean;
  /** Non-null when the fetch failed; shown instead of the empty message. */
  error: string | null;
  getKey: (_item: T) => string;
  renderCard: (_item: T) => ReactNode;
  heading: string;
  subheading: string;
  ariaLabel: string;
  prevLabel: string;
  nextLabel: string;
  /** Icon shown above the empty / error message. */
  emptyIcon: ReactNode;
  emptyMessage: string;
  /** Optional controls (e.g. a search box) rendered between header and cards. */
  toolbar?: ReactNode;
}

/**
 * Paginated card carousel shared by the Charities, Causes and Portfolio Funds
 * tabs. Auto-advance is opt-out: it never runs for users who prefer reduced
 * motion, pauses on hover/focus, and can be paused with a visible button
 * (WCAG 2.2.2). The live region is silenced while rotating so screen readers
 * are not interrupted.
 * @param props - Items, render callbacks and labels
 * @returns The carousel, or loading / empty / error states
 */
export function FeaturedCarousel<T>({
  items,
  loading,
  error,
  getKey,
  renderCard,
  heading,
  subheading,
  ariaLabel,
  prevLabel,
  nextLabel,
  emptyIcon,
  emptyMessage,
  toolbar,
}: FeaturedCarouselProps<T>): React.ReactElement {
  const { t } = useTranslation();
  const reducedMotion = usePrefersReducedMotion();
  const [pageIndex, setPageIndex] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const pages = useMemo(() => chunk(items, CARDS_PER_PAGE), [items]);
  const pageCount = pages.length;
  const showNav = pageCount > 1;
  const autoplaying =
    showNav && !userPaused && !hovered && !focused && !reducedMotion;

  // Keep the page index valid when the data set shrinks (e.g. while searching).
  useEffect(() => {
    setPageIndex((current) => (pageCount === 0 ? 0 : current % pageCount));
  }, [pageCount]);

  useEffect(() => {
    if (!autoplaying) return undefined;
    const timer = setInterval(() => {
      setPageIndex((current) => (current + 1) % pageCount);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [autoplaying, pageCount]);

  const handlePrev = useCallback(() => {
    setPageIndex((current) =>
      pageCount === 0 ? 0 : (current - 1 + pageCount) % pageCount,
    );
  }, [pageCount]);

  const handleNext = useCallback(() => {
    setPageIndex((current) =>
      pageCount === 0 ? 0 : (current + 1) % pageCount,
    );
  }, [pageCount]);

  const handleTogglePause = useCallback(() => {
    setUserPaused((current) => !current);
  }, []);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback((event: React.FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setFocused(false);
    }
  }, []);

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

  const header = (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {heading}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">{subheading}</p>
    </div>
  );

  if (loading) {
    return (
      <section aria-label={ariaLabel} aria-busy="true">
        {header}
        {toolbar}
        <div className={GRID_CLASS}>
          <Skeleton className="h-80" count={CARDS_PER_PAGE} />
        </div>
      </section>
    );
  }

  if (pageCount === 0) {
    const message =
      error !== null
        ? t(
            "browse.carousel.error",
            "We couldn't load this section. Please refresh the page to try again.",
          )
        : emptyMessage;
    return (
      <section aria-label={ariaLabel}>
        {header}
        {toolbar}
        <div
          role={error !== null ? "alert" : "status"}
          className="text-center py-16 text-gray-500 dark:text-gray-400"
        >
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex justify-center text-gray-300 dark:text-gray-600"
          >
            {emptyIcon}
          </div>
          <p>{message}</p>
        </div>
      </section>
    );
  }

  const activePage = pages[pageIndex] ?? pages[0];

  return (
    <section
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      <div className="flex items-end justify-between gap-4">
        {header}
        {showNav && (
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePause}
              aria-pressed={userPaused || reducedMotion}
              disabled={reducedMotion}
              aria-label={
                userPaused || reducedMotion
                  ? t("browse.carousel.play", "Resume automatic rotation")
                  : t("browse.carousel.pause", "Pause automatic rotation")
              }
              className={cn(NAV_BUTTON_CLASS, "disabled:opacity-50")}
            >
              {userPaused || reducedMotion ? (
                <Play aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Pause aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={handlePrev}
              aria-label={prevLabel}
              className={NAV_BUTTON_CLASS}
            >
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              aria-label={nextLabel}
              className={NAV_BUTTON_CLASS}
            >
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {toolbar}

      <div
        role="group"
        aria-roledescription="slide"
        aria-live={autoplaying ? "off" : "polite"}
        aria-label={t(
          "browse.carousel.pageLabel",
          "Page {{current}} of {{total}}",
          {
            current: pageIndex + 1,
            total: pageCount,
          },
        )}
        className={GRID_CLASS}
      >
        {activePage.map((item) => (
          <div key={getKey(item)}>{renderCard(item)}</div>
        ))}
      </div>

      {showNav && (
        <div className="mt-3 flex justify-center">
          {pages.map((page, index) => (
            <button
              key={`page-${getKey(page[0])}`}
              type="button"
              data-index={index}
              onClick={handleDotClick}
              aria-label={t("browse.carousel.goToPage", "Go to page {{page}}", {
                page: index + 1,
              })}
              aria-current={index === pageIndex ? "true" : undefined}
              className="group inline-flex h-6 w-6 items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-1.5 rounded-full transition-all",
                  index === pageIndex
                    ? "bg-emerald-600 w-6"
                    : "bg-gray-300 dark:bg-gray-700 w-1.5 group-hover:bg-gray-400",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
