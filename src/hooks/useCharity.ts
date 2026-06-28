import { useState, useEffect } from "react";
import { getCharity, getCharityCauses } from "@/lib/api/queries";
import { CharityData, CauseData } from "@/lib/api/types";
import { Logger } from "@/utils/logger";

/**
 * Charity data management hook for fetching individual charity information and causes
 * @function useCharity
 * @description Fetches and manages individual charity data including basic information and associated causes.
 * Automatically fetches data on component mount and provides refresh functionality with comprehensive error handling.
 * @param {string} id - The unique identifier of the charity to fetch
 * @returns {Object} Charity data and management utilities
 * @returns {CharityData | null} returns.charity - Charity information object or null if not loaded
 * @returns {CauseData[]} returns.causes - Array of causes associated with the charity
 * @returns {boolean} returns.loading - Loading state for fetch operations
 * @returns {Error | null} returns.error - Error object if fetch operations fail, null otherwise
 * @returns {Function} returns.refresh - Manually refresh charity data: () => Promise<void>
 * @example
 * ```tsx
 * const { charity, causes, loading, error, refresh } = useCharity(charityId);
 *
 * if (loading) return <CharityPageSkeleton />;
 * if (error) return <ErrorPage error={error} onRetry={refresh} />;
 * if (!charity) return <NotFound />;
 *
 * return (
 *   <div>
 *     <CharityHeader charity={charity} />
 *     <CausesList causes={causes} />
 *     <button onClick={refresh}>Refresh Data</button>
 *   </div>
 * );
 * ```
 */
export function useCharity(id: string) {
  const [charity, setCharity] = useState<CharityData | null>(null);
  const [causes, setCauses] = useState<CauseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    /** Fetches charity and causes data and updates state if still mounted. */
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch charity data
        const charityResponse = await getCharity(id);
        if (charityResponse.error)
          throw new Error(charityResponse.error.message);

        // Fetch causes
        const causesResponse = await getCharityCauses(id);
        if (causesResponse.error) throw new Error(causesResponse.error.message);

        if (mounted) {
          setCharity(charityResponse.data);
          setCauses(causesResponse.data || []);
        }
      } catch (err) {
        Logger.error("Failed to fetch charity data", {
          error: err,
          charityId: id,
        });
        if (mounted) {
          setError(
            err instanceof Error
              ? err
              : new Error("Failed to fetch charity data"),
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      mounted = false;
    };
  }, [id]);

  /** Manually re-fetches charity and causes data and updates component state. */
  const refresh = async () => {
    setLoading(true);
    try {
      const [charityResponse, causesResponse] = await Promise.all([
        getCharity(id),
        getCharityCauses(id),
      ]);
      if (charityResponse.error) throw new Error(charityResponse.error.message);
      if (causesResponse.error) throw new Error(causesResponse.error.message);
      setCharity(charityResponse.data);
      setCauses(causesResponse.data || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err
          : new Error("Failed to refresh charity data"),
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    charity,
    causes,
    loading,
    error,
    refresh,
  };
}
