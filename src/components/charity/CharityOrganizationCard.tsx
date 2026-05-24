import React, { useCallback } from "react";
import { Link } from "react-router-dom";
import { Building2, MapPin } from "lucide-react";
import type { CharityOrganization } from "@/types/charityOrganization";
import { Card } from "@/components/ui/Card";
import { cn } from "@/utils/cn";
import { useTranslation } from "@/hooks/useTranslation";

interface CharityOrganizationCardProps {
  organization: CharityOrganization;
  onSelect?: (_org: CharityOrganization) => void;
  selected?: boolean;
}

/**
 * Card component for displaying a charity organization record.
 * Shows name, EIN, location, NTEE code, and deductibility status.
 * When onSelect is provided, renders as a selectable button instead of a link.
 * @param props - Component props
 * @param props.organization - The charity organization data to display
 * @param props.onSelect - Optional callback when the card is clicked (renders as button)
 * @param props.selected - Whether the card is currently selected
 * @returns The rendered card component
 */
export const CharityOrganizationCard: React.FC<
  CharityOrganizationCardProps
> = ({ organization, onSelect, selected }) => {
  const { t } = useTranslation();
  const location = [organization.city, organization.state, organization.zip]
    .filter(Boolean)
    .join(", ");

  const handleSelect = useCallback(() => {
    onSelect?.(organization);
  }, [onSelect, organization]);

  const cardContent = (
    <Card className={cn("p-6", selected && "ring-2 ring-emerald-500")}>
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-900 leading-tight">
          {organization.name}
        </h3>
        {organization.is_on_platform && (
          <span className="ml-2 shrink-0 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
            {t("browse.charity.onPlatform", "On Platform")}
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm text-gray-600">
        <div className="flex items-center">
          <Building2
            aria-hidden="true"
            className="h-4 w-4 mr-2 text-gray-400 shrink-0"
          />
          <span>
            {t("browse.charity.einLabel", "EIN")}: {organization.ein}
          </span>
        </div>

        {location && (
          <div className="flex items-center">
            <MapPin
              aria-hidden="true"
              className="h-4 w-4 mr-2 text-gray-400 shrink-0"
            />
            <span>{location}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        {organization.ntee_cd && (
          <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded">
            {t("browse.charity.nteeLabel", "NTEE")}: {organization.ntee_cd}
          </span>
        )}
        {organization.deductibility && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
            {t("browse.charity.deductibilityLabel", "Deductibility")}:{" "}
            {organization.deductibility}
          </span>
        )}
      </div>
    </Card>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={handleSelect}
        className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-lg"
      >
        {cardContent}
      </button>
    );
  }

  return (
    <Link
      to={`/charity/${organization.ein}`}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-lg"
    >
      {cardContent}
    </Link>
  );
};
