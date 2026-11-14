import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, waitFor } from "@testing-library/react";
import { useDonorLeaderboard } from "@/hooks/useContributionStats";
import { useWalletAlias } from "@/hooks/useWalletAlias";
import { DonationLeaderboard } from "@/components/contribution/DonationLeaderboard.real";

const mockUseDonorLeaderboard = jest.mocked(useDonorLeaderboard);
const mockUseWalletAlias = jest.mocked(useWalletAlias);

const entries = [
  {
    rank: 1,
    userId: "u1",
    alias: "Ada",
    totalDonated: 500,
    donationCount: 2,
    organizationsSupported: 1,
  },
  {
    rank: 2,
    userId: "u2",
    alias: "Grace",
    totalDonated: 300,
    donationCount: 1,
    organizationsSupported: 1,
  },
];

/**
 * Sets the donor leaderboard hook result for a test.
 * @param data - Leaderboard entries to return
 * @returns void
 */
const setLeaderboard = (data: typeof entries): void => {
  mockUseDonorLeaderboard.mockReturnValue({
    data,
    isLoading: false,
    error: null,
  } as unknown as ReturnType<typeof useDonorLeaderboard>);
};

describe("DonationLeaderboard", () => {
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
    render(<DonationLeaderboard since="2026-11-01" />);
    expect(mockUseDonorLeaderboard).toHaveBeenCalledWith(10, "2026-11-01");
  });

  it("does not render its own search box", () => {
    render(<DonationLeaderboard />);
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("filters rows by the page search term and reports them", async () => {
    const onRowsChange = jest.fn();
    render(
      <DonationLeaderboard searchTerm="gra" onRowsChange={onRowsChange} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Grace")).toBeInTheDocument();
    });
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
    expect(onRowsChange).toHaveBeenLastCalledWith([
      { rank: 2, displayName: "Grace", totalDonated: 300, alias: "Grace" },
    ]);
  });

  it("clears rows when a new time range has no donations", async () => {
    const onRowsChange = jest.fn();
    const { rerender } = render(
      <DonationLeaderboard onRowsChange={onRowsChange} />,
    );
    await waitFor(() => {
      expect(screen.getByText("Ada")).toBeInTheDocument();
    });

    setLeaderboard([]);
    rerender(
      <DonationLeaderboard since="2026-11-10" onRowsChange={onRowsChange} />,
    );

    await waitFor(() => {
      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
    expect(onRowsChange).toHaveBeenLastCalledWith([]);
  });
});
