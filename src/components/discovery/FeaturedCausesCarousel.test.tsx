import { jest } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useFeaturedCauses } from "@/hooks/useFeaturedCauses";
import { FeaturedCausesCarousel } from "./FeaturedCausesCarousel";

const mockUseFeaturedCauses = useFeaturedCauses as jest.MockedFunction<
  typeof useFeaturedCauses
>;

interface FeaturedCause {
  id: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  charityName: string;
  targetAmount: number;
  raisedAmount: number;
  location?: string;
}

function makeCause(
  id: string,
  overrides?: Partial<FeaturedCause>,
): FeaturedCause {
  return {
    id,
    name: `Cause ${id}`,
    description: `Description for cause ${id}`,
    category: "Environment",
    imageUrl: `https://example.com/${id}.jpg`,
    charityName: `Charity ${id}`,
    targetAmount: 10000,
    raisedAmount: 5000,
    location: "East Africa",
    ...overrides,
  };
}

function renderCarousel(props?: { heading?: string; subheading?: string }) {
  return render(
    <MemoryRouter>
      <FeaturedCausesCarousel {...props} />
    </MemoryRouter>,
  );
}

describe("FeaturedCausesCarousel", () => {
  beforeEach(() => {
    mockUseFeaturedCauses.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading skeletons while loading", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [],
      loading: true,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Featured causes")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("renders empty state when causes are empty and not loading", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [],
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(
      screen.getByText("No causes available yet. Check back soon!"),
    ).toBeInTheDocument();
  });

  it("renders cause cards when data is available", () => {
    const causes = [makeCause("1"), makeCause("2")];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Cause 1")).toBeInTheDocument();
    expect(screen.getByText("Cause 2")).toBeInTheDocument();
  });

  it("renders custom heading and subheading", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [makeCause("1")] as never,
      loading: false,
      error: null,
    });
    renderCarousel({ heading: "Custom Title", subheading: "Custom subtitle" });
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom subtitle")).toBeInTheDocument();
  });

  it("renders default heading and subheading", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [makeCause("1")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Featured causes")).toBeInTheDocument();
    expect(
      screen.getByText("Support specific projects making real impact."),
    ).toBeInTheDocument();
  });

  it("shows category and location on cards", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [
        makeCause("1", { category: "Health", location: "NYC" }),
      ] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("NYC")).toBeInTheDocument();
  });

  it("shows charity name on cards", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [makeCause("1", { charityName: "Ocean Trust" })] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("by Ocean Trust")).toBeInTheDocument();
  });

  it("does not show location when not provided", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [makeCause("1", { location: undefined })] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.queryByText("East Africa")).not.toBeInTheDocument();
  });

  it("renders Support This Cause link for each cause", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [makeCause("42")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    const links = screen.getAllByText("Support This Cause");
    expect(links[0].closest("a")).toHaveAttribute("href", "/causes/42");
  });

  it("renders cause name as a link to the cause detail page", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [makeCause("42")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    const nameLink = screen.getByText("Cause 42");
    expect(nameLink.closest("a")).toHaveAttribute("href", "/causes/42");
  });

  it("does not show navigation buttons when only one page", () => {
    mockUseFeaturedCauses.mockReturnValue({
      causes: [makeCause("1"), makeCause("2")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(
      screen.queryByLabelText("Previous featured causes"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Next featured causes"),
    ).not.toBeInTheDocument();
  });

  it("shows navigation buttons when there are multiple pages", () => {
    const causes = [
      makeCause("1"),
      makeCause("2"),
      makeCause("3"),
      makeCause("4"),
    ];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(
      screen.getByLabelText("Previous featured causes"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Next featured causes")).toBeInTheDocument();
  });

  it("navigates to the next page when Next is clicked", () => {
    const causes = [
      makeCause("1"),
      makeCause("2"),
      makeCause("3"),
      makeCause("4"),
    ];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    expect(screen.getByText("Cause 1")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Next featured causes"));

    expect(screen.getByText("Cause 4")).toBeInTheDocument();
    expect(screen.queryByText("Cause 1")).not.toBeInTheDocument();
  });

  it("navigates to the previous page when Previous is clicked", () => {
    const causes = [
      makeCause("1"),
      makeCause("2"),
      makeCause("3"),
      makeCause("4"),
    ];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    fireEvent.click(screen.getByLabelText("Next featured causes"));
    expect(screen.getByText("Cause 4")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Previous featured causes"));
    expect(screen.getByText("Cause 1")).toBeInTheDocument();
  });

  it("auto-advances after the interval", () => {
    const causes = [
      makeCause("1"),
      makeCause("2"),
      makeCause("3"),
      makeCause("4"),
    ];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    expect(screen.getByText("Cause 1")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(screen.getByText("Cause 4")).toBeInTheDocument();
  });

  it("pauses auto-advance on mouse enter", () => {
    const causes = [
      makeCause("1"),
      makeCause("2"),
      makeCause("3"),
      makeCause("4"),
    ];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    const section = screen.getByLabelText("Featured causes");
    fireEvent.mouseEnter(section);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(screen.getByText("Cause 1")).toBeInTheDocument();
  });

  it("renders dot indicators for each page", () => {
    const causes = [
      makeCause("1"),
      makeCause("2"),
      makeCause("3"),
      makeCause("4"),
    ];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    const dots = screen
      .getByLabelText("Featured causes")
      .querySelectorAll("[data-index]");
    expect(dots).toHaveLength(2);
  });

  it("navigates when a dot is clicked", () => {
    const causes = [
      makeCause("1"),
      makeCause("2"),
      makeCause("3"),
      makeCause("4"),
    ];
    mockUseFeaturedCauses.mockReturnValue({
      causes: causes as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    const section = screen.getByLabelText("Featured causes");
    const dots = section.querySelectorAll("[data-index]");

    fireEvent.click(dots[1]);
    expect(screen.getByText("Cause 4")).toBeInTheDocument();
  });
});
