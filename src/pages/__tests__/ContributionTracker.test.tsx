import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useWeb3 } from "@/contexts/Web3Context";
import { useToast } from "@/contexts/ToastContext";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import {
  exportDonationLeaderboardToCSV,
  exportVolunteerLeaderboardToCSV,
} from "@/utils/leaderboardExport";
import ContributionTracker from "../ContributionTracker";

// Tabs, Button, DonationLeaderboard, VolunteerLeaderboard, GlobalStats,
// RegionFilter, TimeRangeFilter, useWeb3, useToast, useWalletAlias,
// leaderboardExport, and logger are all mocked via moduleNameMapper

const mockUseWeb3 = jest.mocked(useWeb3);
const mockUseToast = jest.mocked(useToast);
const mockUseWalletAlias = jest.mocked(useWalletAlias);
const mockExportDonationCSV = jest.mocked(exportDonationLeaderboardToCSV);
const mockExportVolunteerCSV = jest.mocked(exportVolunteerLeaderboardToCSV);

interface MockShowToast {
  showToast: jest.Mock;
}

const renderTracker = (initialRoute = "/contributions") =>
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <ContributionTracker />
    </MemoryRouter>,
  );

describe("ContributionTracker", () => {
  let mockShowToast: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockShowToast = jest.fn();

    mockUseWeb3.mockReturnValue({
      provider: null,
      signer: null,
      address: null,
      chainId: 1287,
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
        expect(mockExportDonationCSV).toHaveBeenCalled();
      });
    });

    it("calls volunteer CSV export when on volunteer tab", async () => {
      renderTracker();
      const volunteerTab = screen.getByText("Volunteer Rankings");
      fireEvent.click(volunteerTab);

      const exportButton = screen.getByText("Export CSV");
      fireEvent.click(exportButton);
      await waitFor(() => {
        expect(mockExportVolunteerCSV).toHaveBeenCalled();
      });
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

  describe("Opt-out checkbox", () => {
    it("renders the opt-out checkbox", () => {
      renderTracker();
      expect(
        screen.getByText("Hide my contributions from rankings"),
      ).toBeInTheDocument();
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
        chainId: 1287,
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
