import { jest } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { PersonalContributions } from "../PersonalContributions";
import { useUserContributionStats } from "@/hooks/useContributionStats";

jest.mock("@/hooks/useContributionStats", () => ({
  useUserContributionStats: jest.fn(),
}));

jest.mock("../DonationStats", () => ({
  DonationStats: ({
    stats,
    isPersonal,
  }: {
    stats?: { totalDonated: number };
    isPersonal?: boolean;
  }) => (
    <div data-testid="donation-stats">
      {stats
        ? JSON.stringify({ totalDonated: stats.totalDonated })
        : "No stats"}
      {isPersonal ? " (personal)" : ""}
    </div>
  ),
}));

jest.mock("../RecentContributions", () => ({
  RecentContributions: () => (
    <div data-testid="recent-contributions">Recent Contributions</div>
  ),
}));

jest.mock("../VolunteerImpact", () => ({
  VolunteerImpact: () => (
    <div data-testid="volunteer-impact">Volunteer Impact</div>
  ),
}));

jest.mock("@/components/ui/LoadingSpinner", () => ({
  LoadingSpinner: () => <div data-testid="loading-spinner">Loading...</div>,
}));

const mockUseUserContributionStats = jest.mocked(useUserContributionStats);

const mockUserStats = {
  totalDonated: 125,
  formalVolunteerHours: 10,
  selfReportedHours: { validated: 3, pending: 1, total: 5 },
  totalVolunteerHours: 15,
  skillsEndorsed: 3,
  organizationsHelped: 2,
};

describe("PersonalContributions", () => {
  beforeEach(() => {
    mockUseUserContributionStats.mockReturnValue({
      data: mockUserStats,
      isLoading: false,
      error: null,
    } as ReturnType<typeof useUserContributionStats>);
  });

  it("shows loading state when isLoading is true", () => {
    mockUseUserContributionStats.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    } as ReturnType<typeof useUserContributionStats>);

    render(<PersonalContributions />);

    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("renders DonationStats with data when loaded", () => {
    render(<PersonalContributions />);

    expect(screen.getByTestId("donation-stats")).toBeInTheDocument();
    expect(
      screen.getByText(/{"totalDonated":125}/, { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/\(personal\)/, { exact: false }),
    ).toBeInTheDocument();
  });

  it("renders RecentContributions and VolunteerImpact sub-components", () => {
    render(<PersonalContributions />);

    expect(screen.getByTestId("recent-contributions")).toBeInTheDocument();
    expect(screen.getByTestId("volunteer-impact")).toBeInTheDocument();
  });

  it("handles error state", () => {
    mockUseUserContributionStats.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Failed to load"),
    } as ReturnType<typeof useUserContributionStats>);

    render(<PersonalContributions />);

    expect(
      screen.getByText("Error loading contribution stats. Please try again."),
    ).toBeInTheDocument();
  });
});
