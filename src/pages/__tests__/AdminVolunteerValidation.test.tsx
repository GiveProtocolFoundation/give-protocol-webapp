import { jest } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAdminVolunteerValidation } from "@/hooks/useAdminVolunteerValidation";
import AdminVolunteerValidation from "../admin/AdminVolunteerValidation";
import type {
  AdminValidationRequestItem,
  AdminValidationStats,
  AdminSuspiciousVolunteerPattern,
} from "@/types/adminVolunteerValidation";

// useAdminVolunteerValidation is mocked via moduleNameMapper
const mockUseAdminVolunteerValidation = jest.mocked(
  useAdminVolunteerValidation,
);

const mockStats: AdminValidationStats = {
  totalPending: 10,
  totalApproved: 50,
  totalRejected: 5,
  totalExpired: 3,
  avgResponseTimeHours: 24.5,
  expirationRate: 0.044,
  rejectionRate: 0.074,
  pendingByOrg: [],
};

const mockRequest: AdminValidationRequestItem = {
  id: "req-1",
  volunteerId: "vol-1",
  volunteerDisplayName: "Alice Smith",
  volunteerEmail: "alice@example.com",
  orgId: "org-1",
  orgName: "Local Food Bank",
  hoursReported: 8,
  activityDate: "2025-03-15",
  status: "pending" as const,
  validatorUserId: null,
  validatedAt: null,
  expiresAt: null,
  createdAt: "2025-03-16T10:00:00Z",
};

const mockApprovedRequest: AdminValidationRequestItem = {
  ...mockRequest,
  id: "req-2",
  volunteerDisplayName: "Charlie Brown",
  volunteerEmail: "charlie@example.com",
  status: "approved" as const,
};

const mockPattern: AdminSuspiciousVolunteerPattern = {
  volunteerId: "vol-2",
  volunteerDisplayName: "Bob Jones",
  volunteerEmail: "bob@example.com",
  orgId: "org-2",
  orgName: "City Shelter",
  weeklyHours: 45,
  totalRequests: 12,
};

const mockFetchStats = jest.fn().mockReturnValue(Promise.resolve());
const mockFetchRequests = jest.fn().mockReturnValue(Promise.resolve());
const mockSubmitOverride = jest.fn();
const mockFetchSuspiciousPatterns = jest
  .fn()
  .mockReturnValue(Promise.resolve());

const createHookReturn = (overrides = {}) => ({
  stats: mockStats,
  statsLoading: false,
  result: {
    requests: [mockRequest],
    totalCount: 1,
    page: 1,
    limit: 50,
    totalPages: 1,
  },
  loading: false,
  overriding: false,
  suspiciousPatterns: [] as AdminSuspiciousVolunteerPattern[],
  patternsLoading: false,
  fetchStats: mockFetchStats,
  fetchRequests: mockFetchRequests,
  submitOverride: mockSubmitOverride,
  fetchSuspiciousPatterns: mockFetchSuspiciousPatterns,
  ...overrides,
});

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AdminVolunteerValidation />
    </MemoryRouter>,
  );

describe("AdminVolunteerValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAdminVolunteerValidation.mockReturnValue(createHookReturn());
  });

  describe("Loading state", () => {
    it("shows loading spinner when stats are loading", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({ statsLoading: true, stats: null }),
      );
      renderComponent();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Title and total count", () => {
    it("renders Volunteer Validation Oversight title and total count", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({
          result: {
            requests: [mockRequest],
            totalCount: 68,
            page: 1,
            limit: 50,
            totalPages: 2,
          },
        }),
      );
      renderComponent();
      expect(
        screen.getByText("Volunteer Validation Oversight"),
      ).toBeInTheDocument();
      expect(screen.getByText("68 total requests")).toBeInTheDocument();
    });
  });

  describe("Pipeline statistics", () => {
    it("renders Pending, Approved, Rejected, and Expired counts", () => {
      renderComponent();
      // Stats labels also appear as filter dropdown options; verify by count
      expect(screen.getAllByText("Pending")).toHaveLength(2);
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getAllByText("Approved")).toHaveLength(2);
      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.getAllByText("Rejected")).toHaveLength(2);
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getAllByText("Expired")).toHaveLength(2);
      expect(screen.getByText("3")).toBeInTheDocument();
    });

    it("renders Pipeline Statistics heading", () => {
      renderComponent();
      expect(screen.getByText("Pipeline Statistics")).toBeInTheDocument();
    });
  });

  describe("Rate row stats", () => {
    it("renders avg response time, expiration rate, and rejection rate", () => {
      renderComponent();
      expect(screen.getByText("24.5h")).toBeInTheDocument();
      expect(screen.getByText("4.4%")).toBeInTheDocument();
      expect(screen.getByText("7.4%")).toBeInTheDocument();
    });
  });

  describe("Validation request table", () => {
    it("renders validation request table with data", () => {
      renderComponent();
      expect(screen.getByText("Alice Smith")).toBeInTheDocument();
      expect(screen.getByText("Local Food Bank")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("2025-03-15")).toBeInTheDocument();
      expect(screen.getByText("pending")).toBeInTheDocument();
      expect(screen.getByText("2025-03-16")).toBeInTheDocument();
    });

    it("renders table column headers", () => {
      renderComponent();
      expect(screen.getByText("Volunteer")).toBeInTheDocument();
      expect(screen.getByText("Organisation")).toBeInTheDocument();
      expect(screen.getByText("Hours")).toBeInTheDocument();
      expect(screen.getByText("Activity Date")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Created")).toBeInTheDocument();
    });
  });

  describe("Override button visibility", () => {
    it("shows Override button for pending requests", () => {
      renderComponent();
      expect(screen.getByText("Override")).toBeInTheDocument();
    });

    it("does not show Override button for approved requests", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({
          result: {
            requests: [mockApprovedRequest],
            totalCount: 1,
            page: 1,
            limit: 50,
            totalPages: 1,
          },
        }),
      );
      renderComponent();
      expect(screen.queryByText("Override")).not.toBeInTheDocument();
    });
  });

  describe("Override modal", () => {
    it("opens override modal on Override click", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Override"));
      expect(
        screen.getByText("Override Validation Request"),
      ).toBeInTheDocument();
      expect(screen.getByText("Confirm Override")).toBeInTheDocument();
    });

    it("renders status select and reason textarea in modal", () => {
      renderComponent();
      fireEvent.click(screen.getByText("Override"));
      expect(document.getElementById("override-status")).toBeInTheDocument();
      expect(document.getElementById("override-reason")).toBeInTheDocument();
    });
  });

  describe("Tab switching", () => {
    it("switches to Suspicious Patterns tab", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({ suspiciousPatterns: [mockPattern] }),
      );
      renderComponent();
      fireEvent.click(
        screen.getByText("Suspicious Patterns", { exact: false }),
      );
      expect(
        screen.getByText(/Volunteers flagged for reporting/),
      ).toBeInTheDocument();
    });

    it("shows red badge with count on Suspicious Patterns tab", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({ suspiciousPatterns: [mockPattern] }),
      );
      renderComponent();
      expect(screen.getByText("1")).toBeInTheDocument();
    });
  });

  describe("Suspicious patterns table", () => {
    it("renders suspicious patterns table with data", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({ suspiciousPatterns: [mockPattern] }),
      );
      renderComponent();
      fireEvent.click(
        screen.getByText("Suspicious Patterns", { exact: false }),
      );
      expect(screen.getByText("Bob Jones")).toBeInTheDocument();
      expect(screen.getByText("City Shelter")).toBeInTheDocument();
      expect(screen.getByText("45")).toBeInTheDocument();
      expect(screen.getByText("12")).toBeInTheDocument();
    });
  });

  describe("Empty states", () => {
    it("shows empty state for validation requests", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({
          result: {
            requests: [],
            totalCount: 0,
            page: 1,
            limit: 50,
            totalPages: 0,
          },
        }),
      );
      renderComponent();
      expect(
        screen.getByText("No validation requests found."),
      ).toBeInTheDocument();
    });

    it("shows empty state for suspicious patterns", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({ suspiciousPatterns: [] }),
      );
      renderComponent();
      fireEvent.click(screen.getByText("Suspicious Patterns"));
      expect(
        screen.getByText("No suspicious patterns detected."),
      ).toBeInTheDocument();
    });

    it("shows no statistics message when stats are null", () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({ stats: null }),
      );
      renderComponent();
      expect(screen.getByText("No statistics available.")).toBeInTheDocument();
    });
  });

  describe("Filter by status", () => {
    it("calls fetchRequests with updated filter when status changes", async () => {
      renderComponent();
      const statusSelect = screen.getByLabelText("Filter by status");
      fireEvent.change(statusSelect, { target: { value: "approved" } });
      await waitFor(() => {
        expect(mockFetchRequests).toHaveBeenCalledWith(
          expect.objectContaining({ status: "approved", page: 1 }),
        );
      });
    });
  });

  describe("Search input", () => {
    it("calls fetchRequests when search input changes", async () => {
      renderComponent();
      const searchInput = screen.getByLabelText("Search validation requests");
      fireEvent.change(searchInput, { target: { value: "Alice" } });
      await waitFor(() => {
        expect(mockFetchRequests).toHaveBeenCalledWith(
          expect.objectContaining({ search: "Alice", page: 1 }),
        );
      });
    });
  });

  describe("Pagination", () => {
    it("renders pagination and handles next click", async () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({
          result: {
            requests: [mockRequest],
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
        expect(mockFetchRequests).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2 }),
        );
      });
    });

    it("handles previous page click", async () => {
      mockUseAdminVolunteerValidation.mockReturnValue(
        createHookReturn({
          result: {
            requests: [mockRequest],
            totalCount: 100,
            page: 2,
            limit: 50,
            totalPages: 3,
          },
        }),
      );
      renderComponent();

      fireEvent.click(screen.getByRole("button", { name: "Previous" }));
      await waitFor(() => {
        expect(mockFetchRequests).toHaveBeenCalledWith(
          expect.objectContaining({ page: 1 }),
        );
      });
    });
  });

  describe("Confirm override", () => {
    it("submits override with status and reason when Confirm Override is clicked", async () => {
      mockSubmitOverride.mockResolvedValue(true);
      renderComponent();

      fireEvent.click(screen.getByText("Override"));
      expect(
        screen.getByText("Override Validation Request"),
      ).toBeInTheDocument();

      const statusSelect = document.getElementById(
        "override-status",
      ) as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: "rejected" } });

      const reasonTextarea = document.getElementById(
        "override-reason",
      ) as HTMLTextAreaElement;
      fireEvent.change(reasonTextarea, {
        target: { value: "Hours look inflated" },
      });

      fireEvent.click(screen.getByRole("button", { name: "Confirm Override" }));
      await waitFor(() => {
        expect(mockSubmitOverride).toHaveBeenCalledWith(
          {
            requestId: "req-1",
            newStatus: "rejected",
            reason: "Hours look inflated",
          },
          expect.objectContaining({ page: 1, limit: 50 }),
          {
            volunteerId: "vol-1",
            volunteerDisplayName: "Alice Smith",
            orgName: "Local Food Bank",
            hoursReported: 8,
            activityDate: "2025-03-15",
          },
        );
      });
    });
  });
});
