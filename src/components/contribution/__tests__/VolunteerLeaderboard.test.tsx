import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { useVolunteerLeaderboard } from "@/hooks/useContributionStats";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { VolunteerLeaderboard } from "@/components/contribution/VolunteerLeaderboard.real";

const mockUseVolunteerLeaderboard = jest.mocked(useVolunteerLeaderboard);
const mockUseWalletAlias = jest.mocked(useWalletAlias);

const entries = [
  {
    rank: 1,
    userId: "u1",
    alias: "Ada",
    totalHours: 20,
    formalHours: 20,
    selfReportedHours: 0,
    endorsements: 4,
    organizationsHelped: 1,
  },
  {
    rank: 2,
    userId: "u2",
    alias: "Grace",
    totalHours: 12,
    formalHours: 10,
    selfReportedHours: 2,
    endorsements: 1,
    organizationsHelped: 1,
  },
];

/**
 * Sets the volunteer leaderboard hook result for a test.
 * @param data - Leaderboard entries to return
 * @returns void
 */
const setLeaderboard = (data: typeof entries): void => {
  mockUseVolunteerLeaderboard.mockReturnValue({
    data,
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useVolunteerLeaderboard>);
};

describe("VolunteerLeaderboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseWalletAlias.mockReturnValue({
      getAliasForAddress: jest
        .fn<() => Promise<null>>()
        .mockResolvedValue(null),
    } as unknown as ReturnType<typeof useWalletAlias>);
    setLeaderboard(entries);
  });

  it("passes the time range lower bound to the data hook", () => {
    render(<VolunteerLeaderboard since="2026-01-01" />);
    expect(mockUseVolunteerLeaderboard).toHaveBeenCalledWith(
      10,
      false,
      "2026-01-01",
    );
  });

  it("does not render its own search box", () => {
    render(<VolunteerLeaderboard />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("filters rows by the page search term and reports them", async () => {
    const onRowsChange = jest.fn();
    render(
      <VolunteerLeaderboard searchTerm="ADA" onRowsChange={onRowsChange} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Ada")).toBeInTheDocument();
    });
    expect(screen.queryByText("Grace")).not.toBeInTheDocument();
    expect(onRowsChange).toHaveBeenLastCalledWith([
      {
        rank: 1,
        displayName: "Ada",
        hours: 20,
        endorsements: 4,
        skills: [],
        alias: "Ada",
      },
    ]);
  });

  it("clears rows when a new time range has no hours", async () => {
    const onRowsChange = jest.fn();
    const { rerender } = render(
      <VolunteerLeaderboard onRowsChange={onRowsChange} />,
    );
    await waitFor(() => {
      expect(screen.getByText("Grace")).toBeInTheDocument();
    });

    setLeaderboard([]);
    rerender(
      <VolunteerLeaderboard since="2026-11-10" onRowsChange={onRowsChange} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
    expect(onRowsChange).toHaveBeenLastCalledWith([]);
  });
});
