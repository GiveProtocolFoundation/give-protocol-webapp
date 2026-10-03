import React, { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/hooks/useTranslation";
import { DEFAULT_CHARITY_COVER } from "@/utils/charityAssets";
import type { NteeCategory } from "@/utils/nteeCategories";
import { RegistryBadge } from "./RegistryBadge";

/** Primary full-width CTA treatment for donation-ready (claimed) charities. */
const PRIMARY_CTA_CLASS =
  "w-full inline-flex items-center justify-center rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2";

/** De-emphasized secondary CTA for unclaimed charities (GIV-1012). */
const SECONDARY_CTA_CLASS =
  "w-full inline-flex items-center justify-center rounded-[10px] border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 text-sm font-medium px-4 py-2.5 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2";

interface CharityDiscoveryCardProps {
  name: string;
  /** Profile page for the charity. */
  detailHref: string;
  /** True when the profile has been claimed and can receive donations. */
  isClaimed: boolean;
  /** Registry the charity was listed in, for the trust badge. */
  registrySource: string | null | undefined;
  /** Render a generic "Verified" badge when the registry is unknown. */
  platformVerified?: boolean;
  category?: NteeCategory;
  location?: string;
  description?: string;
  /** Pre-formatted identifier line (e.g. "Tax ID: 12-3456789"). */
  identifier?: string;
  /** Cover photo URL; omitted → branded placeholder. */
  coverUrl?: string;
  /** Show the "On Platform" pill beside the category. */
  onPlatform?: boolean;
}

/** Cover photo that swaps to the branded default when loading fails. Decorative. */
function CardCover({ url }: { url: string }) {
  const [failed, setFailed] = useState(false);
  const handleError = useCallback(() => setFailed(true), []);

  return (
    <img
      src={failed ? DEFAULT_CHARITY_COVER : url}
      alt=""
      loading="lazy"
      onError={failed ? undefined : handleError}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

interface CardMetaProps {
  category?: NteeCategory;
  onPlatform: boolean;
  location?: string;
}

/** Category pill, "On Platform" pill and location shown above the card title. */
function CardMeta({ category, onPlatform, location }: CardMetaProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {category && (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
          {t(category.key, category.label)}
        </span>
      )}
      {onPlatform && (
        <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          {t("browse.charity.onPlatform", "On Platform")}
        </span>
      )}
      {location && (
        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <MapPin aria-hidden="true" className="h-3.5 w-3.5" />
          {location}
        </span>
      )}
    </div>
  );
}

/**
 * Shared charity card for the /browse discovery surfaces (featured carousel and
 * search results) so both read as the same product. Claimed charities get the
 * primary Donate CTA; unclaimed ones get a de-emphasized View profile CTA
 * because their profile cannot receive donations until claimed (GIV-1012).
 * @param props - Card content
 * @returns The rendered card
 */
export const CharityDiscoveryCard: React.FC<CharityDiscoveryCardProps> = ({
  name,
  detailHref,
  isClaimed,
  registrySource,
  platformVerified = false,
  category,
  location,
  description,
  identifier,
  coverUrl,
  onPlatform = false,
}) => {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <div className="relative aspect-[16/9] bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-50 dark:from-emerald-900/40 dark:via-teal-900/30 dark:to-emerald-950/40">
        {coverUrl ? (
          <CardCover url={coverUrl} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2
              aria-hidden="true"
              className="h-12 w-12 text-emerald-600/70 dark:text-emerald-400/70"
            />
          </div>
        )}
        <RegistryBadge
          registrySource={registrySource}
          platformVerified={platformVerified}
          className="absolute top-3 left-3"
        />
      </div>

      <div className="flex flex-col flex-1 p-6">
        <CardMeta
          category={category}
          onPlatform={onPlatform}
          location={location}
        />

        <Link
          to={detailHref}
          className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight hover:text-emerald-700 dark:hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
        >
          {name}
        </Link>

        {description && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {description}
          </p>
        )}

        {identifier && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            {identifier}
          </p>
        )}

        <div className="mt-auto pt-5">
          {isClaimed ? (
            <Link
              to={`${detailHref}?action=donate`}
              className={PRIMARY_CTA_CLASS}
            >
              {t("browse.donate", "Donate")}
            </Link>
          ) : (
            <Link to={detailHref} className={SECONDARY_CTA_CLASS}>
              {t("browse.viewProfile", "View profile")}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
};
