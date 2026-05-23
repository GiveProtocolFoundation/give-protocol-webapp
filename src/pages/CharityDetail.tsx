import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  CharityPageTemplate,
  CharityProfileData,
} from "@/components/charity/CharityPageTemplate";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { supabase } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import type { OrganizationProfile } from "@/types/charity";

/**
 * Dynamic charity detail page with scroll animations.
 * Fetches organization profile from database when available.
 */
const CharityDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [organizationProfile, setOrganizationProfile] =
    useState<OrganizationProfile | null>(null);

  // Fetch organization profile from database
  useEffect(() => {
    /** Fetches the organization profile for the given charity ID. */
    const fetchOrganizationProfile = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("meta")
          .eq("id", id)
          .eq("type", "charity")
          .single();

        if (error) {
          // Profile might not exist or isn't a charity - silently ignore
          Logger.debug("Could not fetch organization profile", { id, error });
          return;
        }

        if (data?.meta) {
          const meta = data.meta as OrganizationProfile;
          setOrganizationProfile(meta);
        }
      } catch (err) {
        Logger.debug("Error fetching organization profile", { id, error: err });
      }
    };

    fetchOrganizationProfile();
  }, [id]);

  // Sample data - replace with actual API call using the id parameter
  const charityData: CharityProfileData = {
    id: id ?? "unknown",
    walletAddress: "0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75",
    name: "Ocean Conservation Alliance",
    description:
      "Protecting marine ecosystems and promoting sustainable ocean practices through innovative conservation programs, research initiatives, and community engagement.",
    category: "Environmental",
    image:
      "https://images.unsplash.com/photo-1583212292454-1fe6229603b7?auto=format&fit=crop&w=800",
    verified: true,
    country: "United States",
    stats: {
      totalDonated: 750000,
      donorCount: 1250,
      projectsCompleted: 15,
    },
    mission:
      "Our mission is to protect and restore ocean ecosystems through science-based conservation actions, policy advocacy, and public education.",
    impact: [
      "Protected over 100,000 acres of marine habitat",
      "Rescued and rehabilitated 500+ marine animals",
      "Removed 50 tons of plastic waste from oceans",
      "Educated 10,000 students about marine conservation",
    ],
    organizationProfile: organizationProfile ?? undefined,
  };

  return (
    <ScrollReveal direction="up" delay={100}>
      <CharityPageTemplate charity={charityData} />
    </ScrollReveal>
  );
};

export default CharityDetail;
