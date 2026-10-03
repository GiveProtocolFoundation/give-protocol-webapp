import React, { useCallback } from "react";
import { Building2 } from "lucide-react";
import {
  useFeaturedCharities,
  type FeaturedCharity,
} from "@/hooks/useFeaturedCharities";
import { useTranslation } from "@/hooks/useTranslation";
import { CharityDiscoveryCard } from "./CharityDiscoveryCard";
import { FeaturedCarousel } from "./FeaturedCarousel";

interface FeaturedCharitiesCarouselProps {
  /** Copy shown above the carousel. */
  heading?: string;
  subheading?: string;
}

/** Stable React key for a charity card. */
const getCharityKey = (charity: FeaturedCharity) => charity.profileId;

/**
 * Carousel of verified platform charities with complete profiles. Shows an
 * explicit empty or error state instead of rendering nothing, so a fresh
 * database or failed fetch is never mistaken for a broken page.
 * @param props - Optional heading and subheading overrides
 * @returns The carousel
 */
export const FeaturedCharitiesCarousel: React.FC<
  FeaturedCharitiesCarouselProps
> = ({ heading, subheading }) => {
  const { t } = useTranslation();
  const { charities, loading, error } = useFeaturedCharities();

  const renderCard = useCallback(
    (charity: FeaturedCharity) => (
      <CharityDiscoveryCard
        name={charity.name}
        detailHref={`/charity/${charity.profileId}`}
        isClaimed={charity.isClaimed}
        registrySource={charity.registrySource}
        platformVerified
        category={{ key: charity.categoryKey, label: charity.category }}
        location={charity.location}
        description={charity.description}
        coverUrl={charity.imageUrl}
      />
    ),
    [],
  );

  return (
    <FeaturedCarousel
      items={charities}
      loading={loading}
      error={error}
      getKey={getCharityKey}
      renderCard={renderCard}
      heading={
        heading ?? t("browse.featured.heading", "Featured organizations")
      }
      subheading={
        subheading ??
        t(
          "browse.featured.subheading",
          "A rotating look at verified charities on Give Protocol.",
        )
      }
      ariaLabel={t("browse.featured.ariaLabel", "Featured organizations")}
      prevLabel={t(
        "browse.featured.prevAria",
        "Previous featured organizations",
      )}
      nextLabel={t("browse.featured.nextAria", "Next featured organizations")}
      emptyIcon={<Building2 className="h-12 w-12" />}
      emptyMessage={t(
        "browse.featured.empty",
        "No featured organizations yet. Use the search above to find a charity.",
      )}
    />
  );
};
