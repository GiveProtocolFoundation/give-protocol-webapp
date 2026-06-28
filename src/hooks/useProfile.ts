import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Logger } from "@/utils/logger";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  user_id: string;
  type: "donor" | "charity";
  created_at: string;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

/**
 * Fetches existing profile from database
 */
async function fetchExistingProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Creates a new profile for the user
 */
async function createNewProfile(user: User): Promise<Profile> {
  const userType = user.user_metadata?.type || "donor";
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: user.id,
      type: userType,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Calculates retry delay with exponential backoff
 */
function calculateRetryDelay(retryCount: number): number {
  return RETRY_DELAY * Math.pow(2, retryCount);
}

/**
 * User profile management hook for fetching and managing user profile data
 * @function useProfile
 * @description Manages user profile lifecycle including automatic creation for new users, retry logic with exponential backoff,
 * and comprehensive error handling. Automatically fetches or creates profile based on authenticated user's metadata.
 * @returns {Object} Profile management state and data
 * @returns {Profile | null} returns.profile - User profile object containing id, user_id, type ('donor' | 'charity'), and created_at
 * @returns {boolean} returns.loading - Loading state for profile fetch/create operations
 * @returns {Error | null} returns.error - Error object if profile operations fail, null otherwise
 * @example
 * ```tsx
 * const { profile, loading, error } = useProfile();
 *
 * if (loading) return <ProfileSkeleton />;
 * if (error) return <ErrorMessage error={error} />;
 * if (!profile) return <NoProfile />;
 *
 * return (
 *   <div>
 *     <h2>Profile Type: {profile.type}</h2>
 *     <p>User ID: {profile.user_id}</p>
 *     <p>Created: {new Date(profile.created_at).toLocaleDateString()}</p>
 *   </div>
 * );
 * ```
 */
export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRetry = useCallback((fetchFn: () => void) => {
    if (retryCountRef.current >= MAX_RETRIES) return;

    const delay = calculateRetryDelay(retryCountRef.current);
    Logger.info(
      `Retrying profile fetch in ${delay}ms (attempt ${retryCountRef.current + 1}/${MAX_RETRIES})`,
    );

    retryTimeoutRef.current = setTimeout(() => {
      retryCountRef.current += 1;
      fetchFn();
    }, delay);
  }, []);

  const handleFetchError = useCallback(
    (err: unknown, fetchFn: () => void) => {
      Logger.error("Profile fetch failed", {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
        retryCount: retryCountRef.current,
      });

      if (!mountedRef.current) return;

      setError(
        err instanceof Error ? err : new Error("Failed to fetch profile"),
      );
      scheduleRetry(fetchFn);
    },
    [scheduleRetry],
  );

  useEffect(() => {
    mountedRef.current = true;
    retryCountRef.current = 0;

    /** Fetches the user profile from Supabase, retrying on transient errors. */
    const fetchProfile = async () => {
      if (!user) {
        if (mountedRef.current) {
          setProfile(null);
          setLoading(false);
        }
        return;
      }

      try {
        const existingProfile = await fetchExistingProfile(user.id);
        const profileData = existingProfile || (await createNewProfile(user));

        if (mountedRef.current) {
          setProfile(profileData);
          setError(null);
          retryCountRef.current = 0;
        }
      } catch (err) {
        handleFetchError(err, fetchProfile);
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      mountedRef.current = false;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [user, handleFetchError]);

  return { profile, loading, error };
}
