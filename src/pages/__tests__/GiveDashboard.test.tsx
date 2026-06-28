import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { GiveDashboard } from "../GiveDashboard";
import {
  createMockAuth,
  createMockWeb3,
  createMockTranslation,
} from "@/test-utils/mockSetup";
import { useAuth } from "@/contexts/AuthContext";
import { useWeb3 } from "@/contexts/Web3Context";
import { useTranslation } from "@/hooks/useTranslation";
import {
  useUserContributionStats,
  useUnifiedContributions,
} from "@/hooks/useContributionStats";

// Use jest.mocked() — mapper provides jest.fn() mocks for these hooks
const mockUseAuth = jest.mocked(useAuth);
const mockUseWeb3 = jest.mocked(useWeb3);
const mockUseTranslation = jest.mocked(useTranslation);
const mockUseUserContributionStats = jest.mocked(useUserContributionStats);
const mockUseUnifiedContributions = jest.mocked(useUnifiedContributions);

const baseStats = {
  userId: "1",
  totalDonated: 2000,
  donationCount: 5,
  totalFiatDonated: 450,
  fiatDonationCount: 3,
  formalVolunteerHours: 30,
  selfReportedHours: {
    validated: 18,
    pending: 0,
    unvalidated: 0,
    total: 18,
  },
  totalVolunteerHours: 48,
  skillsEndorsed: 12,
  organizationsHelped: 4,
};

const baseContribution = {
  id: "test-contribution-1",
  type: "donation" as const,
  userId: "test-user-id",
  date: "2024-01-01T00:00:00Z",
  organizationName: "Test Charity",
  amount: 1,
  status: "completed" as const,
  createdAt: "2024-01-01T00:00:00Z",
};

jest.mock("@/utils/date", () => ({
  formatDate: jest.fn((date: string) => date),
}));

jest.mock("@/utils/logger", () => ({
  Logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

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
/* eslint-enable react/prop-types */

jest.mock("@/components/CurrencyDisplay", () => ({
  CurrencyDisplay: ({ amount }: { amount: number }) => (
    <span data-testid="currency-display">${amount}</span>
  ),
}));

jest.mock("@/components/contribution/DonationExportModal", () => ({
  DonationExportModal: ({
    donations,
    onClose,
  }: {
    donations: Array<{ id: string }>;
    onClose: () => void;
  }) => (
    <div data-testid="export-modal">
      <span>Export Modal - {donations.length} donations</span>
      <button onClick={onClose}>Close Export</button>
    </div>
  ),
}));

jest.mock("@/components/settings/WalletAliasSettings", () => ({
  WalletAliasSettings: () => (
    <div data-testid="wallet-settings">Wallet Alias Settings</div>
  ),
}));

jest.mock("@/components/donor/ScheduledDonations", () => ({
  ScheduledDonations: () => (
    <div data-testid="scheduled-donations">Scheduled Donations</div>
  ),
}));

jest.mock("@/components/volunteer/self-reported", () => ({
  SelfReportedHoursDashboard: ({ onToggle }: { onToggle: () => void }) => (
    <div data-testid="volunteer-hours">
      <button onClick={onToggle}>Toggle Hours</button>
    </div>
  ),
}));

jest.mock("@/hooks/useProfile", () => ({
  useProfile: () => ({
    profile: { id: "profile-1", user_id: "1", type: "donor", created_at: "" },
    loading: false,
    error: null,
  }),
}));

jest.mock("@/hooks/useContributionStats");

const renderWithRouter = (initialEntries = ["/give-dashboard"]) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <GiveDashboard />
    </MemoryRouter>,
  );
};

describe("GiveDashboard", () => {
  const mockUser = { id: "1", email: "test@example.com" };

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue(
      createMockAuth({
        user: mockUser,
        userType: "donor",
      }),
    );

    mockUseWeb3.mockReturnValue(
      createMockWeb3({
        address: "0x1234567890123456789012345678901234567890",
        isConnected: true,
      }),
    );

    mockUseTranslation.mockReturnValue(createMockTranslation());

    // Reset contribution mocks each test so cross-file mutations from other
    // suites cannot leak in (jest.clearAllMocks only clears call history,
    // not implementations set via mockReturnValue elsewhere).
    mockUseUserContributionStats.mockReturnValue({
      data: baseStats,
      isLoading: false,
    } as never);
    mockUseUnifiedContributions.mockReturnValue({
      data: [baseContribution],
      isLoading: false,
    } as never);
  });

  describe("Authentication and Access Control", () => {
    it("renders dashboard when user is authenticated and connected", () => {
      renderWithRouter();
      expect(screen.getByText("dashboard.title")).toBeInTheDocument();
    });

    it("redirects when user is not authenticated and wallet not connected", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({ user: null, userType: null }),
      );
      mockUseWeb3.mockReturnValue(createMockWeb3({ isConnected: false }));

      renderWithRouter();
      // Navigate component redirects, so dashboard title should not appear
      expect(screen.queryByText("dashboard.title")).not.toBeInTheDocument();
    });

    it("shows dashboard when wallet is connected even without auth user", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({ user: null, userType: null }),
      );
      mockUseWeb3.mockReturnValue(createMockWeb3({ isConnected: true }));

      renderWithRouter();
      expect(screen.getByText("dashboard.title")).toBeInTheDocument();
    });

    it("redirects charity users to charity portal", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          user: mockUser,
          userType: "charity",
        }),
      );

      renderWithRouter();
      expect(screen.queryByText("dashboard.title")).not.toBeInTheDocument();
    });

    it("shows admin page for admin users", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({
          user: mockUser,
          userType: "admin",
        }),
      );

      renderWithRouter();
      expect(screen.getByText("Admin Dashboard")).toBeInTheDocument();
      expect(screen.getByText("Go to Admin Panel")).toBeInTheDocument();
    });
  });

  describe("Wallet Connection", () => {
    it("shows dashboard when user is authenticated but wallet not connected", () => {
      mockUseWeb3.mockReturnValue(
        createMockWeb3({ address: null, isConnected: false }),
      );

      renderWithRouter();
      // Dashboard renders normally even without wallet connection
      expect(screen.getByText("dashboard.title")).toBeInTheDocument();
    });
  });

  describe("Dashboard Layout", () => {
    it("displays dashboard title and subtitle", () => {
      renderWithRouter();
      expect(screen.getByText("dashboard.title")).toBeInTheDocument();
      expect(screen.getByText("dashboard.subtitle")).toBeInTheDocument();
    });

    it("renders action buttons", () => {
      renderWithRouter();
      expect(screen.getByText(/Wallet Settings/)).toBeInTheDocument();
      expect(screen.getByText(/Monthly Donations/)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Log Volunteer Hours/ }),
      ).toBeInTheDocument();
    });

    it("renders stats cards", () => {
      renderWithRouter();
      expect(screen.getByText("dashboard.totalDonations")).toBeInTheDocument();
      expect(screen.getByText("dashboard.volunteerHours")).toBeInTheDocument();
      expect(screen.getByText("dashboard.skillsEndorsed")).toBeInTheDocument();
    });
  });

  describe("Filter Functionality", () => {
    it("renders year filter dropdown", () => {
      renderWithRouter();
      const yearFilter = screen.getByLabelText("Filter by year");
      expect(yearFilter).toBeInTheDocument();
    });

    it("renders type filter dropdown", () => {
      renderWithRouter();
      const typeFilter = screen.getByLabelText("Filter by type");
      expect(typeFilter).toBeInTheDocument();
    });

    it("handles year filter change", () => {
      renderWithRouter();
      const yearFilter = screen.getByLabelText("Filter by year");
      // With no contributions, only "all" is available; verify the filter is present and functional
      fireEvent.change(yearFilter, { target: { value: "all" } });
      expect(yearFilter).toHaveValue("all");
    });

    it("handles type filter change", () => {
      renderWithRouter();
      const typeFilter = screen.getByLabelText("Filter by type");
      fireEvent.change(typeFilter, { target: { value: "Donation" } });
      expect(typeFilter).toHaveValue("Donation");
    });
  });

  describe("Table Display", () => {
    it("displays contribution table headers", () => {
      renderWithRouter();
      expect(screen.getByText("contributions.date")).toBeInTheDocument();
      expect(screen.getByText("contributions.type")).toBeInTheDocument();
      expect(
        screen.getByText("contributions.organization"),
      ).toBeInTheDocument();
      expect(screen.getByText("contributions.details")).toBeInTheDocument();
      expect(screen.getByText("contributions.status")).toBeInTheDocument();
      expect(
        screen.getByText("contributions.verification"),
      ).toBeInTheDocument();
    });

    it("displays contribution section title", () => {
      renderWithRouter();
      expect(screen.getByText("dashboard.contributions")).toBeInTheDocument();
    });

    it("handles column sort click", () => {
      renderWithRouter();
      const dateHeader = screen.getByText("contributions.date");
      fireEvent.click(dateHeader);
      expect(dateHeader).toBeInTheDocument();
    });
  });

  describe("Modal Functionality", () => {
    it("toggles wallet settings section", () => {
      renderWithRouter();

      // Initially hidden
      expect(screen.queryByTestId("wallet-settings")).not.toBeInTheDocument();

      // Click Wallet Settings button
      fireEvent.click(screen.getByText(/Wallet Settings/));
      expect(screen.getByTestId("wallet-settings")).toBeInTheDocument();

      // Click again to hide
      fireEvent.click(screen.getByText(/Wallet Settings/));
      expect(screen.queryByTestId("wallet-settings")).not.toBeInTheDocument();
    });

    it("toggles scheduled donations section", () => {
      renderWithRouter();

      expect(
        screen.queryByTestId("scheduled-donations"),
      ).not.toBeInTheDocument();

      fireEvent.click(screen.getByText(/Monthly Donations/));
      expect(screen.getByTestId("scheduled-donations")).toBeInTheDocument();
    });

    it("toggles volunteer hours section", () => {
      renderWithRouter();

      expect(screen.queryByTestId("volunteer-hours")).not.toBeInTheDocument();

      fireEvent.click(
        screen.getByRole("button", { name: /Log Volunteer Hours/ }),
      );
      expect(screen.getByTestId("volunteer-hours")).toBeInTheDocument();
    });

    it("opens and closes export modal", async () => {
      renderWithRouter();

      // Click export button
      fireEvent.click(screen.getByText("contributions.export"));
      expect(screen.getByTestId("export-modal")).toBeInTheDocument();

      // Close modal
      fireEvent.click(screen.getByText("Close Export"));
      await waitFor(() => {
        expect(screen.queryByTestId("export-modal")).not.toBeInTheDocument();
      });
    });
  });

  describe("Skills and Endorsements", () => {
    it("does not render hardcoded skills section", () => {
      renderWithRouter();
      expect(screen.queryByText("Web Development")).not.toBeInTheDocument();
      expect(screen.queryByText("Project Management")).not.toBeInTheDocument();
      expect(screen.queryByText("Event Planning")).not.toBeInTheDocument();
    });
  });
});
