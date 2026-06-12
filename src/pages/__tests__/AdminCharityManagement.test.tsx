import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

const _mockRejectedCharity: AdminCharityListItem = {
  ...mockCharity,
  id: "ch-4",
  name: "Rejected Charity",
  verificationStatus: "rejected" as const,
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

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AdminCharityManagement />
    </MemoryRouter>,
  );

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

  describe("Title and total count", () => {
    it("renders Charity Management title and total count after data loads", () => {
      mockUseAdminCharities.mockReturnValue(
        createHookReturn({
          result: {
            charities: [mockCharity, mockVerifiedCharity],
            totalCount: 2,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        }),
      );
      renderComponent();
      expect(screen.getByText("Charity Management")).toBeInTheDocument();
      expect(screen.getByText("2 total")).toBeInTheDocument();
    });
  });

  describe("Charity table", () => {
    it("renders charity table with data", () => {
      renderComponent();
      expect(screen.getByText("Test Charity")).toBeInTheDocument();
      expect(screen.getByText("12-3456789")).toBeInTheDocument();
      expect(screen.getByText("Jane Doe")).toBeInTheDocument();
      expect(screen.getByText("Name")).toBeInTheDocument();
      expect(screen.getByText("EIN")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Contact")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  describe("Action buttons for pending charities", () => {
    it("shows Approve and Reject buttons for pending charities", () => {
      renderComponent();
      expect(screen.getByText("Approve")).toBeInTheDocument();
      expect(screen.getByText("Reject")).toBeInTheDocument();
    });
  });

  describe("Action buttons for verified charities", () => {
    it("shows Suspend button for verified charities", () => {
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
      expect(screen.getByText("Suspend")).toBeInTheDocument();
    });
  });

  describe("Action buttons for suspended charities", () => {
    it("shows Reinstate button for suspended charities", () => {
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
      expect(screen.getByText("Reinstate")).toBeInTheDocument();
    });
  });

  describe("Action modal", () => {
    it("opens modal when Approve is clicked", async () => {
      renderComponent();
      fireEvent.click(screen.getByText("Approve"));
      await waitFor(() => {
        expect(screen.getByLabelText("Reason")).toBeInTheDocument();
      });
      expect(
        screen.getByRole("heading", { name: "Approve Charity" }),
      ).toBeInTheDocument();
    });

    it("calls approveCharity on confirm", async () => {
      mockApproveCharity.mockResolvedValue(true);
      renderComponent();
      fireEvent.click(screen.getByText("Approve"));
      await waitFor(() => {
        expect(screen.getByLabelText("Reason")).toBeInTheDocument();
      });
      const confirmButtons = screen.getAllByText("Approve Charity");
      const confirmButton = confirmButtons.find(
        (el) => el.tagName === "BUTTON",
      );
      expect(confirmButton).toBeDefined();
      fireEvent.click(confirmButton as HTMLElement);
      await waitFor(() => {
        expect(mockApproveCharity).toHaveBeenCalledWith(
          "ch-1",
          undefined,
          expect.objectContaining({ page: 1, limit: 50 }),
        );
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

  describe("Filter by status", () => {
    it("renders the status filter dropdown", () => {
      renderComponent();
      const statusSelect = screen.getByLabelText("Filter by status");
      expect(statusSelect).toBeInTheDocument();
    });

    it("calls fetchCharities when status filter changes", () => {
      renderComponent();
      const statusSelect = screen.getByLabelText("Filter by status");
      fireEvent.change(statusSelect, { target: { value: "pending" } });
      expect(mockFetchCharities).toHaveBeenCalled();
    });
  });
});
