import { jest } from "@jest/globals";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  listOpportunities,
  listCauses,
  moderateContent,
} from "@/services/adminContentModerationService";
import { useToast } from "@/contexts/ToastContext";
import AdminContentModeration from "../admin/AdminContentModeration";
import type {
  AdminOpportunityListResult,
  AdminCauseListResult,
} from "@/types/adminContentModeration";

// Services and toast are mocked via moduleNameMapper

const mockListOpportunities = jest.mocked(listOpportunities);
const mockListCauses = jest.mocked(listCauses);
const mockModerateContent = jest.mocked(moderateContent);
const mockUseToast = jest.mocked(useToast);
const mockShowToast = jest.fn();

const mockOpportunity = {
  id: "opp-1",
  title: "Beach Cleanup",
  charityName: "Ocean Care",
  status: "active",
  moderationStatus: "visible" as const,
  updatedAt: "2025-03-01T12:00:00Z",
};

const mockCause = {
  id: "cause-1",
  title: "Climate Action",
  charityName: "Green Earth",
  status: "active",
  moderationStatus: "visible" as const,
  updatedAt: "2025-03-01T12:00:00Z",
};

const mockOppResult: AdminOpportunityListResult = {
  opportunities: [
    {
      ...mockOpportunity,
      charityId: "charity-1",
      moderationReason: null,
      moderatedAt: null,
    },
  ],
  totalCount: 1,
  page: 1,
  limit: 50,
  totalPages: 1,
};

const mockCauseResult: AdminCauseListResult = {
  causes: [
    {
      ...mockCause,
      charityId: "charity-2",
      moderationReason: null,
      moderatedAt: null,
    },
  ],
  totalCount: 1,
  page: 1,
  limit: 50,
  totalPages: 1,
};

const emptyOppResult: AdminOpportunityListResult = {
  opportunities: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

const emptyCauseResult: AdminCauseListResult = {
  causes: [],
  totalCount: 0,
  page: 1,
  limit: 50,
  totalPages: 0,
};

const renderComponent = () =>
  render(
    <MemoryRouter>
      <AdminContentModeration />
    </MemoryRouter>,
  );

describe("AdminContentModeration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
      toasts: [],
      dismissToast: jest.fn(),
    });
    mockListOpportunities.mockResolvedValue(mockOppResult);
    mockListCauses.mockResolvedValue(mockCauseResult);
    mockModerateContent.mockResolvedValue("audit-id-1");
  });

  describe("Loading state", () => {
    it("shows loading spinner when loading and lists are empty", () => {
      mockListOpportunities.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolves to keep loading state
          }),
      );
      renderComponent();
      expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    });
  });

  describe("Title and total count", () => {
    it("renders Content Moderation title and total count", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Content Moderation")).toBeInTheDocument();
      });
      expect(screen.getByText("1 total")).toBeInTheDocument();
    });
  });

  describe("Opportunities table", () => {
    it("renders opportunities table with data", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Beach Cleanup")).toBeInTheDocument();
      });
      expect(screen.getByText("Ocean Care")).toBeInTheDocument();
      expect(screen.getByText("active")).toBeInTheDocument();
      const table = screen.getByRole("table");
      expect(within(table).getByText("Visible")).toBeInTheDocument();
    });

    it("renders table column headers", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Name")).toBeInTheDocument();
      });
      expect(screen.getByText("Charity")).toBeInTheDocument();
      expect(screen.getByText("Status")).toBeInTheDocument();
      expect(screen.getByText("Visibility")).toBeInTheDocument();
      expect(screen.getByText("Last Modified")).toBeInTheDocument();
      expect(screen.getByText("Actions")).toBeInTheDocument();
    });
  });

  describe("Action buttons for visible content", () => {
    it("shows Hide and Flag for Review buttons for visible content", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Hide")).toBeInTheDocument();
      });
      expect(screen.getByText("Flag for Review")).toBeInTheDocument();
    });
  });

  describe("Action buttons for hidden content", () => {
    it("shows Unhide button for hidden content", async () => {
      const hiddenOppResult: AdminOpportunityListResult = {
        ...mockOppResult,
        opportunities: [
          {
            ...mockOppResult.opportunities[0],
            moderationStatus: "hidden",
          },
        ],
      };
      mockListOpportunities.mockResolvedValue(hiddenOppResult);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Unhide")).toBeInTheDocument();
      });
    });
  });

  describe("Tab switching", () => {
    it("switches to Causes tab and shows cause data", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Content Moderation")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Causes"));
      await waitFor(() => {
        expect(screen.getByText("Climate Action")).toBeInTheDocument();
      });
      expect(screen.getByText("Green Earth")).toBeInTheDocument();
    });
  });

  describe("Action modal", () => {
    it("opens action modal when Hide is clicked", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Hide")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Hide"));
      await waitFor(() => {
        expect(
          screen.getByRole("heading", { name: "Hide Content" }),
        ).toBeInTheDocument();
      });
      expect(screen.getByLabelText("Reason")).toBeInTheDocument();
    });
  });

  describe("Action confirm", () => {
    it("calls moderateContent on confirm and shows success toast", async () => {
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Hide")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Hide"));
      await waitFor(() => {
        expect(screen.getByLabelText("Reason")).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText("Reason"), {
        target: { value: "Inappropriate content" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Hide Content" }));
      await waitFor(() => {
        expect(mockModerateContent).toHaveBeenCalledWith({
          contentType: "opportunity",
          contentId: "opp-1",
          action: "hide",
          reason: "Inappropriate content",
        });
      });
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "success",
          "Content hidden successfully.",
        );
      });
    });

    it("shows error toast when moderateContent returns null", async () => {
      mockModerateContent.mockResolvedValue(null);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Hide")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Hide"));
      await waitFor(() => {
        expect(screen.getByLabelText("Reason")).toBeInTheDocument();
      });
      fireEvent.change(screen.getByLabelText("Reason"), {
        target: { value: "Bad content" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Hide Content" }));
      await waitFor(() => {
        expect(mockShowToast).toHaveBeenCalledWith(
          "error",
          "Action failed. Please try again.",
        );
      });
    });
  });

  describe("Empty states", () => {
    it("shows empty state message for opportunities", async () => {
      mockListOpportunities.mockResolvedValue(emptyOppResult);
      renderComponent();
      await waitFor(() => {
        expect(
          screen.getByText("No opportunities found matching your filters."),
        ).toBeInTheDocument();
      });
    });

    it("shows empty state message for causes", async () => {
      mockListOpportunities.mockResolvedValue(emptyOppResult);
      mockListCauses.mockResolvedValue(emptyCauseResult);
      renderComponent();
      await waitFor(() => {
        expect(screen.getByText("Content Moderation")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Causes"));
      await waitFor(() => {
        expect(
          screen.getByText("No causes found matching your filters."),
        ).toBeInTheDocument();
      });
    });
  });
});
