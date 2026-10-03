import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { createMockAuth } from "@/test-utils/mockSetup";
import { setMockResult, resetMockState } from "@/lib/supabase";
import VolunteerOpportunityDetail from "../VolunteerOpportunityDetail";

// useTranslation, useAuth, useToast and VolunteerApplicationForm are mocked via moduleNameMapper.

const mockUseAuth = jest.mocked(useAuth);
const mockUseToast = jest.mocked(useToast);
const mockShowToast = jest.fn();

const baseRow = {
  id: "opp-1",
  charity_id: "charity-1",
  title: "Habitat Data Analysis",
  description:
    '<p>Analyze <strong>field data</strong>.</p><script>alert("x")</script><ul><li>Clean data</li></ul>',
  skills: ["Python", "Visualization"],
  commitment: "8 hours/week",
  location: "Remote",
  type: "remote",
  work_language: "english",
  image_url: null,
  requirements: "Python experience\nClear communication",
  benefits: "Reference letter",
  schedule: "Self-scheduled",
  start_date: "2026-11-15",
  end_date: null,
  application_deadline: "2999-01-01",
  volunteers_needed: 2,
  minimum_age: 18,
  background_check_required: true,
  training_provided: true,
};

const renderDetail = async (id = "opp-1") => {
  render(
    <MemoryRouter initialEntries={[`/opportunities/${id}`]}>
      <Routes>
        <Route
          path="/opportunities/:id"
          element={<VolunteerOpportunityDetail />}
        />
      </Routes>
    </MemoryRouter>,
  );
};

describe("VolunteerOpportunityDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMockState();
    setMockResult("volunteer_opportunities", { data: baseRow, error: null });
    setMockResult("charity_profiles", {
      data: [{ id: "charity-1", ein: "99-1230003", name: "Green Earth" }],
      error: null,
    });
    mockUseAuth.mockReturnValue(
      createMockAuth({ user: { id: "user-1", email: "t@example.com" } }),
    );
    mockUseToast.mockReturnValue({ showToast: mockShowToast });
  });

  it("renders the title, hosting charity link and key facts", async () => {
    await renderDetail();
    expect(
      await screen.findByRole("heading", { name: "Habitat Data Analysis" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Green Earth" })).toHaveAttribute(
      "href",
      "/charity/99-1230003",
    );
    expect(screen.getByText("8 hours/week")).toBeInTheDocument();
    expect(screen.getByText("Self-scheduled")).toBeInTheDocument();
    expect(screen.getByText("Ongoing")).toBeInTheDocument();
    expect(screen.getByText("18+")).toBeInTheDocument();
    expect(screen.getByText("Background check required")).toBeInTheDocument();
    expect(screen.getByText("Training provided")).toBeInTheDocument();
  });

  it("renders sanitized rich-text description without scripts", async () => {
    await renderDetail();
    await screen.findByRole("heading", { name: "Habitat Data Analysis" });
    expect(screen.getByText("field data").tagName).toBe("STRONG");
    expect(screen.getByText("Clean data")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
  });

  it("renders requirements, benefits and skills lists", async () => {
    await renderDetail();
    expect(await screen.findByText("Python experience")).toBeInTheDocument();
    expect(screen.getByText("Clear communication")).toBeInTheDocument();
    expect(screen.getByText("Reference letter")).toBeInTheDocument();
    expect(screen.getByText("Visualization")).toBeInTheDocument();
  });

  it("omits optional sections when the data is absent", async () => {
    setMockResult("volunteer_opportunities", {
      data: {
        ...baseRow,
        requirements: null,
        benefits: null,
        schedule: null,
        start_date: null,
        application_deadline: null,
        volunteers_needed: null,
        minimum_age: null,
        background_check_required: false,
        training_provided: false,
      },
      error: null,
    });
    await renderDetail();
    await screen.findByRole("heading", { name: "Habitat Data Analysis" });
    expect(screen.queryByText("Requirements")).not.toBeInTheDocument();
    expect(screen.queryByText("Benefits")).not.toBeInTheDocument();
    expect(screen.queryByText("Schedule")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Background check required"),
    ).not.toBeInTheDocument();
  });

  it("opens the application form for a signed-in user", async () => {
    await renderDetail();
    fireEvent.click(await screen.findByText("Apply Now"));
    expect(
      screen.getByTestId("volunteer-application-form"),
    ).toBeInTheDocument();
  });

  it("asks a signed-out user to sign in", async () => {
    mockUseAuth.mockReturnValue(createMockAuth({ user: null }));
    await renderDetail();
    fireEvent.click(await screen.findByText("Apply Now"));
    expect(mockShowToast).toHaveBeenCalledWith(
      "error",
      "Please sign in to apply for volunteer opportunities",
    );
  });

  it("disables applying after the deadline", async () => {
    setMockResult("volunteer_opportunities", {
      data: { ...baseRow, application_deadline: "2020-01-01" },
      error: null,
    });
    await renderDetail();
    const button = await screen.findByText("Applications closed");
    expect(button).toBeDisabled();
  });

  it("shows a not-found message when the opportunity is missing", async () => {
    setMockResult("volunteer_opportunities", { data: null, error: null });
    await renderDetail("missing");
    expect(
      await screen.findByText("Opportunity not found"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Back to opportunities/ }),
    ).toHaveAttribute("href", "/opportunities");
  });

  it("shows an error message when loading fails", async () => {
    setMockResult("volunteer_opportunities", {
      data: null,
      error: { message: "boom" },
    });
    await renderDetail();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load volunteer opportunities",
    );
  });
});
