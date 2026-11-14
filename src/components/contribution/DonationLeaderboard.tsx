import React, { useMemo, useState, useEffect } from "react";
import { Trophy } from "lucide-react";
import { formatCurrency } from "@/utils/money";
import type { LeaderboardEntry } from "@/types/contribution";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { FixedSizeList } from "react-window";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { useDonorLeaderboard } from "@/hooks/useContributionStats";
import { useTranslation } from "@/hooks/useTranslation";
import type { DonationLeaderData } from "@/utils/leaderboardExport";

/** Returns the background color class for a leaderboard rank badge. */
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

interface LeaderboardRowProps {
  index: number;
  style: React.CSSProperties;
  data: LeaderboardEntry[];
}

/** Renders a single row in the donation leaderboard with rank, name, and total donated. */
const LeaderboardRow: React.FC<LeaderboardRowProps> = ({
  index,
  style,
  data,
}) => {
  const { language } = useTranslation();
  const entry = data[index];
  if (!entry) return null;

  return (
    <div
      style={style}
      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg mb-2"
    >
      <div className="flex items-center space-x-4">
        {entry.rank <= 3 ? (
          <div className={`p-2 rounded-full ${getRankColor(entry.rank)}`}>
            <Trophy className="h-5 w-5 text-gray-900" aria-hidden="true" />
          </div>
        ) : (
          <div className="w-9 h-9 flex items-center justify-center">
            <span className="text-gray-500 font-medium">{entry.rank}</span>
          </div>
        )}
        <span className="font-medium text-gray-900">{entry.displayName}</span>
      </div>
      <span className="text-gray-900 font-semibold">
        {formatCurrency(entry.totalDonated, "USD", language)}
      </span>
    </div>
  );
};

interface DonationLeaderboardProps {
  /** Search text from the page-level search box. */
  searchTerm?: string;
  /** ISO date lower bound for counted donations; undefined means all time. */
  since?: string;
  /** Receives the rows currently shown, for export and empty-state handling. */
  onRowsChange?: (_rows: DonationLeaderData[]) => void;
}

/**
 * Donation leaderboard displaying top donors with virtualized scrolling.
 * @param props - Search term, time lower bound and visible-rows callback from the page
 * @returns The rendered leaderboard
 */
export const DonationLeaderboard: React.FC<DonationLeaderboardProps> = ({
  searchTerm = "",
  since,
  onRowsChange,
}) => {
  const {
    data: leaderboardData,
    isLoading,
    error,
  } = useDonorLeaderboard(10, since);
  const { getAliasForAddress } = useWalletAlias();
  const { t } = useTranslation();
  const [displayLeaderboard, setDisplayLeaderboard] = useState<
    LeaderboardEntry[]
  >([]);

  // Transform API data to component format
  const leaderboard = useMemo(() => {
    if (!leaderboardData) return [];
    return leaderboardData.map((entry) => ({
      id: entry.userId,
      alias: entry.alias || `Donor ${entry.rank}`,
      walletAddress: entry.walletAddress || "",
      totalDonated: entry.totalDonated,
      rank: entry.rank,
      donationCount: entry.donationCount,
      organizationsSupported: entry.organizationsSupported,
    }));
  }, [leaderboardData]);

  // Update display names with aliases when available
  useEffect(() => {
    if (leaderboard.length === 0) {
      setDisplayLeaderboard([]);
      return;
    }

    /** Resolves wallet aliases for all leaderboard entries. */
    const updateAliases = async () => {
      const updatedLeaderboard = await Promise.all(
        leaderboard.map(async (entry) => {
          const alias = entry.walletAddress
            ? await getAliasForAddress(entry.walletAddress)
            : null;
          return {
            ...entry,
            displayName: alias || entry.alias,
          };
        }),
      );
      setDisplayLeaderboard(updatedLeaderboard);
    };

    updateAliases();
  }, [leaderboard, getAliasForAddress]);

  // Filter leaderboard based on search term
  const filteredLeaderboard = useMemo(() => {
    if (!displayLeaderboard) return [];

    return displayLeaderboard.filter((entry) =>
      entry.displayName?.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [displayLeaderboard, searchTerm]);

  useEffect(() => {
    onRowsChange?.(
      filteredLeaderboard.map((entry) => ({
        rank: entry.rank,
        displayName: entry.displayName ?? entry.alias,
        totalDonated: entry.totalDonated,
        alias: entry.alias,
      })),
    );
  }, [filteredLeaderboard, onRowsChange]);

  if (isLoading) {
    return <LoadingSpinner size="lg" />;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-600 rounded-lg">
        {t(
          "tracker.loadError",
          "Failed to load leaderboard data. Please try again.",
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="h-[400px]">
        {filteredLeaderboard.length > 0 ? (
          <FixedSizeList
            height={400}
            width="100%"
            itemCount={filteredLeaderboard.length}
            itemSize={70}
            itemData={filteredLeaderboard}
          >
            {LeaderboardRow}
          </FixedSizeList>
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg">
            <p className="text-gray-500">
              {t("tracker.noResults", "No results found")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
