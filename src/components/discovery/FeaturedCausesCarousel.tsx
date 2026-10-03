import React, { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Target } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  useFeaturedCauses,
  type FeaturedCause,
} from "@/hooks/useFeaturedCauses";
import { useTranslation } from "@/hooks/useTranslation";
import { matchesQuery } from "@/utils/matchesQuery";
import { CarouselSearch } from "./CarouselSearch";
import { FeaturedCarousel } from "./FeaturedCarousel";

/** Progress bar showing raised vs target amount. */
function ProgressBar({ raised, target }: { raised: number; target: number }) {
  const pct = target > 0 ? Math.min((raised / target) * 100, 100) : 0;
  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className="bg-emerald-500 h-2 rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Cover image or placeholder shown at the top of a cause card. */
function CauseCoverImage({ imageUrl }: { imageUrl: string | null }) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <Target
        aria-hidden="true"
        className="h-12 w-12 text-gray-300 dark:text-gray-600"
      />
    </div>
  );
}

/** Pill displaying a cause's location with a map-pin icon. */
function LocationBadge({ location }: { location: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
      <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
      {location}
    </span>
  );
}

/** Row showing the raised amount and percentage of target. */
function RaisedStatsRow({
  raised,
  target,
  pct,
}: {
  raised: number;
  target: number;
  pct: number;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
      <span>
        ${raised.toLocaleString()} {t("browse.causes.raised", "raised")}
      </span>
      <span>
        {pct}
        {t("browse.causes.percentOf", "% of")} ${target.toLocaleString()}
      </span>
    </div>
  );
}

/** Single featured-cause card rendered inside a carousel page. */
function FeaturedCauseCard({ cause }: { cause: FeaturedCause }) {
  const { t } = useTranslation();
  const pct =
    cause.targetAmount > 0
      ? Math.round((cause.raisedAmount / cause.targetAmount) * 100)
      : 0;

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="relative aspect-[16/9] bg-gray-100 dark:bg-gray-800">
        <CauseCoverImage imageUrl={cause.imageUrl} />
        <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-900/90 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full shadow-sm">
          <Target aria-hidden="true" className="h-3.5 w-3.5" />
          {t("browse.causes.badge", "Cause")}
        </span>
      </div>

      <div className="flex flex-col flex-1 p-6">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
            {cause.category}
          </span>
          {cause.location && <LocationBadge location={cause.location} />}
        </div>

        <Link
          to={`/causes/${cause.id}`}
          className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight hover:text-emerald-700 dark:hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
        >
          {cause.name}
        </Link>

        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t("browse.causes.by", "by")} {cause.charityName}
        </p>

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
          {cause.description}
        </p>

        <div className="mt-auto pt-4 space-y-2">
          <ProgressBar
            raised={cause.raisedAmount}
            target={cause.targetAmount}
          />
          <RaisedStatsRow
            raised={cause.raisedAmount}
            target={cause.targetAmount}
            pct={pct}
          />
          <Link
            to={`/causes/${cause.id}`}
            className="w-full inline-flex items-center justify-center rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            {t("browse.causes.supportCta", "Support This Cause")}
          </Link>
        </div>
      </div>
    </Card>
  );
}

interface FeaturedCausesCarouselProps {
  heading?: string;
  subheading?: string;
}

/** Stable React key for a cause card. */
const getCauseKey = (cause: FeaturedCause) => cause.id;

/**
 * Carousel of active causes with progress indicators and a client-side search
 * over the loaded causes.
 * @param props - Optional heading and subheading overrides
 * @returns The carousel with empty / error states
 */
export const FeaturedCausesCarousel: React.FC<FeaturedCausesCarouselProps> = ({
  heading,
  subheading,
}) => {
  const { t } = useTranslation();
  const { causes, loading, error } = useFeaturedCauses();
  const [query, setQuery] = useState("");

  const filtered = useMemo(
    () =>
      causes.filter((cause) =>
        matchesQuery(query, [
          cause.name,
          cause.description,
          cause.category,
          cause.charityName,
          cause.location,
        ]),
      ),
    [causes, query],
  );

  const renderCard = useCallback(
    (cause: FeaturedCause) => <FeaturedCauseCard cause={cause} />,
    [],
  );

  const searchPlaceholder = t(
    "browse.causes.searchPlaceholder",
    "Search causes...",
  );
  const hasQuery = query.trim().length > 0;
  const toolbar =
    causes.length > 0 ? (
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
      getKey={getCauseKey}
      renderCard={renderCard}
      heading={heading ?? t("browse.causes.heading", "Featured causes")}
      subheading={
        subheading ??
        t(
          "browse.causes.subheading",
          "Support specific projects making real impact.",
        )
      }
      ariaLabel={t("browse.causes.ariaLabel", "Featured causes")}
      prevLabel={t("browse.causes.prevAria", "Previous featured causes")}
      nextLabel={t("browse.causes.nextAria", "Next featured causes")}
      emptyIcon={<Target className="h-12 w-12" />}
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
              "browse.causes.empty",
              "No causes available yet. Check back soon!",
            )
      }
      toolbar={toolbar}
    />
  );
};
