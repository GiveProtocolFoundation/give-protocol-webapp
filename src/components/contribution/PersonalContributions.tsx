import React from "react";
import { DonationStats } from "./DonationStats";
import { RecentContributions } from "./RecentContributions";
import { VolunteerImpact } from "./VolunteerImpact";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useUserContributionStats } from "@/hooks/useContributionStats";

interface PersonalContributionsProps {
  filters?: Record<string, unknown>;
}

/**
 * Renders the current user's personal contribution stats, recent activity, and volunteer impact.
 * @param props - Component props.
 * @param props.filters - Reserved for future filter support; currently unused.
 * @returns The personal contributions dashboard element.
 */
export const PersonalContributions: React.FC<PersonalContributionsProps> = ({
  filters: _filters,
}) => {
  const { data: userStats, isLoading, error } = useUserContributionStats();

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        Error loading contribution stats. Please try again.
      </div>
    );
  }

  // Transform userStats to the format expected by DonationStats
  const stats = userStats
    ? {
        totalDonated: userStats.totalDonated,
        volunteerHours: {
          formal: userStats.formalVolunteerHours,
          selfReported: userStats.selfReportedHours,
          total: userStats.totalVolunteerHours,
        },
        skillsEndorsed: userStats.skillsEndorsed,
        organizationsHelped: userStats.organizationsHelped,
      }
    : undefined;

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DonationStats stats={stats} isPersonal />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <RecentContributions />
        <VolunteerImpact />
      </div>
    </div>
  );
};
