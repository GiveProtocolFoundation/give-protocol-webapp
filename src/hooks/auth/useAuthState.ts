import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

/**
 * Authentication state hook for managing user session state
 * @function useAuthState
 * @description Manages authentication state by monitoring Supabase auth sessions. Automatically checks for existing
 * sessions on mount and subscribes to auth state changes. Provides user object and loading state for auth-dependent components.
 * @returns {Object} Authentication state object
 * @returns {User | null} returns.user - Current authenticated user object from Supabase or null if not authenticated
 * @returns {boolean} returns.loading - Loading state during initial session check and auth state changes
 * @example
 * ```tsx
 * const { user, loading } = useAuthState();
 *
 * if (loading) return <AuthLoadingSpinner />;
 *
 * if (!user) {
 *   return <LoginPrompt />;
 * }
 *
 * return (
 *   <div>
 *     <h1>Welcome, {user.email}!</h1>
 *     <p>User Type: {user.user_metadata?.type}</p>
 *   </div>
 * );
 * ```
 */
export function useAuthState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, loading };
}
