import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { repairCharityImageUrl } from "@/utils/charityAssets";
import { getCharityWalletAddress } from "@/services/charityProfileService";
import { getCharityVerificationStatus } from "@/services/charityVerificationService";
import type { CharityVerificationResult } from "@/services/charityVerificationService";
import {
  isRestrictedVerificationStatus,
  loadOnboardingState,
} from "@/components/charity/charityDashboardState";
import type { OnboardingState } from "@/components/charity/charityDashboardState";

/**
 * Loads everything the charity dashboard needs before first paint (verification
 * status, receiving wallet, header branding, onboarding checklist state) and
 * derives which onboarding banners should be visible.
 *
 * @param userId - The authenticated user's ID, or null when signed out
 * @param profileId - The charity's `profiles` row ID, if known
 * @returns Loaded dashboard metadata, visibility flags, and setters
 */
export function useCharityDashboardMeta(
  userId: string | null,
  profileId?: string,
) {
  // undefined = still loading; null = loaded but unavailable
  const [walletAddress, setWalletAddress] = useState<
    string | null | undefined
  >();
  const [verification, setVerification] = useState<
    CharityVerificationResult | null | undefined
  >();
  const [onboardingState, setOnboardingState] = useState<
    OnboardingState | null | undefined
  >();
  const [checklistDismissed, setChecklistDismissed] = useState(false);
  const [walletLoaded, setWalletLoaded] = useState(false);
  const [orgName, setOrgName] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerImageUrl, setBannerImageUrl] = useState<string | null>(null);

  // Wallet + verification status load together so banners render with the
  // rest of the page instead of popping in afterwards.
  useEffect(() => {
    let cancelled = false;
    if (userId) {
      Promise.allSettled([
        getCharityWalletAddress(userId),
        getCharityVerificationStatus(userId),
      ]).then(([walletResult, verificationResult]) => {
        if (cancelled) return;
        if (walletResult.status === "fulfilled") {
          setWalletAddress(walletResult.value);
        }
        setVerification(
          verificationResult.status === "fulfilled"
            ? verificationResult.value
            : null,
        );
        setWalletLoaded(true);
      });
      supabase
        .from("charity_profiles")
        .select("ein, name, logo_url, banner_image_url")
        .eq("claimed_by", userId)
        .maybeSingle()
        .then(({ data }) => {
          if (cancelled) return;
          setOrgName(data?.name ?? null);
          setLogoUrl(repairCharityImageUrl(data?.logo_url, data?.ein));
          setBannerImageUrl(
            repairCharityImageUrl(data?.banner_image_url, data?.ein),
          );
        });
    }
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Onboarding checklist state is loaded up front for the same reason
  useEffect(() => {
    let cancelled = false;
    if (profileId) {
      loadOnboardingState(profileId).then((state) => {
        if (cancelled) return;
        setOnboardingState(state);
        setChecklistDismissed(state?.dismissed ?? false);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const dismissChecklist = useCallback(() => setChecklistDismissed(true), []);

  // Pending/rejected/suspended charities only see their status: no onboarding
  // checklist, wallet prompt, or create actions.
  const isRestricted = isRestrictedVerificationStatus(verification?.status);
  const showChecklist =
    Boolean(profileId) && !isRestricted && !checklistDismissed;
  // The checklist already covers wallet setup, so the standalone banner is
  // only needed once the checklist is gone.
  const showWalletBanner =
    walletAddress === null && !isRestricted && !showChecklist;
  const ready = walletLoaded && (!profileId || onboardingState !== undefined);

  return {
    ready,
    walletAddress,
    verification,
    onboardingState,
    orgName,
    logoUrl,
    bannerImageUrl,
    isRestricted,
    showChecklist,
    showWalletBanner,
    dismissChecklist,
    setLogoUrl,
    setBannerImageUrl,
  };
}
