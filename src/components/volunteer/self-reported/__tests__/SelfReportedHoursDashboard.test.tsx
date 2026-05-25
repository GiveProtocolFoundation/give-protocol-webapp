import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useSelfReportedHours } from "@/hooks/useSelfReportedHours";
import { SelfReportedHoursDashboard } from "../SelfReportedHoursDashboard";
import type {
  SelfReportedHoursDisplay,
  VolunteerHoursStats,
} from "@/types/selfReportedHours";
import { ActivityType, ValidationStatus } from "@/types/selfReportedHours";

// useSelfReportedHours is mocked via moduleNameMapper (ESM-compatible).
// Sub-components (Stats, List, Form) render their real implementations
// with mocked leaf dependencies (Button, Card, LoadingSpinner, etc.).

const mockUseSelfReportedHours = jest.mocked(useSelfReportedHours);

const createMockRecord = (
  overrides: Partial<SelfReportedHoursDisplay> = {},
): SelfReportedHoursDisplay => ({
  id: "rec-1",
  volunteerId: "vol-1",
  activityDate: "2024-01-15",
  hours: 4,
  activityType: ActivityType.DIRECT_SERVICE,
  description: "Helped with food distribution at local food bank",
  location: "Community Center",
  organizationName: "Local Food Bank",
  validationStatus: ValidationStatus.UNVALIDATED,
  createdAt: "2024-01-15T10:00:00Z",
  updatedAt: "2024-01-15T10:00:00Z",
  organizationDisplayName: "Local Food Bank",
  isVerifiedOrganization: false,
  canEdit: true,
  canDelete: true,
  canRequestValidation: false,
  ...overrides,
});

const createMockStats = (
  overrides: Partial<VolunteerHoursStats> = {},
): VolunteerHoursStats => ({
  totalValidatedHours: 20,
  totalUnvalidatedHours: 10,
  totalPendingHours: 5,
  totalRejectedHours: 2,
  totalExpiredHours: 0,
  recordCount: 5,
  recordsByStatus: {
    [ValidationStatus.VALIDATED]: 2,
    [ValidationStatus.UNVALIDATED]: 1,
    [ValidationStatus.PENDING]: 1,
    [ValidationStatus.REJECTED]: 1,
    [ValidationStatus.EXPIRED]: 0,
  },
  ...overrides,
});

interface MockHookReturnValue {
  hours: SelfReportedHoursDisplay[];
  stats: VolunteerHoursStats | null;
  loading: boolean;
  error: string | null;
  filters: Record<string, unknown>;
  setFilters: jest.Mock;
  createHours: jest.Mock;
  updateHours: jest.Mock;
  deleteHours: jest.Mock;
  requestHoursValidation: jest.Mock;
  cancelRequest: jest.Mock;
  resubmitRequest: jest.Mock;
  refetch: jest.Mock;
  getHoursById: jest.Mock;
}

const createHookMock = (
  overrides: Partial<MockHookReturnValue> = {},
): MockHookReturnValue => ({
  hours: [],
  stats: null,
  loading: false,
  error: null,
  filters: {},
  setFilters: jest.fn(),
  createHours: jest.fn(),
  updateHours: jest.fn(),
  deleteHours: jest.fn(),
  requestHoursValidation: jest.fn(),
  cancelRequest: jest.fn(),
  resubmitRequest: jest.fn(),
  refetch: jest.fn(),
  getHoursById: jest.fn(),
  ...overrides,
});

const renderDashboard = (
  props: Partial<{
    collapsed: boolean;
    onToggle: () => void;
  }> = {},
) =>
  render(
    <MemoryRouter>
      <SelfReportedHoursDashboard {...props} />
    </MemoryRouter>,
  );

describe("SelfReportedHoursDashboard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelfReportedHours.mockReturnValue(createHookMock());
  });

  describe("Collapsed state", () => {
    it("renders nothing when collapsed is true", () => {
      const { container } = renderDashboard({ collapsed: true });
      expect(container.innerHTML).toBe("");
    });

    it("renders content when collapsed is false", () => {
      renderDashboard({ collapsed: false });
      expect(screen.getByText("Volunteer Hours")).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows loading spinner when loading with no hours", () => {
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({ loading: true, hours: [] }),
      );
      renderDashboard();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });

    it("renders the dashboard header when loading with existing hours", () => {
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          loading: true,
          hours: [createMockRecord()],
        }),
      );
      renderDashboard();
      expect(screen.getByText("Volunteer Hours")).toBeInTheDocument();
    });
  });

  describe("Error state", () => {
    it("displays the error message when there is an error", () => {
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({ error: "Failed to load volunteer hours" }),
      );
      renderDashboard();
      expect(
        screen.getByText("Failed to load volunteer hours"),
      ).toBeInTheDocument();
    });

    it("does not show the header when in error state", () => {
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({ error: "Some error" }),
      );
      renderDashboard();
      expect(screen.queryByText("Volunteer Hours")).not.toBeInTheDocument();
    });
  });

  describe("Header", () => {
    it("renders the Volunteer Hours heading", () => {
      renderDashboard();
      expect(screen.getByText("Volunteer Hours")).toBeInTheDocument();
    });

    it("renders the Log Hours button in list view", () => {
      renderDashboard();
      expect(screen.getByText("Log Hours")).toBeInTheDocument();
    });

    it("renders the Close button when onToggle prop is provided", () => {
      const mockToggle = jest.fn();
      renderDashboard({ onToggle: mockToggle });
      const closeButton = screen.getByText("Close");
      expect(closeButton).toBeInTheDocument();
    });

    it("calls onToggle when Close button is clicked", () => {
      const mockToggle = jest.fn();
      renderDashboard({ onToggle: mockToggle });
      fireEvent.click(screen.getByText("Close"));
      expect(mockToggle).toHaveBeenCalledTimes(1);
    });

    it("does not render Close button when onToggle is not provided", () => {
      renderDashboard();
      expect(screen.queryByText("Close")).not.toBeInTheDocument();
    });
  });

  describe("Info banner", () => {
    it("does not show the info banner by default", () => {
      renderDashboard();
      expect(
        screen.queryByText("About Self-Reported Hours"),
      ).not.toBeInTheDocument();
    });

    it("shows the info banner when the info button is clicked", () => {
      renderDashboard();
      const infoButton = screen.getByTitle("About Self-Reported Hours");
      fireEvent.click(infoButton);
      expect(screen.getByText("About Self-Reported Hours")).toBeInTheDocument();
    });

    it("hides the info banner when the info button is toggled again", () => {
      renderDashboard();
      const infoButton = screen.getByTitle("About Self-Reported Hours");
      fireEvent.click(infoButton);
      expect(screen.getByText("About Self-Reported Hours")).toBeInTheDocument();

      fireEvent.click(infoButton);
      expect(
        screen.queryByText("About Self-Reported Hours"),
      ).not.toBeInTheDocument();
    });
  });

  describe("List view with stats", () => {
    it("renders stats cards when records exist and stats have data", () => {
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [createMockRecord()],
          stats: createMockStats(),
        }),
      );
      renderDashboard();
      // Real SelfReportedHoursStats renders these labels
      expect(screen.getByText("Validated Hours")).toBeInTheDocument();
      expect(screen.getByText("Pending Validation")).toBeInTheDocument();
      expect(screen.getByText("Unvalidated Hours")).toBeInTheDocument();
    });

    it("does not render stats when recordCount is 0", () => {
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [createMockRecord()],
          stats: createMockStats({ recordCount: 0 }),
        }),
      );
      renderDashboard();
      expect(screen.queryByText("Validated Hours")).not.toBeInTheDocument();
    });

    it("renders the record card from the hours list", () => {
      const mockRecord = createMockRecord({
        organizationDisplayName: "Red Cross",
      });
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [mockRecord],
        }),
      );
      renderDashboard();
      // Real SelfReportedHoursCard shows the org name
      expect(screen.getByText("Red Cross")).toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows the empty state message when there are no hours", () => {
      mockUseSelfReportedHours.mockReturnValue(createHookMock({ hours: [] }));
      renderDashboard();
      // Real SelfReportedHoursList renders this text for empty state
      expect(
        screen.getByText("No volunteer hours logged yet"),
      ).toBeInTheDocument();
    });
  });

  describe("Create view", () => {
    it("switches to create view when Log Hours button is clicked", () => {
      renderDashboard();
      fireEvent.click(screen.getByText("Log Hours"));
      expect(screen.getByText("Log Volunteer Hours")).toBeInTheDocument();
    });

    it("renders the form with description field in create mode", () => {
      renderDashboard();
      fireEvent.click(screen.getByText("Log Hours"));
      // Real SelfReportedHoursForm renders a description textarea
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    });

    it("hides the header Log Hours button when in create view", () => {
      renderDashboard();
      fireEvent.click(screen.getByText("Log Hours"));
      // The header "Log Hours" button is hidden; the form's submit button
      // also says "Log Hours" but is inside the form
      expect(screen.getByText("Log Volunteer Hours")).toBeInTheDocument();
    });

    it("returns to list view when cancel is clicked in create form", () => {
      renderDashboard();
      fireEvent.click(screen.getByText("Log Hours"));
      fireEvent.click(screen.getByText("Cancel"));
      // After cancel, we see the empty state again
      expect(
        screen.getByText("No volunteer hours logged yet"),
      ).toBeInTheDocument();
    });
  });

  describe("Edit view", () => {
    it("switches to edit view when edit is triggered from list", async () => {
      const mockRecord = createMockRecord({ id: "rec-edit" });
      const mockGetHoursById =
        jest.fn<(_id: string) => Promise<SelfReportedHoursDisplay | null>>();
      mockGetHoursById.mockResolvedValue(mockRecord);
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [mockRecord],
          getHoursById: mockGetHoursById,
        }),
      );
      renderDashboard();

      fireEvent.click(screen.getByText("Edit"));

      await waitFor(() => {
        expect(screen.getByText("Edit Record")).toBeInTheDocument();
      });
    });
  });

  describe("View details", () => {
    it("switches to view mode when view is triggered from list", async () => {
      const mockRecord = createMockRecord({ id: "rec-view" });
      const mockGetHoursById =
        jest.fn<(_id: string) => Promise<SelfReportedHoursDisplay | null>>();
      mockGetHoursById.mockResolvedValue(mockRecord);
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [mockRecord],
          getHoursById: mockGetHoursById,
        }),
      );
      renderDashboard();

      fireEvent.click(screen.getByText("View"));

      await waitFor(() => {
        expect(screen.getByText("Record Details")).toBeInTheDocument();
      });
      expect(screen.getByText("Back to List")).toBeInTheDocument();
    });

    it("returns to list view when Back to List is clicked", async () => {
      const mockRecord = createMockRecord({ id: "rec-back" });
      const mockGetHoursById =
        jest.fn<(_id: string) => Promise<SelfReportedHoursDisplay | null>>();
      mockGetHoursById.mockResolvedValue(mockRecord);
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [mockRecord],
          getHoursById: mockGetHoursById,
        }),
      );
      renderDashboard();

      fireEvent.click(screen.getByText("View"));

      await waitFor(() => {
        expect(screen.getByText("Back to List")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText("Back to List"));
      // Should return to list view showing the record's org name
      expect(screen.getByText("Local Food Bank")).toBeInTheDocument();
    });
  });

  describe("Delete confirmation", () => {
    it("shows delete confirmation modal when delete is triggered", () => {
      const mockRecord = createMockRecord({ id: "rec-del" });
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [mockRecord],
        }),
      );
      renderDashboard();

      fireEvent.click(screen.getByText("Delete"));
      expect(screen.getByText("Delete Record?")).toBeInTheDocument();
      expect(
        screen.getByText(/are you sure you want to delete/i),
      ).toBeInTheDocument();
    });

    it("closes delete modal when Cancel is clicked", () => {
      const mockRecord = createMockRecord({ id: "rec-del-cancel" });
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [mockRecord],
        }),
      );
      renderDashboard();

      fireEvent.click(screen.getByText("Delete"));
      expect(screen.getByText("Delete Record?")).toBeInTheDocument();

      // The Cancel button inside the modal (not the form cancel)
      const cancelButtons = screen.getAllByText("Cancel");
      fireEvent.click(cancelButtons[cancelButtons.length - 1]);
      expect(screen.queryByText("Delete Record?")).not.toBeInTheDocument();
    });

    it("calls deleteHours when Delete is confirmed", async () => {
      const mockRecord = createMockRecord({ id: "rec-confirm-del" });
      const mockDeleteHours = jest.fn<(_id: string) => Promise<boolean>>();
      mockDeleteHours.mockResolvedValue(true);
      mockUseSelfReportedHours.mockReturnValue(
        createHookMock({
          hours: [mockRecord],
          deleteHours: mockDeleteHours,
        }),
      );
      renderDashboard();

      // Click delete from list card
      fireEvent.click(screen.getByText("Delete"));
      expect(screen.getByText("Delete Record?")).toBeInTheDocument();

      // Find and click the danger Delete button inside the modal
      const deleteButtons = screen.getAllByText("Delete");
      const confirmDeleteButton = deleteButtons[deleteButtons.length - 1];
      fireEvent.click(confirmDeleteButton);

      await waitFor(() => {
        expect(mockDeleteHours).toHaveBeenCalledWith("rec-confirm-del");
      });
    });
  });
});
