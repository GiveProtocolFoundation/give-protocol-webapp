import { jest } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useFeaturedCharities } from "@/hooks/useFeaturedCharities";
import { FeaturedCharitiesCarousel } from "./FeaturedCharitiesCarousel";

const mockUseFeaturedCharities = useFeaturedCharities as jest.MockedFunction<
  typeof useFeaturedCharities
>;

interface FeaturedCharity {
  profileId: string;
  name: string;
  description: string;
  category: string;
  imageUrl: string;
  location?: string;
}

function makeCharity(
  id: string,
  overrides?: Partial<FeaturedCharity>,
): FeaturedCharity {
  return {
    profileId: id,
    name: `Charity ${id}`,
    description: `Description for charity ${id}`,
    category: "Environment",
    imageUrl: `https://example.com/${id}.jpg`,
    location: "Boston, MA",
    ...overrides,
  };
}

function renderCarousel(props?: { heading?: string; subheading?: string }) {
  return render(
    <MemoryRouter>
      <FeaturedCharitiesCarousel {...props} />
    </MemoryRouter>,
  );
}

describe("FeaturedCharitiesCarousel", () => {
  beforeEach(() => {
    mockUseFeaturedCharities.mockReset();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("shows loading skeletons while loading", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [],
      loading: true,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Featured organizations")).toBeInTheDocument();
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });

  it("renders nothing when charities are empty and not loading", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [],
      loading: false,
      error: null,
    });
    const { container } = renderCarousel();
    // Should render null — no section at all
    expect(
      container.querySelector("[aria-label='Featured organizations']"),
    ).toBeNull();
  });

  it("renders charity cards when data is available", () => {
    const charities = [makeCharity("c1"), makeCharity("c2")];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Charity c1")).toBeInTheDocument();
    expect(screen.getByText("Charity c2")).toBeInTheDocument();
  });

  it("renders custom heading and subheading", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1")] as never,
      loading: false,
      error: null,
    });
    renderCarousel({
      heading: "Custom Title",
      subheading: "Custom subtitle",
    });
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom subtitle")).toBeInTheDocument();
  });

  it("renders default heading and subheading", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Featured organizations")).toBeInTheDocument();
    expect(
      screen.getByText(
        "A rotating look at verified charities on Give Protocol.",
      ),
    ).toBeInTheDocument();
  });

  it("shows Verified badge on each card", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("shows category and location on cards", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [
        makeCharity("c1", { category: "Health", location: "NYC" }),
      ] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Health")).toBeInTheDocument();
    expect(screen.getByText("NYC")).toBeInTheDocument();
  });

  it("does not show location when not provided", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1", { location: undefined })] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.queryByText("Boston, MA")).not.toBeInTheDocument();
  });

  it("renders Donate link for each charity", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    const donateLink = screen.getByText("Donate");
    expect(donateLink.closest("a")).toHaveAttribute(
      "href",
      "/charity/c1?action=donate",
    );
  });

  it("renders charity name as a link to the profile", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    const nameLink = screen.getByText("Charity c1");
    expect(nameLink.closest("a")).toHaveAttribute("href", "/charity/c1");
  });

  it("does not show navigation buttons when only one page", () => {
    // With 2 charities and CARDS_PER_PAGE=3, there's only 1 page
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1"), makeCharity("c2")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(
      screen.queryByLabelText("Previous featured organizations"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText("Next featured organizations"),
    ).not.toBeInTheDocument();
  });

  it("shows navigation buttons when there are multiple pages", () => {
    // 4 charities with CARDS_PER_PAGE=3 => 2 pages
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(
      screen.getByLabelText("Previous featured organizations"),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText("Next featured organizations"),
    ).toBeInTheDocument();
  });

  it("navigates to the next page when Next is clicked", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    // Page 1: c1, c2, c3 visible
    expect(screen.getByText("Charity c1")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("Next featured organizations"));

    // Page 2: c4 visible
    expect(screen.getByText("Charity c4")).toBeInTheDocument();
    expect(screen.queryByText("Charity c1")).not.toBeInTheDocument();
  });

  it("navigates to the previous page when Previous is clicked", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    // Go to page 2
    fireEvent.click(screen.getByLabelText("Next featured organizations"));
    expect(screen.getByText("Charity c4")).toBeInTheDocument();

    // Go back to page 1
    fireEvent.click(screen.getByLabelText("Previous featured organizations"));
    expect(screen.getByText("Charity c1")).toBeInTheDocument();
  });

  it("wraps around when navigating past the last page", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    // Go to page 2
    fireEvent.click(screen.getByLabelText("Next featured organizations"));
    // Go past page 2 => wraps to page 1
    fireEvent.click(screen.getByLabelText("Next featured organizations"));
    expect(screen.getByText("Charity c1")).toBeInTheDocument();
  });

  it("auto-advances after the interval", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    expect(screen.getByText("Charity c1")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(screen.getByText("Charity c4")).toBeInTheDocument();
  });

  it("pauses auto-advance on mouse enter", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    const section = screen.getByLabelText("Featured organizations");
    fireEvent.mouseEnter(section);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // Should still be on page 1 because paused
    expect(screen.getByText("Charity c1")).toBeInTheDocument();
  });

  it("resumes auto-advance on mouse leave", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    const section = screen.getByLabelText("Featured organizations");
    fireEvent.mouseEnter(section);
    fireEvent.mouseLeave(section);

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // Should auto-advance to page 2
    expect(screen.getByText("Charity c4")).toBeInTheDocument();
  });

  it("renders dot indicators for each page", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    // 4 charities / 3 per page = 2 pages = 2 dot buttons
    const dots = screen
      .getByLabelText("Featured organizations")
      .querySelectorAll("[data-index]");
    expect(dots).toHaveLength(2);
  });

  it("navigates when a dot is clicked", () => {
    const charities = [
      makeCharity("c1"),
      makeCharity("c2"),
      makeCharity("c3"),
      makeCharity("c4"),
    ];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();

    const section = screen.getByLabelText("Featured organizations");
    const dots = section.querySelectorAll("[data-index]");

    fireEvent.click(dots[1]);
    expect(screen.getByText("Charity c4")).toBeInTheDocument();
  });
});
