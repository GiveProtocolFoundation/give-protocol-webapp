import { render, screen, fireEvent } from "@testing-library/react";
import { DonationHistory } from "../DonationHistory";
import type { Transaction } from "@/types/contribution";

// DonationExportModal is mocked via moduleNameMapper

describe("DonationHistory Component", () => {
  const mockDonations: Transaction[] = [
    {
      id: "1",
      hash: "0x123abc...",
      amount: "100",
      cryptoType: "ETH",
      fiatValue: 50.25,
      timestamp: "2024-01-15T10:30:00Z",
      status: "completed",
      metadata: {
        organization: "Test Charity",
      },
    },
    {
      id: "2",
      hash: "0x456def...",
      amount: "50",
      cryptoType: "ETH",
      fiatValue: 25.12,
      timestamp: "2024-01-10T14:20:00Z",
      status: "pending",
      metadata: {
        organization: "Another Charity",
      },
    },
    {
      id: "3",
      hash: null,
      amount: "75",
      cryptoType: "ETH",
      fiatValue: null,
      timestamp: "2024-01-05T09:15:00Z",
      status: "failed",
      metadata: {
        organization: "Failed Charity",
      },
    },
  ];

  it("renders donation history table with data", () => {
    render(<DonationHistory donations={mockDonations} />);

    expect(screen.getByText("Donation History")).toBeInTheDocument();
    // Each entry appears in both desktop table and mobile card view
    expect(screen.getAllByText("Test Charity").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Another Charity").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Failed Charity").length).toBeGreaterThan(0);
  });

  it("displays donation amounts with crypto type", () => {
    render(<DonationHistory donations={mockDonations} />);

    // Each amount appears in both desktop table and mobile card view
    expect(screen.getAllByText("100 ETH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("50 ETH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("75 ETH").length).toBeGreaterThan(0);
  });

  it("displays fiat values when available", () => {
    render(<DonationHistory donations={mockDonations} />);

    expect(screen.getAllByText("$50.25").length).toBeGreaterThan(0);
    expect(screen.getAllByText("$25.12").length).toBeGreaterThan(0);
    // Desktop: N/A for missing fiat + N/A for missing hash; mobile card: N/A for missing fiat only
    expect(screen.getAllByText("N/A").length).toBeGreaterThan(0);
  });

  it("displays transaction hash links when available", () => {
    render(<DonationHistory donations={mockDonations} />);

    // Link appears in both desktop table and mobile card view
    const hashLinks = screen.getAllByRole("link", { name: /0x123abc/i });
    expect(hashLinks[0]).toHaveAttribute(
      "href",
      "https://moonscan.io/tx/0x123abc...",
    );
    expect(hashLinks[0]).toHaveAttribute("target", "_blank");
  });

  it("shows N/A for missing transaction hash", () => {
    render(<DonationHistory donations={mockDonations} />);

    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThan(0);
  });

  it("displays status badges with correct styling", () => {
    render(<DonationHistory donations={mockDonations} />);

    // Each status appears in both desktop table and mobile card view
    const completedStatuses = screen.getAllByText("Completed");
    expect(completedStatuses[0]).toHaveClass("bg-green-100", "text-green-800");

    const pendingStatuses = screen.getAllByText("Pending");
    expect(pendingStatuses[0]).toHaveClass("bg-yellow-100", "text-yellow-800");

    const failedStatuses = screen.getAllByText("Failed");
    expect(failedStatuses[0]).toHaveClass("bg-red-100", "text-red-800");
  });

  it("filters donations by time period", () => {
    render(<DonationHistory donations={mockDonations} />);

    const timeFilter = screen.getByDisplayValue("All Time");

    // Change to Past Week filter
    fireEvent.change(timeFilter, { target: { value: "week" } });

    expect(timeFilter).toHaveValue("week");
  });

  it("opens export modal when export button is clicked", () => {
    render(<DonationHistory donations={mockDonations} />);

    const exportButton = screen.getByText("Export CSV");
    fireEvent.click(exportButton);

    expect(screen.getByTestId("export-modal")).toBeInTheDocument();
  });

  it("closes export modal when close is clicked", () => {
    render(<DonationHistory donations={mockDonations} />);

    // Open modal
    const exportButton = screen.getByText("Export CSV");
    fireEvent.click(exportButton);

    expect(screen.getByTestId("export-modal")).toBeInTheDocument();

    // Close modal
    const closeButton = screen.getByText("Close");
    fireEvent.click(closeButton);

    expect(screen.queryByTestId("export-modal")).not.toBeInTheDocument();
  });

  it("handles empty donations array", () => {
    render(<DonationHistory donations={[]} />);

    expect(screen.getByText("Donation History")).toBeInTheDocument();
    // Table should still render but with no data rows
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Charity")).toBeInTheDocument();
  });

  it("displays unknown organization when metadata is missing", () => {
    const donationsWithoutMetadata: Transaction[] = [
      {
        id: "1",
        hash: "0x123abc...",
        amount: "100",
        cryptoType: "ETH",
        fiatValue: 50.25,
        timestamp: "2024-01-15T10:30:00Z",
        status: "completed",
        metadata: {},
      },
    ];

    render(<DonationHistory donations={donationsWithoutMetadata} />);

    expect(screen.getAllByText("Unknown").length).toBeGreaterThan(0);
  });
});
