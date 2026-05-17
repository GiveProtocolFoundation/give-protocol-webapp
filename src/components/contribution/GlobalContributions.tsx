import React, { useMemo } from "react";
import { DonationStats } from "./DonationStats";
import { DonationLeaderboard } from "./DonationLeaderboard";
import { VolunteerLeaderboard } from "./VolunteerLeaderboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGlobalContributionStats } from "@/hooks/useContributionStats";

interface GlobalContributionsProps {
  filters?: Record<string, unknown>;
}

/**
 * Renders aggregate donation/volunteer statistics and leaderboards for the entire platform.
 * @param props - Component props.
 * @param props.filters - Reserved for future filter support; currently unused.
 * @returns The global contributions dashboard element.
 */
export const GlobalContributions: React.FC<GlobalContributionsProps> = ({
  filters: _filters,
}) => {
  const { data: globalStats, isLoading, error } = useGlobalContributionStats();

  // Transform global stats to format expected by DonationStats
  const stats = useMemo(() => {
    if (!globalStats) return undefined;
    return {
      totalDonated: globalStats.totalDonationAmount,
      volunteerHours: {
        formal: globalStats.totalFormalVolunteerHours,
        selfReported: {
          validated: globalStats.totalSelfReportedHours.validated,
          pending: globalStats.totalSelfReportedHours.pending,
          unvalidated: 0,
          total: globalStats.totalSelfReportedHours.total,
        },
        total: globalStats.totalVolunteerHours,
      },
      skillsEndorsed: 0, // Not tracked in global stats currently
    };
  }, [globalStats]);

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600 dark:text-red-400">
        Error loading global stats. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <DonationStats stats={stats} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Donation Leaderboard
          </h2>
          <DonationLeaderboard />
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Volunteer Leaderboard
          </h2>
          <VolunteerLeaderboard />
        </div>
      </div>
    </div>
  );
};
