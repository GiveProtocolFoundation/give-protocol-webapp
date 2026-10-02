import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import { getCharityWalletAddress } from "@/services/charityProfileService";
import { getCharityVerificationStatus } from "@/services/charityVerificationService";
import { useCharityDashboardMeta } from "./useCharityDashboardMeta";

// Services are mapped to jest.fn() mocks via moduleNameMapper
const mockGetWallet = jest.mocked(getCharityWalletAddress);
const mockGetVerification = jest.mocked(getCharityVerificationStatus);

const USER_ID = "user-1";
const PROFILE_ID = "profile-1";

describe("useCharityDashboardMeta", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWallet.mockResolvedValue("0xabc");
    mockGetVerification.mockResolvedValue({
      status: "approved",
      reviewNotes: null,
    });
  });

  afterEach(() => {
    resetMockState();
  });

  it("is not ready without a signed-in user", () => {
    const { result } = renderHook(() =>
      useCharityDashboardMeta(null, undefined),
    );
    expect(result.current.ready).toBe(false);
    expect(mockGetWallet).not.toHaveBeenCalled();
  });

  it("loads wallet, verification, branding and onboarding state before ready", async () => {
    setMockResult("charity_profiles", {
      data: { name: "Helping Hands", ein: null, logo_url: null },
      error: null,
    });
    const { result } = renderHook(() =>
      useCharityDashboardMeta(USER_ID, PROFILE_ID),
    );

    expect(result.current.ready).toBe(false);
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.walletAddress).toBe("0xabc");
    expect(result.current.verification?.status).toBe("approved");
    expect(result.current.orgName).toBe("Helping Hands");
    expect(result.current.onboardingState).toEqual({
      dismissed: false,
      completedItems: [],
    });
  });

  it("is ready without waiting for onboarding when there is no profile", async () => {
    const { result } = renderHook(() =>
      useCharityDashboardMeta(USER_ID, undefined),
    );
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.showChecklist).toBe(false);
  });

  it("treats failed lookups as unavailable but still becomes ready", async () => {
    mockGetWallet.mockRejectedValue(new Error("wallet down"));
    mockGetVerification.mockRejectedValue(new Error("rpc down"));
    const { result } = renderHook(() =>
      useCharityDashboardMeta(USER_ID, PROFILE_ID),
    );
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.verification).toBeNull();
    expect(result.current.walletAddress).toBeUndefined();
    expect(result.current.isRestricted).toBe(false);
  });

  it.each(["pending", "rejected", "suspended"] as const)(
    "hides onboarding and wallet prompts for %s charities",
    async (status) => {
      mockGetWallet.mockResolvedValue(null);
      mockGetVerification.mockResolvedValue({ status, reviewNotes: null });
      const { result } = renderHook(() =>
        useCharityDashboardMeta(USER_ID, PROFILE_ID),
      );
      await waitFor(() => {
        expect(result.current.ready).toBe(true);
      });
      expect(result.current.isRestricted).toBe(true);
      expect(result.current.showChecklist).toBe(false);
      expect(result.current.showWalletBanner).toBe(false);
    },
  );

  it("shows the checklist instead of the wallet banner, then the banner after dismissal", async () => {
    mockGetWallet.mockResolvedValue(null);
    const { result } = renderHook(() =>
      useCharityDashboardMeta(USER_ID, PROFILE_ID),
    );
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.showChecklist).toBe(true);
    expect(result.current.showWalletBanner).toBe(false);

    act(() => {
      result.current.dismissChecklist();
    });
    expect(result.current.showChecklist).toBe(false);
    expect(result.current.showWalletBanner).toBe(true);
  });

  it("respects a previously dismissed checklist", async () => {
    mockGetWallet.mockResolvedValue(null);
    setMockResult("profiles", {
      data: {
        meta: { onboarding_checklist: { dismissed: true, completedItems: [] } },
      },
      error: null,
    });
    const { result } = renderHook(() =>
      useCharityDashboardMeta(USER_ID, PROFILE_ID),
    );
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.showChecklist).toBe(false);
    expect(result.current.showWalletBanner).toBe(true);
  });

  it("lets the page update the logo and banner after an upload", async () => {
    const { result } = renderHook(() =>
      useCharityDashboardMeta(USER_ID, PROFILE_ID),
    );
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    act(() => {
      result.current.setLogoUrl("https://example.com/logo.png");
      result.current.setBannerImageUrl("https://example.com/banner.png");
    });
    expect(result.current.logoUrl).toBe("https://example.com/logo.png");
    expect(result.current.bannerImageUrl).toBe(
      "https://example.com/banner.png",
    );
  });
});
