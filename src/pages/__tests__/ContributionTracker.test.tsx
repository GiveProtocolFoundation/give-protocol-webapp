import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/contexts/ToastContext";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import {
  exportDonationLeaderboardToCSV,
  exportVolunteerLeaderboardToCSV,
} from "@/utils/leaderboardExport";
import {
  supabase,
  setMockResult,
  resetMockState,
} from "@/test-utils/supabaseMock";
import { mockDonationRows } from "@/test-utils/donationLeaderboardMock";
import { mockVolunteerRows } from "@/test-utils/volunteerLeaderboardMock";
import ContributionTracker from "../ContributionTracker";

// Tabs, Button, DonationLeaderboard, VolunteerLeaderboard, GlobalStats,
// RegionFilter, TimeRangeFilter, useWeb3, useToast, useWalletAlias,
// leaderboardExport, and logger are all mocked via moduleNameMapper

const mockUseWeb3 = jest.mocked(useWeb3);
const mockUseToast = jest.mocked(useToast);
const mockUseWalletAlias = jest.mocked(useWalletAlias);
const mockExportDonationCSV = jest.mocked(exportDonationLeaderboardToCSV);
const mockExportVolunteerCSV = jest.mocked(exportVolunteerLeaderboardToCSV);
const mockUseAuth = jest.mocked(useAuth);

const donationRows = [
  { rank: 1, displayName: "Ada", totalDonated: 500, alias: "Ada" },
];
const volunteerRows = [
  {
    rank: 1,
    displayName: "Grace",
    hours: 12,
    endorsements: 3,
    skills: [],
    alias: "Grace",
  },
];

/**
 * Makes useAuth return a signed-in user for the current test.
 * @returns void
 */
const signIn = (): void => {
  mockUseAuth.mockReturnValue({
    ...mockUseAuth.getMockImplementation()?.(),
    user: { id: "auth-user-1" },
  } as ReturnType<typeof useAuth>);
};

/**
 * Returns every upsert call made on Supabase query builders in this test.
 * @returns List of upsert argument arrays
 */
const upsertCalls = (): unknown[][] => {
  const fromMock = supabase.from as unknown as {
    mock: {
      results: { value: { upsert: { mock: { calls: unknown[][] } } } }[];
    };
  };
  return fromMock.mock.results.flatMap(
    (result) => result.value.upsert.mock.calls,
  );
};

interface MockShowToast {
  showToast: jest.Mock;
}

const renderTracker = (initialRoute = "/contributions") =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[initialRoute]}>
        <ContributionTracker />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe("ContributionTracker", () => {
  let mockShowToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    mockDonationRows.current = donationRows;
    mockVolunteerRows.current = volunteerRows;
    mockUseAuth.mockReturnValue({
      ...mockUseAuth.getMockImplementation()?.(),
      user: null,
    } as ReturnType<typeof useAuth>);

    mockShowToast = jest.fn();

    mockUseWeb3.mockReturnValue({
      provider: null,
      signer: null,
      address: null,
      chainId: 8453,
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchChain: jest.fn(),
    });

    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    } as MockShowToast);

    mockUseWalletAlias.mockReturnValue({
      alias: null,
      setAlias: jest.fn<() => Promise<void>>().mockResolvedValue(),
      setWalletAlias: jest.fn().mockResolvedValue(true),
      isLoading: false,
      error: null,
    });
  });

  describe("Page header", () => {
    it("renders the page title", () => {
      renderTracker();
      expect(screen.getByText("Global Impact Rankings")).toBeInTheDocument();
    });

    it("renders the page description", () => {
      renderTracker();
      expect(
        screen.getByText(
          "Track and celebrate the collective impact of our community",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Global stats", () => {
    it("renders the GlobalStats component", () => {
      renderTracker();
      expect(screen.getByTestId("global-stats")).toBeInTheDocument();
    });
  });

  describe("Tabs", () => {
    it("renders Donation Rankings tab", () => {
      renderTracker();
      expect(screen.getByText("Donation Rankings")).toBeInTheDocument();
    });

    it("renders Volunteer Rankings tab", () => {
      renderTracker();
      expect(screen.getByText("Volunteer Rankings")).toBeInTheDocument();
    });

    it("shows Donation Leaderboard by default", () => {
      renderTracker();
      expect(screen.getByTestId("donation-leaderboard")).toBeInTheDocument();
    });

    it("switches to Volunteer Leaderboard when tab is clicked", () => {
      renderTracker();
      const volunteerTab = screen.getByText("Volunteer Rankings");
      fireEvent.click(volunteerTab);
      expect(screen.getByTestId("volunteer-leaderboard")).toBeInTheDocument();
    });

    it("hides Donation Leaderboard when Volunteer tab is active", () => {
      renderTracker();
      const volunteerTab = screen.getByText("Volunteer Rankings");
      fireEvent.click(volunteerTab);
      expect(
        screen.queryByTestId("donation-leaderboard"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Search filter", () => {
    it("renders the search input", () => {
      renderTracker();
      expect(
        screen.getByPlaceholderText("Search contributors..."),
      ).toBeInTheDocument();
    });

    it("renders a single search box for both tabs", () => {
      renderTracker();
      expect(screen.getAllByRole("searchbox")).toHaveLength(1);
      fireEvent.click(screen.getByText("Volunteer Rankings"));
      expect(screen.getAllByRole("searchbox")).toHaveLength(1);
    });

    it("updates search value on input change", () => {
      renderTracker();
      const searchInput = screen.getByPlaceholderText("Search contributors...");
      fireEvent.change(searchInput, { target: { value: "test" } });
      expect(searchInput).toHaveValue("test");
    });
  });

  describe("Export buttons", () => {
    it("renders Export CSV button", () => {
      renderTracker();
      expect(screen.getByText("Export CSV")).toBeInTheDocument();
    });

    it("renders Export PDF button", () => {
      renderTracker();
      expect(screen.getByText("Export PDF")).toBeInTheDocument();
    });

    it("calls donation CSV export when Export CSV is clicked on donations tab", async () => {
      renderTracker();
      const exportButton = screen.getByText("Export CSV");
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockExportDonationCSV).toHaveBeenCalledWith(
          donationRows,
          expect.objectContaining({ timeRange: "all" }),
        );
      });
    });

    it("calls volunteer CSV export when on volunteer tab", async () => {
      renderTracker();
      const volunteerTab = screen.getByText("Volunteer Rankings");
      fireEvent.click(volunteerTab);

      const exportButton = screen.getByText("Export CSV");
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockExportVolunteerCSV).toHaveBeenCalledWith(
          volunteerRows,
          expect.objectContaining({ timeRange: "all" }),
        );
      });
    });

    it("disables both exports when the active tab has no rows", () => {
      mockDonationRows.current = [];
      renderTracker();
      expect(screen.getByText("Export CSV").closest("button")).toBeDisabled();
      expect(screen.getByText("Export PDF").closest("button")).toBeDisabled();
    });

    it("enables exports on a tab that has rows", () => {
      mockDonationRows.current = [];
      renderTracker();
      fireEvent.click(screen.getByText("Volunteer Rankings"));
      expect(
        screen.getByText("Export CSV").closest("button"),
      ).not.toBeDisabled();
    });

    it("shows success toast after CSV export", async () => {
      renderTracker();
      const exportButton = screen.getByText("Export CSV");
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Export Complete",
          "Donation leaderboard exported as CSV",
        );
      });
    });
  });

  describe("Hide from rankings", () => {
    it("is not shown when signed out", () => {
      renderTracker();
      expect(
        screen.queryByText("Hide my contributions from rankings"),
      ).not.toBeInTheDocument();
    });

    it("shows the toggle with its explanation when signed in", () => {
      signIn();
      renderTracker();
      const checkbox = screen.getByRole("checkbox", {
        name: /Hide my contributions from rankings/,
      });
      expect(checkbox).toHaveAccessibleDescription(
        /will not appear in public donation or volunteer rankings/,
      );
    });

    it("reflects a saved hidden setting", async () => {
      setMockResult("user_preferences", {
        data: {
          privacy_settings: { showDonations: false, showVolunteerHours: false },
        },
        error: null,
      });
      signIn();
      renderTracker();
      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeChecked();
      });
    });

    it("saves the setting for the signed-in user and confirms", async () => {
      setMockResult("user_preferences", { data: null, error: null });
      signIn();
      renderTracker();
      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeEnabled();
      });
      fireEvent.click(screen.getByRole("checkbox"));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Privacy setting saved",
        );
      });
      expect(upsertCalls()).toContainEqual([
        {
          user_id: "auth-user-1",
          privacy_settings: { showDonations: false, showVolunteerHours: false },
        },
        { onConflict: "user_id" },
      ]);
      expect(screen.getByRole("checkbox")).toBeChecked();
    });

    it("keeps the toggle disabled when the saved setting cannot be loaded", async () => {
      setMockResult("user_preferences", {
        data: null,
        error: { message: "denied" },
      });
      signIn();
      renderTracker();
      await waitFor(() => {
        expect(supabase.from).toHaveBeenCalledWith("user_preferences");
      });
      expect(screen.getByRole("checkbox")).toBeDisabled();
    });

    it("reverts and reports an error when saving fails", async () => {
      setMockResult("user_preferences", { data: null, error: null });
      signIn();
      renderTracker();
      await waitFor(() => {
        expect(screen.getByRole("checkbox")).toBeEnabled();
      });
      setMockResult("user_preferences", {
        data: null,
        error: { message: "denied" },
      });
      fireEvent.click(screen.getByRole("checkbox"));

      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Could not save your privacy setting. Please try again.",
        );
      });
      expect(screen.getByRole("checkbox")).not.toBeChecked();
    });
  });

  describe("Wallet alias (not connected)", () => {
    it("does not render Set Wallet Alias button when not connected", () => {
      renderTracker();
      expect(screen.queryByText("Set Wallet Alias")).not.toBeInTheDocument();
    });
  });

  describe("Wallet alias (connected)", () => {
    beforeEach(() => {
      mockUseWeb3.mockReturnValue({
        provider: null,
        signer: null,
        address: "0x1234567890123456789012345678901234567890",
        chainId: 8453,
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchChain: jest.fn(),
      });
    });

    it("renders Set Wallet Alias button when connected with no alias", () => {
      renderTracker();
      expect(screen.getByText("Set Wallet Alias")).toBeInTheDocument();
    });

    it("renders current alias when connected with alias set", () => {
      mockUseWalletAlias.mockReturnValue({
        alias: "MyAlias",
        setAlias: jest.fn<() => Promise<void>>().mockResolvedValue(),
        setWalletAlias: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
      });
      renderTracker();
      expect(screen.getByText("MyAlias")).toBeInTheDocument();
    });

    it("renders Change button when alias is set", () => {
      mockUseWalletAlias.mockReturnValue({
        alias: "MyAlias",
        setAlias: jest.fn<() => Promise<void>>().mockResolvedValue(),
        setWalletAlias: jest.fn().mockResolvedValue(true),
        isLoading: false,
        error: null,
      });
      renderTracker();
      expect(screen.getByText("Change")).toBeInTheDocument();
    });

    it("opens alias modal when Set Wallet Alias is clicked", () => {
      renderTracker();
      fireEvent.click(screen.getByText("Set Wallet Alias"));
      expect(screen.getByText("Alias")).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Enter your preferred alias"),
      ).toBeInTheDocument();
    });

    it("closes alias modal when Cancel is clicked", () => {
      renderTracker();
      fireEvent.click(screen.getByText("Set Wallet Alias"));
      expect(
        screen.getByPlaceholderText("Enter your preferred alias"),
      ).toBeInTheDocument();

      fireEvent.click(screen.getByText("Cancel"));
      expect(
        screen.queryByPlaceholderText("Enter your preferred alias"),
      ).not.toBeInTheDocument();
    });
  });
});
