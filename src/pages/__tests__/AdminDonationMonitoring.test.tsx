import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAdminDonations } from "@/hooks/useAdminDonations";
import AdminDonationMonitoring from "../admin/AdminDonationMonitoring";
import type { AdminDonationListItem } from "@/types/adminDonation";

// useAdminDonations is mocked via moduleNameMapper
const mockUseAdminDonations = jest.mocked(useAdminDonations);

const mockDonation: AdminDonationListItem = {
  id: "don-1",
  paymentMethod: "crypto" as const,
  amount: 15000,
  amountUsd: 150.0,
  currency: "ETH",
  donorDisplayName: "Jane Doe",
  donorEmail: "jane@example.com",
  donorUserId: "user-1",
  charityName: "Test Charity",
  charityId: "ch-1",
  txHash: "0xabcdef1234567890abcdef1234567890",
  processorId: null,
  status: "completed",
  createdAt: "2025-03-01T12:00:00Z",
  isFlagged: false,
  openFlagCount: 0,
};

const mockFlaggedDonation: AdminDonationListItem = {
  ...mockDonation,
  id: "don-2",
  isFlagged: true,
  openFlagCount: 2,
};

const mockResolvedDonation: AdminDonationListItem = {
  ...mockDonation,
  id: "don-3",
  isFlagged: true,
  openFlagCount: 0,
};

const mockFetchDonations = jest.fn();
const mockFetchSummary = jest.fn();
const mockSubmitFlag = jest.fn();
const mockSubmitResolveFlag = jest.fn();
const mockExportCsv = jest.fn();

const createHookReturn = (overrides = {}) => ({
  result: {
    donations: [mockDonation],
    totalCount: 1,
    page: 1,
    limit: 50,
    totalPages: 1,
  },
  loading: false,
  flagging: false,
  summary: [],
  summaryLoading: false,
  fetchDonations: mockFetchDonations,
  fetchSummary: mockFetchSummary,
  submitFlag: mockSubmitFlag,
  submitResolveFlag: mockSubmitResolveFlag,
  exportCsv: mockExportCsv,
  ...overrides,
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AdminDonationMonitoring />
    </MemoryRouter>,
  );

describe("AdminDonationMonitoring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminDonations.mockReturnValue(createHookReturn());
  });

  describe("Loading state", () => {
    it("shows loading spinner when loading and donations are empty", () => {
      mockUseAdminDonations.mockReturnValue(
        createHookReturn({
          loading: true,
          result: {
            donations: [],
            totalCount: 0,
            page: 1,
            limit: 50,
            totalPages: 0,
          },
        }),
      );
      renderComponent();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Title and total count", () => {
    it("renders Donation Monitoring title and total count", () => {
      mockUseAdminDonations.mockReturnValue(
        createHookReturn({
          result: {
            donations: [mockDonation, mockFlaggedDonation],
            totalCount: 2,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        }),
      );
      renderComponent();
      expect(screen.getByText("Donation Monitoring")).toBeInTheDocument();
      expect(screen.getByText("2 total")).toBeInTheDocument();
    });
  });

  describe("Donation table", () => {
    it("renders donation table with data", () => {
      renderComponent();
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("Test Charity")).toBeInTheDocument();
      expect(screen.getByText("$150.00")).toBeInTheDocument();
      expect(screen.getByText("crypto")).toBeInTheDocument();
    });
  });

  describe("Flag button for unflagged donation", () => {
    it("shows Flag button for unflagged donation", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: "Flag" })).toBeInTheDocument();
    });
  });

  describe("Resolved text for flagged donation with no open flags", () => {
    it("shows Resolved for flagged donation with no open flags", () => {
      mockUseAdminDonations.mockReturnValue(
        createHookReturn({
          result: {
            donations: [mockResolvedDonation],
            totalCount: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        }),
      );
      renderComponent();
      expect(screen.getByText("Resolved")).toBeInTheDocument();
    });
  });

  describe("Flag modal", () => {
    it("opens flag modal on Flag click", async () => {
      renderComponent();
      fireEvent.click(screen.getByRole("button", { name: "Flag" }));
      await waitFor(() => {
        expect(
          screen.getByText("Flag Donation for Review"),
        ).toBeInTheDocument();
      });
      expect(
        screen.getByPlaceholderText(
          "Describe why this donation is suspicious\u2026",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("Flag Donation")).toBeInTheDocument();
    });
  });

  describe("Report panel toggle", () => {
    it("toggles report panel visibility", () => {
      renderComponent();
      expect(
        screen.queryByText("Donation Summary Report"),
      ).not.toBeInTheDocument();
      fireEvent.click(screen.getByText("Generate Report"));
      expect(screen.getByText("Donation Summary Report")).toBeInTheDocument();
      expect(screen.getByText("Hide Report")).toBeInTheDocument();
      fireEvent.click(screen.getByText("Hide Report"));
      expect(
        screen.queryByText("Donation Summary Report"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows empty state message when no donations match filters", () => {
      mockUseAdminDonations.mockReturnValue(
        createHookReturn({
          result: {
            donations: [],
            totalCount: 0,
            page: 1,
            limit: 50,
            totalPages: 0,
          },
        }),
      );
      renderComponent();
      expect(
        screen.getByText("No donations found matching your filters."),
      ).toBeInTheDocument();
    });
  });

  describe("Filter by payment method", () => {
    it("calls fetchDonations with updated filter when payment method changes", async () => {
      renderComponent();
      const paymentSelect = screen.getByLabelText("Filter by payment method");
      fireEvent.change(paymentSelect, { target: { value: "crypto" } });
      await waitFor(() => {
        expect(mockFetchDonations).toHaveBeenCalledWith(
          expect.objectContaining({ paymentMethod: "crypto", page: 1 }),
        );
      });
    });
  });

  describe("Filter by flagged status", () => {
    it("calls fetchDonations with flagged filter when flagged dropdown changes", async () => {
      renderComponent();
      const flaggedSelect = screen.getByLabelText("Filter by flag status");
      fireEvent.change(flaggedSelect, { target: { value: "true" } });
      await waitFor(() => {
        expect(mockFetchDonations).toHaveBeenCalledWith(
          expect.objectContaining({ flagged: true, page: 1 }),
        );
      });
    });
  });

  describe("Search input", () => {
    it("calls fetchDonations with search filter when search input changes", async () => {
      renderComponent();
      const searchInput = screen.getByLabelText("Search donations");
      fireEvent.change(searchInput, { target: { value: "test query" } });
      await waitFor(() => {
        expect(mockFetchDonations).toHaveBeenCalledWith(
          expect.objectContaining({ search: "test query", page: 1 }),
        );
      });
    });
  });

  describe("Pagination", () => {
    it("renders pagination and handles next/prev clicks", async () => {
      mockUseAdminDonations.mockReturnValue(
        createHookReturn({
          result: {
            donations: [mockDonation],
            totalCount: 100,
            page: 1,
            limit: 50,
            totalPages: 2,
          },
        }),
      );
      renderComponent();
      expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => {
        expect(mockFetchDonations).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 }),
        );
      });
    });

    it("handles previous page click", async () => {
      mockUseAdminDonations.mockReturnValue(
        createHookReturn({
          result: {
            donations: [mockDonation],
            totalCount: 100,
            page: 2,
            limit: 50,
            totalPages: 2,
          },
        }),
      );
      renderComponent();

      fireEvent.click(screen.getByRole("button", { name: "Next" }));
      await waitFor(() => {
        expect(mockFetchDonations).toHaveBeenCalled();
      });

      fireEvent.click(screen.getByRole("button", { name: "Previous" }));
      await waitFor(() => {
        expect(mockFetchDonations).toHaveBeenCalled();
      });
    });
  });

  describe("Confirm flag submission", () => {
    it("submits flag with reason when Flag Donation is clicked", async () => {
      mockSubmitFlag.mockResolvedValue(true);
      renderComponent();

      fireEvent.click(screen.getByRole("button", { name: "Flag" }));
      await waitFor(() => {
        expect(
          screen.getByText("Flag Donation for Review"),
        ).toBeInTheDocument();
      });

      const reasonTextarea = screen.getByPlaceholderText(
        "Describe why this donation is suspicious\u2026",
      );
      fireEvent.change(reasonTextarea, {
        target: { value: "Suspicious activity" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Flag Donation" }));
      await waitFor(() => {
        expect(mockSubmitFlag).toHaveBeenCalledWith(
          expect.objectContaining({
            donationId: "don-1",
            donationType: "crypto",
            reason: "Suspicious activity",
          }),
          expect.objectContaining({ page: 1, limit: 50 }),
        );
      });
    });
  });

  describe("Report generation", () => {
    it("calls fetchSummary when Generate is clicked with dates", async () => {
      mockFetchSummary.mockImplementation(() => Promise.resolve());
      const { container } = render(
        <MemoryRouter>
          <AdminDonationMonitoring />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByText("Generate Report"));
      expect(screen.getByText("Donation Summary Report")).toBeInTheDocument();

      const dateInputs = container.querySelectorAll('input[type="date"]');
      expect(dateInputs).toHaveLength(2);

      fireEvent.change(dateInputs[0], { target: { value: "2025-01-01" } });
      fireEvent.change(dateInputs[1], { target: { value: "2025-03-31" } });

      fireEvent.click(screen.getByRole("button", { name: "Generate" }));
      await waitFor(() => {
        expect(mockFetchSummary).toHaveBeenCalledWith(
          "2025-01-01T00:00:00Z",
          "2025-03-31T23:59:59Z",
          "charity",
        );
      });
    });
  });

  describe("CSV export", () => {
    it("calls exportCsv when Export CSV is clicked", () => {
      const summaryData = [
        {
          groupKey: "group-1",
          paymentMethod: "crypto" as const,
          totalAmountUsd: 500.0,
          donationCount: 10,
          charityName: "Test Charity",
          charityId: "ch-1",
        },
      ];
      mockUseAdminDonations.mockReturnValue(
        createHookReturn({ summary: summaryData }),
      );
      renderComponent();

      fireEvent.click(screen.getByText("Generate Report"));
      expect(screen.getByText("Export CSV")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Export CSV"));
      expect(mockExportCsv).toHaveBeenCalledWith(
        summaryData,
        expect.stringContaining("donation-summary-"),
      );
    });
  });
});
