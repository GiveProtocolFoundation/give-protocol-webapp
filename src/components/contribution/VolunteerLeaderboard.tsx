import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Award, Clock, Search } from "lucide-react";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { useVolunteerLeaderboard } from "@/hooks/useContributionStats";
import { useTranslation } from "@/hooks/useTranslation";

interface VolunteerLeader {
  id: string;
  alias: string;
  walletAddress: string;
  hours: number;
  formalHours: number;
  selfReportedHours: number;
  endorsements: number;
  rank: number;
}

interface VolunteerLeaderboardProps {
  timeRange?: string;
  region?: string;
  searchTerm?: string;
  highlightSkill?: string;
  section?: "hours" | "endorsements";
}

/**
 * Returns a CSS background color class based on the volunteer's rank.
 * @param rank The rank of the volunteer (1 for first place, 2 for second, etc.).
 * @returns A string representing the CSS class for the background color corresponding to the rank.
 */
const getRankColor = (rank: number): string => {
  switch (rank) {
    case 1:
      return "bg-yellow-500";
    case 2:
      return "bg-gray-400";
    case 3:
      return "bg-amber-600";
    default:
      return "bg-gray-300";
  }
};

/** Ranked volunteer leaderboard with hours/endorsements tabs and search filtering. */
export const VolunteerLeaderboard: React.FC<VolunteerLeaderboardProps> = ({
  timeRange: _timeRange,
  region: _region,
  searchTerm,
  highlightSkill: _highlightSkill,
  section = "hours",
}) => {
  const [activeTab, setActiveTab] = useState<"hours" | "endorsements">(section);
  const [localSearchTerm, setLocalSearchTerm] = useState("");
  const { getAliasForAddress } = useWalletAlias();
  const { t, language } = useTranslation();
  const [displayLeaders, setDisplayLeaders] = useState<
    (VolunteerLeader & { displayName: string })[]
  >([]);

  // Fetch real data from the aggregation service
  const { data: leaderboardData, isLoading } = useVolunteerLeaderboard(
    10,
    false,
  );

  // Transform API data to component format
  const leaders = useMemo(() => {
    if (!leaderboardData) return [];
    return leaderboardData.map((entry) => ({
      id: entry.userId,
      alias:
        entry.alias ||
        t("tracker.volunteer.fallbackName", "Volunteer {{rank}}", {
          rank: entry.rank,
        }),
      walletAddress: entry.walletAddress || "",
      hours: entry.totalHours,
      formalHours: entry.formalHours,
      selfReportedHours: entry.selfReportedHours,
      endorsements: entry.endorsements,
      rank: entry.rank,
    }));
  }, [leaderboardData, t]);

  // Update display names with aliases when available
  useEffect(() => {
    if (leaders.length === 0) return;

    /** Resolves wallet aliases for each leader and updates display names. */
    const updateAliases = async () => {
      const updatedLeaders = await Promise.all(
        leaders.map(async (leader) => {
          const alias = leader.walletAddress
            ? await getAliasForAddress(leader.walletAddress)
            : null;
          return {
            ...leader,
            displayName: alias || leader.alias,
          };
        }),
      );
      setDisplayLeaders(updatedLeaders);
    };

    updateAliases();
  }, [leaders, getAliasForAddress]);

  const handleHoursTabClick = useCallback(() => {
    setActiveTab("hours");
  }, []);

  const handleEndorsementsTabClick = useCallback(() => {
    setActiveTab("endorsements");
  }, []);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setLocalSearchTerm(e.target.value);
    },
    [],
  );

  // Filter leaders based on search term
  const filteredLeaders = displayLeaders.filter((leader) => {
    const searchTermToUse = localSearchTerm || searchTerm;
    if (!searchTermToUse) return true;

    return leader.displayName
      .toLowerCase()
      .includes(searchTermToUse.toLowerCase());
  });

  const hoursLabel = (leader: VolunteerLeader) =>
    t("tracker.volunteer.hoursLabel", "Hours: {{hours}}", {
      hours: leader.hours.toLocaleString(language),
    });
  const endorsementsLabel = (leader: VolunteerLeader) =>
    t("tracker.volunteer.endorsementsLabel", "Endorsements: {{endorsements}}", {
      endorsements: leader.endorsements.toLocaleString(language),
    });

  if (isLoading)
    return <div>{t("tracker.loadingLeaderboard", "Loading leaderboard…")}</div>;

  return (
    <div className="space-y-4">
      <div className="flex space-x-4 mb-4">
        <button
          onClick={handleHoursTabClick}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            activeTab === "hours"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          <Clock className="h-4 w-4 mr-2" />
          {t("tracker.volunteer.hoursTab", "Hours")}
        </button>
        <button
          onClick={handleEndorsementsTabClick}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
            activeTab === "endorsements"
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          }`}
        >
          <Award className="h-4 w-4 mr-2" />
          {t("tracker.volunteer.endorsementsTab", "Endorsements")}
        </button>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          value={localSearchTerm}
          onChange={handleSearchChange}
          placeholder={t(
            "tracker.volunteer.searchPlaceholder",
            "Search volunteers or skills...",
          )}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 dark:text-gray-500" />
      </div>

      {filteredLeaders.length > 0 ? (
        <div className="space-y-3">
          {filteredLeaders.map((leader) => (
            <div
              key={leader.id}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
            >
              <div className="flex items-center space-x-4">
                <span
                  className={`w-8 h-8 flex items-center justify-center rounded-full ${
                    leader.rank <= 3
                      ? getRankColor(leader.rank)
                      : "bg-gray-200 dark:bg-gray-600"
                  } text-gray-900 dark:text-gray-100 font-semibold`}
                >
                  {leader.rank}
                </span>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {leader.displayName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activeTab === "hours"
                      ? `${hoursLabel(leader)} • ${endorsementsLabel(leader)}`
                      : `${endorsementsLabel(leader)} • ${hoursLabel(leader)}`}
                  </p>
                  {leader.selfReportedHours > 0 && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {t(
                        "tracker.volunteer.hoursBreakdown",
                        "Verified: {{verified}} • Self-reported: {{selfReported}}",
                        {
                          verified: leader.formalHours.toLocaleString(language),
                          selfReported:
                            leader.selfReportedHours.toLocaleString(language),
                        },
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center h-40 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            {t("tracker.noResults", "No results found")}
          </p>
        </div>
      )}
    </div>
  );
};
