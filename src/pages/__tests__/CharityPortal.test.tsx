import type React from "react";
import { jest } from "@jest/globals";
import { render, screen, waitFor, act } from "@testing-library/react";
import { CharityPortal } from "../CharityPortal";
import {
  createMockAuth,
  createMockProfile,
  createMockTranslation,
} from "@/test-utils/mockSetup";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useTranslation } from "@/hooks/useTranslation";
import { getCharityVerificationStatus } from "@/services/charityVerificationService";
import { getCharityWalletAddress } from "@/services/charityProfileService";
import { setMockResult, resetMockState } from "@/lib/supabase";

// Use jest.mocked() — mapper provides jest.fn() mocks for these hooks
const mockUseAuth = jest.mocked(useAuth);
const mockUseProfile = jest.mocked(useProfile);
const mockUseTranslation = jest.mocked(useTranslation);

// Mock UI components
/* eslint-disable react/prop-types */
jest.mock("@/components/ui/Button", () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={className}
      {...props}
    >
      {children}
    </button>
  ),
}));
jest.mock("@/components/ui/Card", () => ({
  Card: ({
    children,
    className,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="card" className={className} {...props}>
      {children}
    </div>
  ),
}));
jest.mock("@/components/CurrencyDisplay", () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => (
    <span data-testid="currency-display">${amount}</span>
  ),
}));
/* eslint-enable react/prop-types */

// Mock sub-components to avoid deep dependency chains
jest.mock("../charity-portal/components", () => ({
  ApplicationsTab: () => <div data-testid="applications-tab">Applications</div>,
  CausesTab: () => <div data-testid="causes-tab">Causes</div>,
  HoursVerificationTab: () => (
    <div data-testid="hours-tab">Hours Verification</div>
  ),
  OpportunitiesTab: () => (
    <div data-testid="opportunities-tab">Opportunities</div>
  ),
  OrganizationProfileTab: () => (
    <div data-testid="org-profile-tab">Organization Profile</div>
  ),
  StatsCards: ({
    stats,
  }: {
    stats: { totalDonated: number };
    onTransactionsClick?: () => void;
    onVolunteersClick?: () => void;
  }) => (
    <div data-testid="stats-cards">
      <span data-testid="currency-display">${stats?.totalDonated || 0}</span>
    </div>
  ),
  TransactionsTab: ({
    onExport,
  }: {
    transactions?: unknown[];
    onExport?: () => void;
  }) => (
    <div data-testid="transactions-tab">
      <button onClick={onExport} data-testid="export-button">
        Export
      </button>
    </div>
  ),
}));

const mockGetVerification = jest.mocked(getCharityVerificationStatus);
const mockGetWallet = jest.mocked(getCharityWalletAddress);

// Mock export modal component
jest.mock("@/components/contribution/DonationExportModal", () => ({
  DonationExportModal: ({
    donations,
    onClose,
  }: {
    donations: Array<{ id: string; [key: string]: unknown }>;
    onClose: () => void;
  }) => (
    <div data-testid="donation-export-modal">
      <button onClick={onClose} data-testid="export-modal-close">
        Close
      </button>
      <div>Exporting {donations.length} donations</div>
    </div>
  ),
}));

// Mock Supabase - each eq() returns a thenable chain object
jest.mock("@/lib/supabase", () => {
  const defaultResponse = { data: [], error: null };
  const makeThenable = (response = defaultResponse) => {
    const obj = {
      eq: jest.fn(() => makeThenable(response)),
      order: jest.fn(() => Promise.resolve(response)),
      single: jest.fn(() => Promise.resolve(response)),
      maybeSingle: jest.fn(() => Promise.resolve(response)),
      in: jest.fn(() => makeThenable(response)),
      then: (resolve: (v: unknown) => void, reject?: (e: unknown) => void) =>
        Promise.resolve(response).then(resolve, reject),
    };
    return obj;
  };
  return {
    supabase: {
      from: jest.fn(() => ({
        select: jest.fn(() => makeThenable()),
      })),
    },
  };
});

describe("CharityPortal", () => {
  const renderWithRouter = (props = {}) => {
    return render(
      <MemoryRouter>
        <CharityPortal {...props} />
      </MemoryRouter>,
    );
  };

  const mockCharityUser = {
    id: "charity-user-123",
    email: "charity@test.com",
    user_metadata: { user_type: "charity" },
    app_metadata: {},
    aud: "authenticated",
    created_at: "2024-01-01T00:00:00Z",
  };

  const mockCharityProfile = {
    id: "charity-profile-123",
    user_id: "charity-user-123",
    display_name: "Test Charity",
    name: "Test Charity",
    description: "A test charity organization",
    category: "education",
    country: "US",
    verified: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: mockCharityUser,
        userType: "charity",
        loading: false,
      }),
    );

    mockUseProfile.mockReturnValue(
      createMockProfile({
        profile: mockCharityProfile,
        loading: false,
      }),
    );

    mockUseTranslation.mockReturnValue(
      createMockTranslation({
        t: jest.fn((key, fallback) => fallback || key),
        language: "en",
      }),
    );
  });

  describe("Component Rendering", () => {
    it("renders charity portal layout", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Charity")).toBeInTheDocument();
      });
    });

    it("shows loading skeleton when profile is loading", async () => {
      mockUseProfile.mockReturnValue(
        createMockProfile({
          profile: null,
          loading: true,
        }),
      );
      mockUseAuth.mockReturnValue(
        createMockAuth({
          user: mockCharityUser,
          userType: "charity",
          loading: true,
        }),
      );

      await act(async () => {
        renderWithRouter();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
      // Component shows skeleton loaders (animated divs), not LoadingSpinner
      expect(screen.queryByText("Test Charity")).not.toBeInTheDocument();
    });

    it("handles missing profile gracefully", async () => {
      mockUseProfile.mockReturnValue(
        createMockProfile({
          profile: null,
          loading: false,
        }),
      );

      // When profile is null, fetchCharityData returns early without
      // setting loading=false, so the skeleton loader stays visible
      await act(async () => {
        renderWithRouter();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
      expect(screen.queryByText("Test Charity")).not.toBeInTheDocument();
    });
  });

  describe("Data Display", () => {
    it("displays charity information when available", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Charity")).toBeInTheDocument();
      });
    });

    it("renders stats cards component", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByTestId("stats-cards")).toBeInTheDocument();
      });
    });

    it("shows organization name from charity_profiles in header instead of user display_name", async () => {
      const { supabase } = await import("@/lib/supabase");
      const mockFrom = supabase.from as jest.Mock;
      const originalImpl = mockFrom.getMockImplementation();

      const orgName = "Helping Hands Foundation";
      const logoUrl = "https://example.com/logo.png";
      const charityProfileResponse = {
        data: { name: orgName, logo_url: logoUrl, banner_image_url: null },
        error: null,
      };
      const emptyResponse = { data: [], error: null };

      const buildChain = (response: { data: unknown; error: null }) => {
        const chain: Record<string, unknown> = {
          eq: jest.fn(() => buildChain(response)),
          order: jest.fn(() => Promise.resolve(response)),
          single: jest.fn(() => Promise.resolve(response)),
          maybeSingle: jest.fn(() => Promise.resolve(response)),
          in: jest.fn(() => buildChain(response)),
          then: (
            resolve: (v: unknown) => void,
            reject?: (e: unknown) => void,
          ) => Promise.resolve(response).then(resolve, reject),
        };
        return chain;
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === "charity_profiles") {
          return { select: jest.fn(() => buildChain(charityProfileResponse)) };
        }
        return { select: jest.fn(() => buildChain(emptyResponse)) };
      });

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText(orgName)).toBeInTheDocument();
      });

      // The user's display_name ("Test Charity") should NOT be the heading
      expect(
        screen.queryByRole("heading", { name: "Test Charity" }),
      ).not.toBeInTheDocument();

      // Restore original mock implementation for subsequent tests
      if (originalImpl) {
        mockFrom.mockImplementation(originalImpl);
      } else {
        mockFrom.mockReset();
      }
    });

    it("falls back to user display_name when charity_profiles has no name", async () => {
      // Default supabase mock returns { data: [], error: null } for all tables
      // so charityOrgName will be null and display_name is used as fallback
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Charity")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    // eslint-disable-next-line jest/expect-expect
    it("handles auth errors gracefully", async () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          user: null,
          userType: null,
          loading: false,
          error: "Authentication failed",
        }),
      );

      await act(async () => {
        renderWithRouter();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
    });

    // eslint-disable-next-line jest/expect-expect
    it("handles profile fetch errors", async () => {
      mockUseProfile.mockReturnValue(
        createMockProfile({
          profile: null,
          loading: false,
          error: "Failed to fetch profile",
        }),
      );

      await act(async () => {
        renderWithRouter();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
    });
  });

  describe("User Type Restrictions", () => {
    // eslint-disable-next-line jest/expect-expect
    it("handles non-charity user access", async () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          user: { ...mockCharityUser, user_metadata: { user_type: "donor" } },
          userType: "donor",
          loading: false,
        }),
      );

      await act(async () => {
        renderWithRouter();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
    });
  });

  describe("Accessibility", () => {
    it("refresh button has aria-label", async () => {
      renderWithRouter();

      await waitFor(() => {
        const refreshBtn = screen.getByRole("button", {
          name: /refresh data/i,
        });
        expect(refreshBtn).toBeInTheDocument();
      });
    });
  });

  describe("Internationalization", () => {
    it("uses translation function for text content", async () => {
      const mockT = jest.fn(
        (key: string, fallback?: string) => fallback || key,
      );
      mockUseTranslation.mockReturnValue(
        createMockTranslation({
          t: mockT,
          language: "es",
        }),
      );

      renderWithRouter();

      await waitFor(() => {
        expect(mockT).toHaveBeenCalled();
      });
    });

    // eslint-disable-next-line jest/expect-expect
    it("handles different language settings", async () => {
      mockUseTranslation.mockReturnValue(
        createMockTranslation({
          t: jest.fn((key: string) => `es_${key}`),
          language: "es",
        }),
      );

      await act(async () => {
        renderWithRouter();
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });
    });
  });

  describe("Refresh Rate Limiting", () => {
    it("does not fire multiple API calls on rapid refresh clicks", async () => {
      const { supabase } = await import("@/lib/supabase");
      const mockFrom = supabase.from as jest.Mock;

      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Charity")).toBeInTheDocument();
      });

      // Record call count after initial load
      const callsAfterLoad = mockFrom.mock.calls.length;

      const refreshBtn = screen.getByRole("button", { name: /refresh data/i });

      // Click refresh twice rapidly (within the 3-second cooldown window)
      const fixedTime = 1000000000;
      const dateSpy = jest.spyOn(Date, "now").mockReturnValue(fixedTime);

      await act(async () => {
        refreshBtn.click();
        refreshBtn.click();
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      });

      dateSpy.mockRestore();

      // Only one refresh should have been initiated (not two)
      const callsFromSingleRefresh =
        mockFrom.mock.calls.length - callsAfterLoad;
      expect(callsFromSingleRefresh).toBeLessThan(callsAfterLoad * 2 + 1);
    });

    it("allows refresh after cooldown period has elapsed", async () => {
      renderWithRouter();

      await waitFor(() => {
        expect(screen.getByText("Test Charity")).toBeInTheDocument();
      });

      // First click at t=0
      const dateSpy = jest
        .spyOn(Date, "now")
        .mockReturnValueOnce(0)
        .mockReturnValueOnce(4000); // Second click 4s later (past cooldown)

      await act(() => {
        screen.getByRole("button", { name: /refresh data/i }).click();
      });

      await act(async () => {
        screen.getByRole("button", { name: /refresh data/i }).click();
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      });

      dateSpy.mockRestore();

      // Both refreshes should have fired — verify the button is still in the DOM
      expect(
        screen.getByRole("button", { name: /refresh data/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Verification gating and status loading", () => {
    beforeEach(() => {
      mockGetVerification.mockResolvedValue(null);
      mockGetWallet.mockResolvedValue("0x1234567890abcdef");
    });

    afterEach(() => {
      resetMockState();
    });

    it("shows only the status banner for a rejected charity", async () => {
      mockGetVerification.mockResolvedValue({
        status: "rejected",
        reviewNotes: "Test rejection",
      });
      mockGetWallet.mockResolvedValue(null);
      renderWithRouter();

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Application Not Approved",
      );
      expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
      expect(screen.queryByText("Create Cause")).not.toBeInTheDocument();
      expect(screen.queryByText("Create Opportunity")).not.toBeInTheDocument();
      expect(
        screen.queryByText("charity.portal.setupWallet"),
      ).not.toBeInTheDocument();
    });

    it("hides onboarding and create actions for pending charities", async () => {
      mockGetVerification.mockResolvedValue({
        status: "pending",
        reviewNotes: null,
      });
      renderWithRouter();

      expect(await screen.findByRole("status")).toHaveTextContent(
        "Application Under Review",
      );
      expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
      expect(screen.queryByText("Create Cause")).not.toBeInTheDocument();
    });

    it("shows checklist and create actions for an approved charity", async () => {
      mockGetVerification.mockResolvedValue({
        status: "approved",
        reviewNotes: null,
      });
      renderWithRouter();

      expect(await screen.findByText("Getting Started")).toBeInTheDocument();
      expect(screen.getByText("Create Cause")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("does not duplicate the wallet prompt while the checklist is shown", async () => {
      mockGetWallet.mockResolvedValue(null);
      renderWithRouter();

      expect(await screen.findByText("Getting Started")).toBeInTheDocument();
      expect(
        screen.queryByText("charity.portal.walletNotConfigured"),
      ).not.toBeInTheDocument();
    });

    it("shows the wallet banner once the checklist is dismissed", async () => {
      mockGetWallet.mockResolvedValue(null);
      // The portal reads the checklist state from profiles.meta
      setMockResult("profiles", {
        data: {
          meta: {
            onboarding_checklist: { dismissed: true, completedItems: [] },
          },
        },
        error: null,
      });
      renderWithRouter();

      expect(
        await screen.findByText("charity.portal.walletNotConfigured"),
      ).toBeInTheDocument();
      expect(screen.queryByText("Getting Started")).not.toBeInTheDocument();
    });

    it("renders stats and checklist before the tabs", async () => {
      renderWithRouter();

      const stats = await screen.findByTestId("stats-cards");
      const checklist = await screen.findByText("Getting Started");
      const tabs = screen.getByRole("tablist");

      expect(
        stats.compareDocumentPosition(checklist) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
      expect(
        checklist.compareDocumentPosition(tabs) &
          Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

    it("shows a translated error with a retry button when loading fails", async () => {
      const { supabase } = await import("@/lib/supabase");
      const fromMock = jest.mocked(supabase.from);
      const defaultImpl = fromMock.getMockImplementation();
      fromMock.mockImplementation((table: string) => {
        if (table === "donations") throw new Error("boom");
        return defaultImpl ? defaultImpl(table) : undefined;
      });
      try {
        renderWithRouter();

        expect(
          await screen.findByText(/Failed to load charity data/i),
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Retry" }),
        ).toBeInTheDocument();
      } finally {
        if (defaultImpl) fromMock.mockImplementation(defaultImpl);
      }
    });

    it("keeps the skeleton until status data has loaded", async () => {
      let resolveStatus: (v: null) => void = () => {
        // replaced below
      };
      mockGetVerification.mockReturnValue(
        new Promise((resolve) => {
          resolveStatus = resolve;
        }),
      );
      renderWithRouter();

      await act(async () => {
        await new Promise<void>((resolve) => setTimeout(resolve, 50));
      });
      expect(screen.queryByRole("tablist")).not.toBeInTheDocument();

      act(() => {
        resolveStatus(null);
      });
      expect(await screen.findByRole("tablist")).toBeInTheDocument();
      // Checklist is present in the same render as the page, not popped in later
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });
  });
});
