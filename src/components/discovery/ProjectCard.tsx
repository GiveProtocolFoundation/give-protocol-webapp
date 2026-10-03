import React from "react";
import type { CharityOrganization } from "@/types/charityOrganization";
import { useTranslation } from "@/hooks/useTranslation";
import { getRegistryInfo } from "@/utils/registryVerification";
import { getTranslatableNteeCategory } from "@/utils/nteeCategories";
import { CharityDiscoveryCard } from "./CharityDiscoveryCard";

interface ProjectCardProps {
  organization: CharityOrganization;
}

/**
 * Discovery-grid card for a charity search result. Uses the same card layout as
 * the featured carousel. Claimed charities (a `claimed_by` on their profile)
 * get the primary Donate CTA; unclaimed ones get View profile because their
 * profile cannot receive donations until claimed (GIV-1012). The trust badge
 * names the registry the record came from rather than assuming the IRS.
 * @param props - The organization to display
 * @returns The rendered card
 */
export const ProjectCard: React.FC<ProjectCardProps> = ({ organization }) => {
  const { t } = useTranslation();
  const location = [organization.city, organization.state, organization.zip]
    .filter(Boolean)
    .join(", ");

  const registry = getRegistryInfo(organization.registry_source);
  const identifier = registry?.idIsTaxId
    ? t("browse.charity.einDisplay", "Tax ID: {{value}}", {
        value: organization.ein,
      })
    : t("browse.charity.registryIdDisplay", "Registry ID: {{value}}", {
        value: organization.ein,
      });

  return (
    <CharityDiscoveryCard
      name={organization.name}
      detailHref={`/charity/${organization.ein}`}
      isClaimed={organization.is_claimed === true}
      registrySource={organization.registry_source}
      category={
        organization.ntee_cd
          ? getTranslatableNteeCategory(organization.ntee_cd)
          : undefined
      }
      location={location || undefined}
      identifier={identifier}
      onPlatform={organization.is_on_platform}
    />
  );
};
