import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserContributionStats,
  getUnifiedContributions,
  getVolunteerLeaderboard,
  getDonorLeaderboard,
  getGlobalContributionStats,
  type UserContributionStats,
  type UnifiedContribution,
  type VolunteerLeaderboardEntry,
  type DonorLeaderboardEntry,
  type ContributionFilters,
} from "@/services/contributionAggregationService";

/**
 * Hook for fetching user's contribution statistics
 * @returns Query result with user stats
 */
export function useUserContributionStats() {
  const { user } = useAuth();

  return useQuery<UserContributionStats | null>({
    queryKey: ["userContributionStats", user?.id],
    queryFn: () => {
      if (!user?.id) return Promise.resolve(null);
      return getUserContributionStats(user.id);
    },
    enabled: Boolean(user?.id),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching unified contributions with filters
 * @param filters - Optional filters
 * @returns Query result with contributions array
 */
export function useUnifiedContributions(filters?: ContributionFilters) {
  const { user } = useAuth();
  const effectiveFilters = {
    ...filters,
    userId: filters?.userId || user?.id,
  };

  return useQuery<UnifiedContribution[]>({
    queryKey: ["unifiedContributions", effectiveFilters],
    queryFn: () => getUnifiedContributions(effectiveFilters),
    enabled: Boolean(effectiveFilters.userId),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

/**
 * Hook for fetching volunteer leaderboard
 * @param limit - Maximum entries to return
 * @param includeUnvalidated - Include unvalidated self-reported hours
 * @param since - Optional ISO date lower bound for counted hours
 * @returns Query result with leaderboard entries
 */
export function useVolunteerLeaderboard(
  limit = 10,
  includeUnvalidated = false,
  since?: string,
) {
  return useQuery<VolunteerLeaderboardEntry[]>({
    queryKey: ["volunteerLeaderboard", limit, includeUnvalidated, since],
    queryFn: () => getVolunteerLeaderboard(limit, includeUnvalidated, since),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching donor leaderboard
 * @param limit - Maximum entries to return
 * @param since - Optional ISO timestamp lower bound for counted donations
 * @returns Query result with leaderboard entries
 */
export function useDonorLeaderboard(limit = 10, since?: string) {
  return useQuery<DonorLeaderboardEntry[]>({
    queryKey: ["donorLeaderboard", limit, since],
    queryFn: () => getDonorLeaderboard(limit, since),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook for fetching global contribution statistics
 * @returns Query result with global stats
 */
export function useGlobalContributionStats() {
  return useQuery({
    queryKey: ["globalContributionStats"],
    queryFn: getGlobalContributionStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Re-export types for convenience
export type {
  UserContributionStats,
  UnifiedContribution,
  VolunteerLeaderboardEntry,
  DonorLeaderboardEntry,
  ContributionFilters,
  ContributionSource,
} from "@/services/contributionAggregationService";
