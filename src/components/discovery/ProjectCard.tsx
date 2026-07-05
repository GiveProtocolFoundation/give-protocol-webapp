import React from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin, ShieldCheck } from "lucide-react";
import type { CharityOrganization } from "@/types/charityOrganization";
import { Card } from "@/components/ui/Card";
import { useTranslation } from "@/hooks/useTranslation";

interface ProjectCardProps {
  organization: CharityOrganization;
}

/**
 * Discovery-grid card for a charity. The whole card is not clickable so the
 * primary Donate action stays distinct from the organization name link.
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ organization }) => {
  const { t } = useTranslation();
  const location = [organization.city, organization.state, organization.zip]
    .filter(Boolean)
    .join(", ");

  const detailHref = `/charity/${organization.ein}`;
  const donateHref = `${detailHref}?action=donate`;

  return (
    <Card className="p-6 flex flex-col h-full">
      <div className="aspect-[16/9] -mx-6 -mt-6 mb-5 bg-gradient-to-br from-emerald-100 via-teal-50 to-emerald-50 dark:from-emerald-900/40 dark:via-teal-900/30 dark:to-emerald-950/40 rounded-t-lg flex items-center justify-center">
        <Building2
          aria-hidden="true"
          className="h-12 w-12 text-emerald-600/70 dark:text-emerald-400/70"
        />
      </div>

      <div className="flex items-start justify-between gap-2">
        <Link
          to={detailHref}
          className="text-lg font-semibold text-gray-900 dark:text-gray-100 leading-tight hover:text-emerald-700 dark:hover:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded"
        >
          {organization.name}
        </Link>
        {organization.is_on_platform && (
          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-full">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            Verified
          </span>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <Building2 aria-hidden="true" className="h-4 w-4 text-gray-400" />
          <span>{t("browse.charity.einDisplay", "Tax ID: {{value}}", { value: organization.ein })}</span>
        </div>
        {location && (
          <div className="flex items-center gap-1.5">
            <MapPin aria-hidden="true" className="h-4 w-4 text-gray-400" />
            <span>{location}</span>
          </div>
        )}
      </div>

      <div className="mt-auto pt-5">
        <Link
          to={donateHref}
          className="w-full inline-flex items-center justify-center rounded-[10px] bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Donate
        </Link>
      </div>
    </Card>
  );
};
