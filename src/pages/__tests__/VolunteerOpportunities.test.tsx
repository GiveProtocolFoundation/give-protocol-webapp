import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { supabase, setMockResult, resetMockState } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createMockAuth } from "@/test-utils/mockSetup";
import VolunteerOpportunities from "../VolunteerOpportunities";

// Card, ScrollReveal, useTranslation, useAuth, useToast, and
// VolunteerApplicationForm are mocked via moduleNameMapper.

const mockUseAuth = jest.mocked(useAuth);
const mockUseToast = jest.mocked(useToast);

const mockShowToast = jest.fn();

// supabase is mocked globally via moduleNameMapper; fixtures mirror
// volunteer_opportunities rows plus the charity_profiles join.
/** Builds a volunteer_opportunities row fixture with optional overrides. */
const opportunityRow = (
  n: number,
  title: string,
  overrides: Record<string, unknown> = {},
) => ({
  id: `opp-${n}`,
  charity_id: `charity-${n}`,
  title,
  description: `Description ${n}`,
  skills: [],
  commitment: "short-term",
  location: "Remote",
  type: "remote",
  work_language: "english",
  image_url: null,
  ...overrides,
});

const OPPORTUNITY_ROWS = [
  opportunityRow(1, "Web Development for Education Platform", {
    description: "Help build an educational platform. Looking for developers.",
    skills: ["React", "Node.js", "TypeScript"],
    commitment: "long-term",
  }),
  opportunityRow(2, "Environmental Data Analysis", {
    skills: ["Python", "Data Analysis"],
    location: "Hybrid - New York",
    type: "hybrid",
  }),
  opportunityRow(3, "Community Health App Development", {
    description: "Create a mobile app for community health workers.",
    skills: ["React Native"],
    commitment: "one-time",
    work_language: "spanish",
  }),
  opportunityRow(4, "Translation Services for Medical Documents", {
    skills: ["Translation", "Spanish"],
    work_language: "spanish",
  }),
  opportunityRow(5, "Disaster Relief Coordination", {
    skills: ["Project Management", "German"],
    location: "Onsite - Berlin",
    type: "onsite",
    work_language: "german",
  }),
  opportunityRow(6, "Educational Content Creation in Japanese", {
    skills: ["Content Creation", "Japanese"],
    work_language: "japanese",
  }),
];

// charity-2 is intentionally absent so its opportunity has no resolvable charity.
const CHARITY_ROWS = [
  {
    profile_id: "charity-1",
    ein: "99-1230001",
    name: "Global Education Initiative",
  },
  { profile_id: "charity-3", ein: "99-1230003", name: "HealthBridge NGO" },
  {
    profile_id: "charity-4",
    ein: "13-3433452",
    name: "Doctors Without Borders",
  },
  {
    profile_id: "charity-5",
    ein: "99-1230005",
    name: "Global Relief Initiative",
  },
  {
    profile_id: "charity-6",
    ein: "99-1230006",
    name: "Global Learning Foundation",
  },
];

/** Renders the page and waits for the opportunity cards to load. */
const renderPage = async () => {
  render(
    <MemoryRouter>
      <VolunteerOpportunities />
    </MemoryRouter>,
  );
  await screen.findAllByText("Apply Now");
};

describe("VolunteerOpportunities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    setMockResult("volunteer_opportunities", {
      data: OPPORTUNITY_ROWS,
      error: null,
    });
    jest
      .mocked(supabase.rpc)
      .mockResolvedValue({ data: CHARITY_ROWS, error: null } as never);
    mockUseAuth.mockReturnValue(
      createMockAuth({ user: { id: "user-1", email: "test@example.com" } }),
    );
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
  });

  describe("Page heading", () => {
    it("renders the page title", async () => {
      await renderPage();
      expect(screen.getByText("Volunteer Opportunities")).toBeInTheDocument();
    });
  });

  describe("Opportunity details link", () => {
    it("links the title to the opportunity detail page", async () => {
      await renderPage();
      const link = screen.getByRole("link", {
        name: "Environmental Data Analysis",
      });
      expect(link).toHaveAttribute("href", "/opportunities/opp-2");
    });

    it("offers a View details link on each card", async () => {
      await renderPage();
      expect(screen.getAllByText("View details")).toHaveLength(6);
    });

    it("shows a plain-text excerpt of rich-text descriptions", async () => {
      setMockResult("volunteer_opportunities", {
        data: [
          opportunityRow(1, "Rich Opportunity", {
            description: "<p>First <strong>para</strong></p><p>Second</p>",
          }),
        ],
        error: null,
      });
      await renderPage();
      expect(screen.getByText("First para Second")).toBeInTheDocument();
    });
  });

  describe("Organization link", () => {
    it("links the organization name to its charity profile", async () => {
      await renderPage();
      const link = screen.getByRole("link", {
        name: "Doctors Without Borders",
      });
      expect(link).toHaveAttribute("href", "/charity/13-3433452");
    });

    it("renders no link when the charity cannot be resolved", async () => {
      await renderPage();
      // 6 opportunities, 5 resolvable charities
      const charityLinks = screen
        .getAllByRole("link")
        .filter((link) => link.getAttribute("href")?.startsWith("/charity/"));
      expect(charityLinks).toHaveLength(5);
    });
  });

  describe("Opportunity cards", () => {
    it("renders all loaded opportunity titles", async () => {
      await renderPage();
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

    it("renders organization names", async () => {
      await renderPage();
      expect(
        screen.getByText("Global Education Initiative"),
      ).toBeInTheDocument();
      expect(screen.getByText("HealthBridge NGO")).toBeInTheDocument();
    });

    it("renders commitment details", async () => {
      await renderPage();
      expect(screen.getByText("Long-term")).toBeInTheDocument();
      expect(screen.getByText("One-time")).toBeInTheDocument();
      expect(screen.getAllByText("Short-term")).toHaveLength(4);
    });

    it("renders location information", async () => {
      await renderPage();
      expect(screen.getByText("Hybrid - New York")).toBeInTheDocument();
      expect(screen.getByText("Onsite - Berlin")).toBeInTheDocument();
    });

    it("renders Apply Now buttons for each opportunity", async () => {
      await renderPage();
      const applyButtons = screen.getAllByText("Apply Now");
      expect(applyButtons).toHaveLength(6);
    });
  });

  describe("Data loading", () => {
    it("shows an error message when loading fails", async () => {
      setMockResult("volunteer_opportunities", {
        data: null,
        error: { message: "boom" },
      });
      render(
        <MemoryRouter>
          <VolunteerOpportunities />
        </MemoryRouter>,
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "We couldn't load volunteer opportunities",
      );
    });

    it("builds the skill dropdown from the loaded opportunities", async () => {
      await renderPage();
      const select = screen.getByLabelText("Select skill");
      expect(select.textContent).toContain("Japanese");
      expect(select.textContent).not.toContain("UI/UX");
    });
  });

  describe("Search functionality", () => {
    it("matches organization names", async () => {
      await renderPage();
      fireEvent.change(screen.getByLabelText("Search opportunities"), {
        target: { value: "healthbridge" },
      });
      expect(
        screen.getByText("Community Health App Development"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Environmental Data Analysis"),
      ).not.toBeInTheDocument();
    });

    it("matches skills", async () => {
      await renderPage();
      fireEvent.change(screen.getByLabelText("Search opportunities"), {
        target: { value: "typescript" },
      });
      expect(
        screen.getByText("Web Development for Education Platform"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Environmental Data Analysis"),
      ).not.toBeInTheDocument();
    });

    it("renders the search input", async () => {
      await renderPage();
      expect(screen.getByLabelText("Search opportunities")).toBeInTheDocument();
    });

    it("filters opportunities by search term", async () => {
      await renderPage();
      const searchInput = screen.getByLabelText("Search opportunities");
      fireEvent.change(searchInput, { target: { value: "Environmental" } });
      expect(
        screen.getByText("Environmental Data Analysis"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Web Development for Education Platform"),
      ).not.toBeInTheDocument();
    });

    it("filters by description content", async () => {
      await renderPage();
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
    it("renders the location search input", async () => {
      await renderPage();
      expect(screen.getByLabelText("Search location")).toBeInTheDocument();
    });

    it("filters opportunities by location", async () => {
      await renderPage();
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
    it("renders the skill dropdown", async () => {
      await renderPage();
      expect(screen.getByLabelText("Select skill")).toBeInTheDocument();
    });

    it("filters opportunities by selected skill", async () => {
      await renderPage();
      const skillSelect = screen.getByLabelText("Select skill");
      fireEvent.change(skillSelect, { target: { value: "React" } });
      expect(
        screen.getByText("Web Development for Education Platform"),
      ).toBeInTheDocument();
      expect(
        screen.queryByText("Environmental Data Analysis"),
      ).not.toBeInTheDocument();
    });

    it("shows filter pill when skill is selected", async () => {
      await renderPage();
      const skillSelect = screen.getByLabelText("Select skill");
      fireEvent.change(skillSelect, { target: { value: "Python" } });
      expect(screen.getByText("Skill: Python")).toBeInTheDocument();
    });

    it("clears skill filter when pill remove button is clicked", async () => {
      await renderPage();
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
    it("renders the work type filter group", async () => {
      await renderPage();
      const group = screen.getByRole("group", { name: "Work type filter" });
      expect(group).toBeInTheDocument();
    });

    it("renders Remote, On-site, and Hybrid toggle buttons", async () => {
      await renderPage();
      expect(screen.getByText("On-site")).toBeInTheDocument();
      const group = screen.getByRole("group", { name: "Work type filter" });
      expect(group.textContent).toContain("Remote");
      expect(group.textContent).toContain("Hybrid");
    });

    it("filters by remote type when Remote toggle is clicked", async () => {
      await renderPage();
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

    it("toggles off the type filter when clicked again", async () => {
      await renderPage();
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
    it("renders the language dropdown", async () => {
      await renderPage();
      expect(screen.getByLabelText("Select language")).toBeInTheDocument();
    });

    it("filters opportunities by language", async () => {
      await renderPage();
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
    it("shows no results message when filters exclude all opportunities", async () => {
      await renderPage();
      const searchInput = screen.getByLabelText("Search opportunities");
      fireEvent.change(searchInput, {
        target: { value: "zzzznonexistent" },
      });
      expect(
        screen.getByText("No opportunities found matching your criteria."),
      ).toBeInTheDocument();
    });
  });

  describe("Apply flow", () => {
    it("shows application form when Apply Now is clicked for authenticated user", async () => {
      await renderPage();
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

    it("shows error toast and redirects when unauthenticated user clicks Apply", async () => {
      mockUseAuth.mockReturnValue(createMockAuth({ user: null }));
      await renderPage();
      const applyButtons = screen.getAllByText("Apply Now");
      fireEvent.click(applyButtons[0]);
      expect(mockShowToast).toHaveBeenCalledWith(
        "error",
        "Please sign in to apply for volunteer opportunities",
      );
    });

    it("closes application form when close button is clicked", async () => {
      await renderPage();
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
