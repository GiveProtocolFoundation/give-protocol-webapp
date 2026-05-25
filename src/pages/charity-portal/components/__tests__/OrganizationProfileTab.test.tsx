import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { setMockResult, resetMockState } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchCharityProfileAssets,
  fetchCharityProfileAssetsByEin,
  fetchCharityProfileBySignerEmail,
  fetchCharityProfileByName,
  repairClaimedBy,
} from "@/services/charityProfileService";
import { OrganizationProfileTab } from "../OrganizationProfileTab";

const mockUseAuth = jest.mocked(useAuth);
const mockFetchCharityProfileAssets = jest.mocked(fetchCharityProfileAssets);
const mockFetchByEin = jest.mocked(fetchCharityProfileAssetsByEin);
const mockFetchByEmail = jest.mocked(fetchCharityProfileBySignerEmail);
const mockFetchByName = jest.mocked(fetchCharityProfileByName);
const _mockRepair = jest.mocked(repairClaimedBy);

const USER_ID = "user-abc";

const ownerAuthState = {
  user: { id: USER_ID } as ReturnType<typeof useAuth>["user"],
  loading: false,
  error: null,
  userType: null,
  login: jest.fn(),
  loginWithGoogle: jest.fn(),
  loginWithApple: jest.fn(),
  logout: jest.fn(),
  resetPassword: jest.fn(),
  refreshSession: jest.fn(),
  register: jest.fn(),
  sendUsernameReminder: jest.fn(),
} as const;

describe("OrganizationProfileTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    mockUseAuth.mockReturnValue(ownerAuthState);
    setMockResult("profiles", { data: { meta: null }, error: null });
    mockFetchCharityProfileAssets.mockResolvedValue({
      ein: "12-3456789",
      logoUrl: null,
      bannerImageUrl: null,
      claimedByUserId: USER_ID,
    });
    mockFetchByEin.mockResolvedValue(null);
    mockFetchByEmail.mockResolvedValue(null);
    mockFetchByName.mockResolvedValue(null);
  });

  it("renders OrganizationProfileForm after loading", async () => {
    render(<OrganizationProfileTab profileId="profile-123" />);
    const saveBtn = await screen.findByRole("button", {
      name: /save changes/i,
    });
    expect(saveBtn).toBeInTheDocument();
  });

  it("renders LogoBannerUploadCard when charity_profiles row exists for the user", async () => {
    render(<OrganizationProfileTab profileId="profile-123" />);
    await waitFor(() => {
      expect(screen.getByText(/logo & banner/i)).toBeInTheDocument();
    });
  });

  it("shows warning when no charity_profiles row found", async () => {
    mockFetchCharityProfileAssets.mockResolvedValue(null);
    render(<OrganizationProfileTab profileId="profile-123" />);
    await screen.findByRole("button", { name: /save changes/i });
    expect(
      screen.getByText(/logo & banner upload is not available yet/i),
    ).toBeInTheDocument();
  });

  it("falls back to EIN lookup when claimed_by returns nothing", async () => {
    mockFetchCharityProfileAssets.mockResolvedValue(null);
    mockFetchByEin.mockResolvedValue({
      ein: "98-7654321",
      logoUrl: null,
      bannerImageUrl: null,
      claimedByUserId: null,
    });
    mockUseAuth.mockReturnValue({
      ...ownerAuthState,
      user: {
        id: USER_ID,
        user_metadata: { ein: "98-7654321" },
      } as ReturnType<typeof useAuth>["user"],
    });
    render(<OrganizationProfileTab profileId="profile-123" />);
    await waitFor(() => {
      expect(screen.getByText(/logo & banner/i)).toBeInTheDocument();
    });
    expect(mockFetchByEin).toHaveBeenCalledWith("98-7654321");
  });

  it("falls back to signer email when both claimed_by and EIN fail", async () => {
    mockFetchCharityProfileAssets.mockResolvedValue(null);
    mockFetchByEin.mockResolvedValue(null);
    mockFetchByEmail.mockResolvedValue({
      ein: "55-1234567",
      logoUrl: null,
      bannerImageUrl: null,
      claimedByUserId: null,
    });
    mockUseAuth.mockReturnValue({
      ...ownerAuthState,
      user: {
        id: USER_ID,
        email: "signer@example.com",
        user_metadata: {},
      } as ReturnType<typeof useAuth>["user"],
    });
    render(<OrganizationProfileTab profileId="profile-123" />);
    await waitFor(() => {
      expect(screen.getByText(/logo & banner/i)).toBeInTheDocument();
    });
    expect(mockFetchByEmail).toHaveBeenCalledWith("signer@example.com");
  });

  it("falls back to org name when all other lookups fail", async () => {
    mockFetchCharityProfileAssets.mockResolvedValue(null);
    mockFetchByEin.mockResolvedValue(null);
    mockFetchByEmail.mockResolvedValue(null);
    mockFetchByName.mockResolvedValue({
      ein: "77-9999999",
      logoUrl: null,
      bannerImageUrl: null,
      claimedByUserId: null,
    });
    mockUseAuth.mockReturnValue({
      ...ownerAuthState,
      user: {
        id: USER_ID,
        email: "test@example.com",
        user_metadata: { organizationName: "Test Charity" },
      } as ReturnType<typeof useAuth>["user"],
    });
    render(<OrganizationProfileTab profileId="profile-123" />);
    await waitFor(() => {
      expect(screen.getByText(/logo & banner/i)).toBeInTheDocument();
    });
    expect(mockFetchByName).toHaveBeenCalledWith("Test Charity");
  });

  it("shows warning instead of upload card when no user is logged in", async () => {
    mockUseAuth.mockReturnValue({
      ...ownerAuthState,
      user: null,
    });
    render(<OrganizationProfileTab profileId="profile-123" />);
    await screen.findByRole("button", { name: /save changes/i });
    expect(
      screen.getByText(/logo & banner upload is not available yet/i),
    ).toBeInTheDocument();
    expect(mockFetchCharityProfileAssets).not.toHaveBeenCalled();
  });
});
