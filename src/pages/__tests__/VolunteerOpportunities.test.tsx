import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createMockAuth } from "@/test-utils/mockSetup";
import VolunteerOpportunities from "../VolunteerOpportunities";

// Card, ScrollReveal, useTranslation, useAuth, useToast, and
// VolunteerApplicationForm are mocked via moduleNameMapper.

const mockUseAuth = jest.mocked(useAuth);
const mockUseToast = jest.mocked(useToast);

const mockShowToast = jest.fn();

const renderPage = () =>
  render(
    <MemoryRouter>
      <VolunteerOpportunities />
    </MemoryRouter>,
  );

describe("VolunteerOpportunities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(
      createMockAuth({ user: { id: "user-1", email: "test@example.com" } }),
    );
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
  });

  describe("Page heading", () => {
    it("renders the page title", () => {
      renderPage();
      expect(
        screen.getByText("Volunteer Opportunities"),
      ).toBeInTheDocument();
    });
  });

  describe("Opportunity cards", () => {
    it("renders all sample opportunity titles", () => {
      renderPage();
      expect(
        screen.getByText("Web Development for Education Platform"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Environmental Data Analysis"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Community Health App Development"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Translation Services for Medical Documents"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Disaster Relief Coordination"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Educational Content Creation in Japanese"),
      ).toBeInTheDocument();
    });

    it("renders organization names", () => {
      renderPage();
      expect(
        screen.getByText("Global Education Initiative"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("EcoWatch Foundation"),
      ).toBeInTheDocument();
    });

    it("renders commitment details", () => {
      renderPage();
      expect(screen.getByText("5-10 hours/week")).toBeInTheDocument();
      expect(screen.getByText("15 hours/week")).toBeInTheDocument();
    });

    it("renders location information", () => {
      renderPage();
      expect(screen.getByText("Hybrid - New York")).toBeInTheDocument();
      expect(screen.getByText("Onsite - Berlin")).toBeInTheDocument();
    });

    it("renders Apply Now buttons for each opportunity", () => {
      renderPage();
      const applyButtons = screen.getAllByText("Apply Now");
      expect(applyButtons).toHaveLength(6);
    });
  });

  describe("Search functionality", () => {
    it("renders the search input", () => {
      renderPage();
      expect(
        screen.getByLabelText("Search opportunities"),
      ).toBeInTheDocument();
    });

    it("filters opportunities by search term", () => {
      renderPage();
      const searchInput = screen.getByLabelText("Search opportunities");
      fireEvent.change(searchInput, { target: { value: "Environmental" } });
      expect(
        screen.getByText("Environmental Data Analysis"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Web Development for Education Platform"),
      ).not.toBeInTheDocument();
    });

    it("filters by description content", () => {
      renderPage();
      const searchInput = screen.getByLabelText("Search opportunities");
      fireEvent.change(searchInput, {
        target: { value: "mobile app" },
      });
      expect(
        screen.getByText("Community Health App Development"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Environmental Data Analysis"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Location filter", () => {
    it("renders the location search input", () => {
      renderPage();
      expect(
        screen.getByLabelText("Search location"),
      ).toBeInTheDocument();
    });

    it("filters opportunities by location", () => {
      renderPage();
      const locationInput = screen.getByLabelText("Search location");
      fireEvent.change(locationInput, { target: { value: "Berlin" } });
      expect(
        screen.getByText("Disaster Relief Coordination"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Environmental Data Analysis"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Skill filter", () => {
    it("renders the skill dropdown", () => {
      renderPage();
      expect(screen.getByLabelText("Select skill")).toBeInTheDocument();
    });

    it("filters opportunities by selected skill", () => {
      renderPage();
      const skillSelect = screen.getByLabelText("Select skill");
      fireEvent.change(skillSelect, { target: { value: "React" } });
      expect(
        screen.getByText("Web Development for Education Platform"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Environmental Data Analysis"),
      ).not.toBeInTheDocument();
    });

    it("shows filter pill when skill is selected", () => {
      renderPage();
      const skillSelect = screen.getByLabelText("Select skill");
      fireEvent.change(skillSelect, { target: { value: "Python" } });
      expect(screen.getByText("Skill: Python")).toBeInTheDocument();
    });

    it("clears skill filter when pill remove button is clicked", () => {
      renderPage();
      const skillSelect = screen.getByLabelText("Select skill");
      fireEvent.change(skillSelect, { target: { value: "Python" } });
      const removeButton = screen.getByLabelText("Remove Skill: Python filter");
      fireEvent.click(removeButton);
      expect(screen.queryByText("Skill: Python")).not.toBeInTheDocument();
      // All opportunities visible again
      expect(screen.getAllByText("Apply Now")).toHaveLength(6);
    });
  });

  describe("Work type toggle", () => {
    it("renders the work type filter group", () => {
      renderPage();
      const group = screen.getByRole("group", { name: "Work type filter" });
      expect(group).toBeInTheDocument();
    });

    it("renders Remote, On-site, and Hybrid toggle buttons", () => {
      renderPage();
      expect(screen.getByText("On-site")).toBeInTheDocument();
      const group = screen.getByRole("group", { name: "Work type filter" });
      expect(group.textContent).toContain("Remote");
      expect(group.textContent).toContain("Hybrid");
    });

    it("filters by remote type when Remote toggle is clicked", () => {
      renderPage();
      const group = screen.getByRole("group", { name: "Work type filter" });
      const remoteButton = group.querySelector("button:first-child");
      fireEvent.click(remoteButton as Element);
      // Remote opportunities should be visible
      expect(
        screen.getByText("Web Development for Education Platform"),
      ).toBeInTheDocument();
      // Onsite opportunity should be hidden
      expect(
        screen.queryByText("Disaster Relief Coordination"),
      ).not.toBeInTheDocument();
      // Hybrid opportunity should be hidden
      expect(
        screen.queryByText("Environmental Data Analysis"),
      ).not.toBeInTheDocument();
    });

    it("toggles off the type filter when clicked again", () => {
      renderPage();
      const group = screen.getByRole("group", { name: "Work type filter" });
      const remoteButton = group.querySelector("button:first-child");
      fireEvent.click(remoteButton as Element);
      // Click again to deselect
      fireEvent.click(remoteButton as Element);
      // All opportunities visible again
      expect(screen.getAllByText("Apply Now")).toHaveLength(6);
    });
  });

  describe("Language filter", () => {
    it("renders the language dropdown", () => {
      renderPage();
      expect(screen.getByLabelText("Select language")).toBeInTheDocument();
    });

    it("filters opportunities by language", () => {
      renderPage();
      const languageSelect = screen.getByLabelText("Select language");
      fireEvent.change(languageSelect, { target: { value: "german" } });
      expect(
        screen.getByText("Disaster Relief Coordination"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Web Development for Education Platform"),
      ).not.toBeInTheDocument();
    });
  });

  describe("Empty state", () => {
    it("shows no results message when filters exclude all opportunities", () => {
      renderPage();
      const searchInput = screen.getByLabelText("Search opportunities");
      fireEvent.change(searchInput, {
        target: { value: "zzzznonexistent" },
      });
      expect(
        screen.getByText(
          "No opportunities found matching your criteria.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Apply flow", () => {
    it("shows application form when Apply Now is clicked for authenticated user", () => {
      renderPage();
      const applyButtons = screen.getAllByText("Apply Now");
      fireEvent.click(applyButtons[0]);
      expect(
        screen.getByTestId("volunteer-application-form"),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "Application for Web Development for Education Platform",
        ),
      ).toBeInTheDocument();
    });

    it("shows error toast and redirects when unauthenticated user clicks Apply", () => {
      mockUseAuth.mockReturnValue(
        createMockAuth({ user: null }),
      );
      renderPage();
      const applyButtons = screen.getAllByText("Apply Now");
      fireEvent.click(applyButtons[0]);
      expect(mockShowToast).toHaveBeenCalledWith(
        "error",
        "Please sign in to apply for volunteer opportunities",
      );
    });

    it("closes application form when close button is clicked", () => {
      renderPage();
      const applyButtons = screen.getAllByText("Apply Now");
      fireEvent.click(applyButtons[0]);
      expect(
        screen.getByTestId("volunteer-application-form"),
      ).toBeInTheDocument();
      fireEvent.click(screen.getByText("Close"));
      expect(
        screen.queryByTestId("volunteer-application-form"),
      ).not.toBeInTheDocument();
    });
  });
});
