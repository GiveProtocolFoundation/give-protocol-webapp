import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAdminCharities } from "@/hooks/useAdminCharities";
import AdminCharityManagement from "../admin/AdminCharityManagement";
import type { AdminCharityListItem } from "@/types/adminCharity";

// useAdminCharities is mocked via moduleNameMapper
const mockUseAdminCharities = jest.mocked(useAdminCharities);

const mockCharity: AdminCharityListItem = {
  id: "ch-1",
  name: "Test Charity",
  category: "Education",
  verificationStatus: "pending" as const,
  createdAt: "2025-01-15T00:00:00Z",
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  userId: null,
  logoUrl: null,
  mission: null,
  verificationId: null,
  reviewNotes: null,
  reviewedAt: null,
  updatedAt: "2025-01-15T00:00:00Z",
  ein: "12-3456789",
  signerName: "Jane Doe",
  signerEmail: "jane@example.org",
  signerPhone: null,
  claimedAt: "2025-01-15T00:00:00Z",
  charityProfileStatus: "claimed-pending",
};

const mockVerifiedCharity: AdminCharityListItem = {
  ...mockCharity,
  id: "ch-2",
  name: "Verified Charity",
  verificationStatus: "verified" as const,
};

const mockSuspendedCharity: AdminCharityListItem = {
  ...mockCharity,
  id: "ch-3",
  name: "Suspended Charity",
  verificationStatus: "suspended" as const,
};

const mockFetchCharities = jest.fn();
const mockApproveCharity = jest.fn();
const mockRejectCharity = jest.fn();
const mockSuspendCharity = jest.fn();
const mockReinstateCharity = jest.fn();

const createHookReturn = (overrides = {}) => ({
  result: {
    charities: [mockCharity],
    totalCount: 1,
    page: 1,
    limit: 50,
    totalPages: 1,
  },
  loading: false,
  updating: false,
  fetchCharities: mockFetchCharities,
  approveCharity: mockApproveCharity,
  rejectCharity: mockRejectCharity,
  suspendCharity: mockSuspendCharity,
  reinstateCharity: mockReinstateCharity,
  ...overrides,
});

const renderComponent = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminCharityManagement />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe("AdminCharityManagement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminCharities.mockReturnValue(createHookReturn());
  });

  describe("Loading state", () => {
    it("shows loading spinner when loading and charities are empty", () => {
      mockUseAdminCharities.mockReturnValue(
        createHookReturn({
          loading: true,
          result: {
            charities: [],
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

  describe("Data table", () => {
    it("renders the table column headers", () => {
      renderComponent();
      expect(screen.getByText("Organization")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Raised")).toBeInTheDocument();
      expect(screen.getByText("Submitted")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });

    it("renders charity rows with name, EIN, and a Review action", () => {
      renderComponent();
      expect(screen.getByText("Test Charity")).toBeInTheDocument();
      expect(screen.getByText("EIN 12-3456789")).toBeInTheDocument();
      expect(screen.getByText("Review")).toBeInTheDocument();
    });
  });

  describe("Status tabs", () => {
    it("renders the status filter tabs", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /All/ })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /Pending/ }),
      ).toBeInTheDocument();
    });

    it("refetches with a status filter when a tab is selected", async () => {
      renderComponent();
      mockFetchCharities.mockClear();
      fireEvent.click(screen.getByRole("button", { name: /Pending/ }));
      await waitFor(() => {
        expect(mockFetchCharities).toHaveBeenCalledWith(
          expect.objectContaining({ status: "pending" }),
        );
      });
    });
  });

  describe("Review modal", () => {
    it("opens the review modal with contextual actions for a pending charity", async () => {
      renderComponent();
      fireEvent.click(screen.getByText("Review"));
      await waitFor(() => {
        expect(screen.getByLabelText("Reason")).toBeInTheDocument();
      });
      expect(
        screen.getByRole("heading", { name: /Review Test Charity/ }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Approve" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Reject" }),
      ).toBeInTheDocument();
    });

    it("calls approveCharity on approve", async () => {
      mockApproveCharity.mockResolvedValue(true);
      renderComponent();
      fireEvent.click(screen.getByText("Review"));
      await waitFor(() => {
        expect(screen.getByLabelText("Reason")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole("button", { name: "Approve" }));
      await waitFor(() => {
        expect(mockApproveCharity).toHaveBeenCalledWith(
          "ch-1",
          undefined,
          expect.objectContaining({ page: 1, limit: 50 }),
        );
      });
    });

    it("shows a Suspend action for verified charities", async () => {
      mockUseAdminCharities.mockReturnValue(
        createHookReturn({
          result: {
            charities: [mockVerifiedCharity],
            totalCount: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        }),
      );
      renderComponent();
      fireEvent.click(screen.getByText("Review"));
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Suspend" }),
        ).toBeInTheDocument();
      });
    });

    it("shows a Reinstate action for suspended charities", async () => {
      mockUseAdminCharities.mockReturnValue(
        createHookReturn({
          result: {
            charities: [mockSuspendedCharity],
            totalCount: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        }),
      );
      renderComponent();
      fireEvent.click(screen.getByText("Review"));
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Reinstate" }),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Empty state", () => {
    it("shows empty state message when no charities match filters", () => {
      mockUseAdminCharities.mockReturnValue(
        createHookReturn({
          result: {
            charities: [],
            totalCount: 0,
            page: 1,
            limit: 50,
            totalPages: 0,
          },
        }),
      );
      renderComponent();
      expect(
        screen.getByText("No charities found matching your filters."),
      ).toBeInTheDocument();
    });
  });
});
