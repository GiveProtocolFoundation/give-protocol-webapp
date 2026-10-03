import React from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { getRegistryInfo } from "@/utils/registryVerification";

interface RegistryBadgeProps {
  /** The record's `registry_source` (e.g. "IRS_BMF"); null when unknown. */
  registrySource: string | null | undefined;
  /**
   * Label to show when the registry is unknown but Give Protocol has verified
   * the charity itself. Omit to render nothing for unknown registries.
   */
  platformVerified?: boolean;
  className?: string;
}

const BADGE_CLASS =
  "inline-flex items-center gap-1 px-2 py-1 bg-white/90 dark:bg-gray-900/90 text-emerald-700 dark:text-emerald-300 text-xs font-medium rounded-full shadow-sm";

/**
 * Trust badge naming the registry a charity was listed in ("IRS-registered",
 * or the source's own name for non-US registries). Never claims a registry the
 * record does not come from.
 * @param props - Registry source and optional platform-verified fallback
 * @returns The badge, or null when there is nothing honest to display
 */
export const RegistryBadge: React.FC<RegistryBadgeProps> = ({
  registrySource,
  platformVerified = false,
  className,
}) => {
  const { t } = useTranslation();
  const registry = getRegistryInfo(registrySource);

  let label: string | null = null;
  if (registry) {
    label = t("browse.registry.badge", "{{registry}}-registered", {
      registry: registry.shortName,
    });
  } else if (platformVerified) {
    label = t("browse.verified", "Verified");
  }

  if (label === null) return null;

  return (
    <span className={className ? `${BADGE_CLASS} ${className}` : BADGE_CLASS}>
      <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
      {label}
    </span>
  );
};
