import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SelfReportedHoursForm } from "../SelfReportedHoursForm";
import type { SelfReportedHoursInput } from "@/types/selfReportedHours";
import {
  ActivityType,
  ACTIVITY_TYPE_LABELS,
  MIN_DESCRIPTION_LENGTH,
} from "@/types/selfReportedHours";

// useCharityOrganizationSearch is mocked via moduleNameMapper (ESM-compatible)
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";

const mockUseCharityOrgSearch = jest.mocked(useCharityOrganizationSearch);

const mockOnSubmit =
  jest.fn<(_input: SelfReportedHoursInput) => Promise<void>>();
const mockOnCancel = jest.fn();

const VALID_DESCRIPTION = "A".repeat(MIN_DESCRIPTION_LENGTH);

const renderForm = (
  props: Partial<Parameters<typeof SelfReportedHoursForm>[0]> = {},
) =>
  render(
    <MemoryRouter>
      <SelfReportedHoursForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        {...props}
      />
    </MemoryRouter>,
  );

/** Submits the form by dispatching a submit event on the form element. */
const submitForm = (container: HTMLElement) => {
  const form = container.querySelector("form");
  if (form) {
    fireEvent.submit(form);
  }
};

describe("SelfReportedHoursForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue();
    mockUseCharityOrgSearch.mockReturnValue({
      organizations: [],
      loading: false,
      hasMore: false,
      error: null,
      loadMore: jest.fn(),
    });
  });

  describe("Rendering", () => {
    it("renders the date field", () => {
      renderForm();
      expect(screen.getByLabelText(/^date/i)).toBeInTheDocument();
    });

    it("renders the hours field", () => {
      renderForm();
      expect(screen.getByLabelText(/^hours/i)).toBeInTheDocument();
    });

    it("renders the location field", () => {
      renderForm();
      expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
    });

    it("renders the activity type dropdown with default label", () => {
      renderForm();
      expect(
        screen.getByText(ACTIVITY_TYPE_LABELS[ActivityType.DIRECT_SERVICE]),
      ).toBeInTheDocument();
    });

    it("renders the description textarea", () => {
      renderForm();
      expect(
        screen.getByPlaceholderText(/describe the activities/i),
      ).toBeInTheDocument();
    });

    it("renders the organization legend", () => {
      renderForm();
      expect(screen.getByText("Organization")).toBeInTheDocument();
    });

    it("renders the cancel button", () => {
      renderForm();
      expect(screen.getByText("Cancel")).toBeInTheDocument();
    });

    it("renders the submit button with 'Log Hours' text", () => {
      renderForm();
      expect(screen.getByText("Log Hours")).toBeInTheDocument();
    });

    it("renders the submit button with 'Update Hours' text in edit mode", () => {
      renderForm({ isEdit: true });
      expect(screen.getByText("Update Hours")).toBeInTheDocument();
    });
  });

  describe("Activity type dropdown", () => {
    it("opens dropdown when activity type button is clicked", () => {
      const { container } = renderForm();
      const button = container.querySelector("#activityTypeButton");
      expect(button).not.toBeNull();
      fireEvent.click(button as HTMLElement);
      // All activity types should be visible in the dropdown
      expect(
        screen.getByText(ACTIVITY_TYPE_LABELS[ActivityType.FUNDRAISING]),
      ).toBeInTheDocument();
    });

    it("selects a new activity type from the dropdown", () => {
      const { container } = renderForm();
      const button = container.querySelector("#activityTypeButton");
      fireEvent.click(button as HTMLElement);

      // Click Fundraising option -- use getAllByText since label appears both in
      // the trigger text and the dropdown list; pick the dropdown list item.
      const fundraisingOptions = screen.getAllByText(
        ACTIVITY_TYPE_LABELS[ActivityType.FUNDRAISING],
      );
      fireEvent.click(fundraisingOptions[fundraisingOptions.length - 1]);

      // The dropdown button should now show the new selection
      expect(
        screen.getByText(ACTIVITY_TYPE_LABELS[ActivityType.FUNDRAISING]),
      ).toBeInTheDocument();
    });
  });

  describe("Organization mode toggle", () => {
    it("defaults to 'Not Listed' mode (other)", () => {
      renderForm();
      expect(screen.getByText("Not Listed")).toBeInTheDocument();
    });

    it("shows organization name input in 'Not Listed' mode", () => {
      renderForm();
      expect(screen.getByLabelText(/organization name/i)).toBeInTheDocument();
    });

    it("switches to registry search mode", () => {
      renderForm();
      const registryRadio = screen.getByLabelText(/search registry/i);
      fireEvent.click(registryRadio);
      expect(
        screen.getByPlaceholderText(/search charity registry/i),
      ).toBeInTheDocument();
    });
  });

  describe("Validation errors on empty submit", () => {
    it("shows date error when date is empty", async () => {
      const { container } = renderForm();
      act(() => {
        submitForm(container);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Activity date is required"),
        ).toBeInTheDocument();
      });
    });

    it("shows description error when description is empty", async () => {
      const { container } = renderForm();
      act(() => {
        submitForm(container);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/Description must be at least/),
        ).toBeInTheDocument();
      });
    });

    it("shows organization name error when name is empty in other mode", async () => {
      const { container } = renderForm();
      act(() => {
        submitForm(container);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Organization name is required"),
        ).toBeInTheDocument();
      });
    });

    it("does not call onSubmit when form is invalid", async () => {
      const { container } = renderForm();
      act(() => {
        submitForm(container);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Activity date is required"),
        ).toBeInTheDocument();
      });
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  describe("Successful submission", () => {
    it("calls onSubmit with form data when valid", async () => {
      const { container } = renderForm();

      // Fill in date
      const dateInput = screen.getByLabelText(/^date/i);
      fireEvent.change(dateInput, {
        target: { name: "activityDate", value: "2025-01-15" },
      });

      // Fill in hours
      const hoursInput = screen.getByLabelText(/^hours/i);
      fireEvent.change(hoursInput, { target: { name: "hours", value: "4" } });

      // Fill in description
      const descriptionInput = screen.getByPlaceholderText(
        /describe the activities/i,
      );
      fireEvent.change(descriptionInput, {
        target: { name: "description", value: VALID_DESCRIPTION },
      });

      // Fill in organization name (other mode is default)
      const orgNameInput = screen.getByLabelText(/organization name/i);
      fireEvent.change(orgNameInput, {
        target: { name: "organizationName", value: "Test Organization" },
      });

      // Submit
      act(() => {
        submitForm(container);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });

      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.activityDate).toBe("2025-01-15");
      expect(submittedData.hours).toBe(4);
      expect(submittedData.description).toBe(VALID_DESCRIPTION);
      expect(submittedData.organizationName).toBe("Test Organization");
    });
  });

  describe("Cancel button", () => {
    it("calls onCancel when cancel button is clicked", () => {
      renderForm();
      const cancelButton = screen.getByText("Cancel");
      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it("disables cancel button when submitting", () => {
      renderForm({ isLoading: true });
      const cancelButton = screen.getByText("Cancel");
      expect(cancelButton).toBeDisabled();
    });
  });

  describe("Initial data", () => {
    it("pre-fills form fields from initialData", () => {
      renderForm({
        initialData: {
          activityDate: "2025-03-10",
          hours: 6,
          description: VALID_DESCRIPTION,
          location: "Remote",
        },
      });

      const dateInput = screen.getByLabelText(/^date/i) as HTMLInputElement;
      expect(dateInput.value).toBe("2025-03-10");

      const hoursInput = screen.getByLabelText(/^hours/i) as HTMLInputElement;
      expect(hoursInput.value).toBe("6");

      const locationInput = screen.getByLabelText(
        /location/i,
      ) as HTMLInputElement;
      expect(locationInput.value).toBe("Remote");
    });
  });

  describe("Validation status preview", () => {
    it("shows unvalidated preview when in other mode", () => {
      renderForm();
      expect(screen.getByText(/saved as unvalidated/i)).toBeInTheDocument();
    });
  });

  describe("Loading state", () => {
    it("shows loading text when isLoading is true", () => {
      renderForm({ isLoading: true });
      expect(screen.getByText("Logging...")).toBeInTheDocument();
    });

    it("shows 'Updating...' text when isLoading and isEdit are true", () => {
      renderForm({ isLoading: true, isEdit: true });
      expect(screen.getByText("Updating...")).toBeInTheDocument();
    });
  });

  describe("Activity dropdown click outside", () => {
    it("closes the dropdown when clicking outside it", () => {
      renderForm();
      const button = document.getElementById(
        "activityTypeButton",
      ) as HTMLElement;
      fireEvent.click(button);
      // Dropdown is open — fundraising option visible
      expect(
        screen.getAllByText(ACTIVITY_TYPE_LABELS[ActivityType.FUNDRAISING])
          .length,
      ).toBeGreaterThan(0);
      // Simulate mousedown outside the dropdown
      act(() => {
        fireEvent.mouseDown(document.body);
      });
      // The dropdown options should no longer be in the DOM
      // (Only the trigger label remains, not the dropdown list item)
      const fundraisingMatches = screen.queryAllByText(
        ACTIVITY_TYPE_LABELS[ActivityType.FUNDRAISING],
      );
      expect(fundraisingMatches.length).toBe(0);
    });
  });

  describe("Verified organization selection", () => {
    /** Renders the form, switches to registry mode, and returns helper data. */
    const setupWithVerifiedOrg = () => {
      const org = {
        id: "charity-org-1",
        name: "Acme Charity",
        ein: "12-3456789",
        city: "San Francisco",
        state: "CA",
        is_on_platform: true,
        platform_charity_id: "platform-1",
      };
      mockUseCharityOrgSearch.mockReturnValue({
        organizations: [org],
        loading: false,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
      });
      const result = renderForm();
      const registryRadio = screen.getByLabelText(/search registry/i);
      fireEvent.click(registryRadio);
      return { ...result, org };
    };

    it("selects an organization from the registry results", () => {
      const { org } = setupWithVerifiedOrg();
      const input = screen.getByPlaceholderText(/search charity registry/i);
      fireEvent.change(input, { target: { value: "Acme" } });

      // Click the result button (button has data-ein attribute)
      const result = document.querySelector(`button[data-ein="${org.ein}"]`);
      expect(result).not.toBeNull();
      fireEvent.click(result as HTMLElement);

      // Validation banner should now reflect a selected organization
      expect(
        screen.getByText(
          new RegExp(
            `This record will be submitted for validation to ${org.name}`,
          ),
        ),
      ).toBeInTheDocument();
    });

    it("clears the selected organization when the clear button is clicked", () => {
      const { org } = setupWithVerifiedOrg();
      const input = screen.getByPlaceholderText(/search charity registry/i);
      fireEvent.change(input, { target: { value: "Acme" } });
      const result = document.querySelector(`button[data-ein="${org.ein}"]`);
      fireEvent.click(result as HTMLElement);

      // Now click the clear (X) button
      const clearBtn = document
        .querySelector('button[type="button"] svg.lucide-x')
        ?.closest("button");
      if (clearBtn) fireEvent.click(clearBtn);

      // Banner should reset to "no organization selected"
      expect(
        screen.queryByText(/will be submitted for validation to/i),
      ).not.toBeInTheDocument();
    });
  });

  describe("Verified mode submission", () => {
    it("submits with charityOrgId and platform organizationId when org is on platform", async () => {
      const org = {
        id: "charity-org-2",
        name: "Beta Charity",
        ein: "98-7654321",
        city: "Boston",
        state: "MA",
        is_on_platform: true,
        platform_charity_id: "platform-2",
      };
      mockUseCharityOrgSearch.mockReturnValue({
        organizations: [org],
        loading: false,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
      });
      const { container } = renderForm();
      fireEvent.click(screen.getByLabelText(/search registry/i));

      // Fill required fields
      fireEvent.change(screen.getByLabelText(/^date/i), {
        target: { name: "activityDate", value: "2025-06-01" },
      });
      fireEvent.change(screen.getByLabelText(/^hours/i), {
        target: { name: "hours", value: "3" },
      });
      fireEvent.change(
        screen.getByPlaceholderText(/describe the activities/i),
        { target: { name: "description", value: VALID_DESCRIPTION } },
      );

      // Select org
      const searchInput = screen.getByPlaceholderText(
        /search charity registry/i,
      );
      fireEvent.change(searchInput, { target: { value: "Beta" } });
      const result = document.querySelector(`button[data-ein="${org.ein}"]`);
      fireEvent.click(result as HTMLElement);

      act(() => {
        submitForm(container);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.charityOrgId).toBe(org.id);
      expect(submittedData.organizationId).toBe(org.platform_charity_id);
      expect(submittedData.organizationName).toBeUndefined();
    });

    it("submits with org name when registry org is not on platform", async () => {
      const org = {
        id: "charity-org-3",
        name: "Gamma Charity",
        ein: "11-1111111",
        city: null,
        state: null,
        is_on_platform: false,
        platform_charity_id: null,
      };
      mockUseCharityOrgSearch.mockReturnValue({
        organizations: [org],
        loading: false,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
      });
      const { container } = renderForm();
      fireEvent.click(screen.getByLabelText(/search registry/i));

      fireEvent.change(screen.getByLabelText(/^date/i), {
        target: { name: "activityDate", value: "2025-06-01" },
      });
      fireEvent.change(screen.getByLabelText(/^hours/i), {
        target: { name: "hours", value: "2" },
      });
      fireEvent.change(
        screen.getByPlaceholderText(/describe the activities/i),
        { target: { name: "description", value: VALID_DESCRIPTION } },
      );

      const searchInput = screen.getByPlaceholderText(
        /search charity registry/i,
      );
      fireEvent.change(searchInput, { target: { value: "Gamma" } });
      const result = document.querySelector(`button[data-ein="${org.ein}"]`);
      fireEvent.click(result as HTMLElement);

      act(() => {
        submitForm(container);
      });

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(1);
      });
      const submittedData = mockOnSubmit.mock.calls[0][0];
      expect(submittedData.charityOrgId).toBe(org.id);
      expect(submittedData.organizationName).toBe(org.name);
      expect(submittedData.organizationId).toBeUndefined();
    });
  });

  describe("Validation preview banners", () => {
    it("shows the verified-with-org preview banner", () => {
      const org = {
        id: "charity-org-banner",
        name: "Banner Charity",
        ein: "22-2222222",
        city: "Austin",
        state: "TX",
        is_on_platform: false,
        platform_charity_id: null,
      };
      mockUseCharityOrgSearch.mockReturnValue({
        organizations: [org],
        loading: false,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
      });
      renderForm();
      fireEvent.click(screen.getByLabelText(/search registry/i));
      const searchInput = screen.getByPlaceholderText(
        /search charity registry/i,
      );
      fireEvent.change(searchInput, { target: { value: "Banner" } });
      const result = document.querySelector(`button[data-ein="${org.ein}"]`);
      fireEvent.click(result as HTMLElement);
      expect(
        screen.getByText(/This record will be submitted for validation/),
      ).toBeInTheDocument();
    });

    it("shows the expired preview when verified mode and date is too old", () => {
      // Activity over 90 days old → expired
      renderForm({
        initialData: {
          organizationId: "platform-x",
          activityDate: "2020-01-01",
        },
      });
      expect(
        screen.getByText(/Validation period has expired for this date/),
      ).toBeInTheDocument();
    });
  });

  describe("Initial verified mode", () => {
    it("renders in verified mode when initialData has organizationId", () => {
      renderForm({
        initialData: {
          organizationId: "platform-existing",
          activityDate: "2025-06-01",
          description: VALID_DESCRIPTION,
        },
      });
      // Search input should be visible (verified mode)
      expect(
        screen.getByPlaceholderText(/search charity registry/i),
      ).toBeInTheDocument();
    });
  });

  describe("Switching modes resets organization fields", () => {
    it("resets selectedOrgName when switching back from verified to other", () => {
      const org = {
        id: "charity-org-reset",
        name: "Reset Charity",
        ein: "33-3333333",
        city: null,
        state: null,
        is_on_platform: false,
        platform_charity_id: null,
      };
      mockUseCharityOrgSearch.mockReturnValue({
        organizations: [org],
        loading: false,
        hasMore: false,
        error: null,
        loadMore: jest.fn(),
      });
      renderForm();
      fireEvent.click(screen.getByLabelText(/search registry/i));
      const searchInput = screen.getByPlaceholderText(
        /search charity registry/i,
      );
      fireEvent.change(searchInput, { target: { value: "Reset" } });
      const result = document.querySelector(`button[data-ein="${org.ein}"]`);
      fireEvent.click(result as HTMLElement);
      expect(
        screen.getByText(/will be submitted for validation/),
      ).toBeInTheDocument();

      // Switch to "Not Listed"
      fireEvent.click(screen.getByLabelText(/not listed/i));
      expect(
        screen.queryByText(/will be submitted for validation/),
      ).not.toBeInTheDocument();
      expect(screen.getByText(/saved as unvalidated/i)).toBeInTheDocument();
    });
  });
});
