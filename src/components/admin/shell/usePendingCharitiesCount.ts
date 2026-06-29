import { useQuery } from "@tanstack/react-query";
import { getAdminDashboardStats } from "@/services/adminDashboardService";
import type { AdminDashboardStats } from "@/types/adminDashboard";

/**
 * Shared, cached query for the admin dashboard stats RPC. Powers both the
 * sidebar pending badge and the Charities tab counts so they stay in sync
 * without duplicate fetches or hardcoded values.
 *
 * @returns The React Query result for the dashboard stats.
 */
export function useAdminStats() {
  return useQuery<AdminDashboardStats>({
    queryKey: ["admin", "dashboardStats"],
    queryFn: getAdminDashboardStats,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}

/**
 * Number of charities awaiting verification, for the sidebar badge.
 *
 * @returns The pending charity count, or `undefined` while loading / on error.
 */
export function usePendingCharitiesCount(): number | undefined {
  const { data } = useAdminStats();
  return data?.pendingCharities;
}
