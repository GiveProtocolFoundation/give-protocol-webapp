import React from "react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  CONFIGURED_NETWORK_COUNT,
  usePlatformStats,
} from "@/hooks/usePlatformStats";

/** Placeholder shown until a real figure is available (never an invented one). */
const UNAVAILABLE = "—";

interface StatTileProps {
  label: string;
  value: string;
}

/** One label/value pair in the hero stats list. */
function StatTile({ label, value }: StatTileProps) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="mt-1 text-3xl font-semibold text-gray-900 dark:text-gray-100">
        {value}
      </dd>
    </div>
  );
}

/**
 * Hero statistics for /browse, backed by real data: the network count comes
 * from app configuration and the rest from the get_public_platform_stats RPC.
 * While loading (or if the fetch fails) the figure shows an em dash rather than
 * a made-up number.
 * @returns The stats panel
 */
export const HeroStats: React.FC = () => {
  const { t, language } = useTranslation();
  const { stats } = usePlatformStats();

  const format = (n: number | undefined): string => {
    if (n === undefined) return UNAVAILABLE;
    try {
      return new Intl.NumberFormat(language).format(n);
    } catch {
      return String(n);
    }
  };

  return (
    <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:from-emerald-950/40 dark:via-gray-900 dark:to-teal-950/40 p-6 md:p-8">
      <dl className="grid grid-cols-2 gap-6">
        <StatTile
          label={t("browse.stats.networks", "Networks supported")}
          value={format(CONFIGURED_NETWORK_COUNT)}
        />
        <StatTile
          label={t("browse.stats.sectors", "Charitable sectors")}
          value={format(stats?.charitableSectors)}
        />
        <StatTile
          label={t("browse.stats.verifiedOrgs", "Verified organizations")}
          value={format(stats?.verifiedOrganizations)}
        />
        <StatTile
          label={t("browse.stats.volunteerHours", "Volunteer hours")}
          value={format(
            stats === null
              ? undefined
              : Math.round(stats.verifiedVolunteerHours),
          )}
        />
      </dl>
    </div>
  );
};
