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
  categoryKey: string;
  imageUrl: string;
  location?: string;
  registrySource: string | null;
  isClaimed?: boolean;
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
    categoryKey: "browse.category.C",
    imageUrl: `https://example.com/${id}.jpg`,
    location: "Boston, MA",
    registrySource: "IRS_BMF",
    isClaimed: true,
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

  it("shows an explicit empty state when there are no charities", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [],
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(
      screen.getByText(
        "No featured organizations yet. Use the search above to find a charity.",
      ),
    ).toBeInTheDocument();
  });

  it("shows an error state when the fetch failed", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [],
      loading: false,
      error: "Failed to load featured charities",
    });
    renderCarousel();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load this section.",
    );
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

  it("shows a registry badge on each card, never a bare IRS-verified claim", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1"), makeCharity("c2")] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getAllByText("IRS-registered")).toHaveLength(2);
    expect(screen.queryByText("IRS-verified")).not.toBeInTheDocument();
  });

  it("names the registry the charity was listed in (GIV-986)", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1", { isClaimed: false })] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("IRS-registered")).toBeInTheDocument();
  });

  it("does not claim IRS registration for a non-IRS registry", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1", { registrySource: "SAT_MX" })] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("SAT MX-registered")).toBeInTheDocument();
    expect(screen.queryByText(/IRS/)).not.toBeInTheDocument();
  });

  it("falls back to a generic Verified badge when the registry is unknown", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1", { registrySource: null })] as never,
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

  it("renders Donate link for claimed charities (GIV-1012)", () => {
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
    expect(donateLink.className).toContain("bg-emerald-700");
    expect(screen.queryByText("View profile")).not.toBeInTheDocument();
  });

  it("renders View profile link instead of Donate for unclaimed charities (GIV-1012)", () => {
    // Unclaimed profiles cannot receive donations until the org claims and
    // designates a wallet — the card CTA must not look like a donate path.
    mockUseFeaturedCharities.mockReturnValue({
      charities: [makeCharity("c1", { isClaimed: false })] as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    const viewLink = screen.getByText("View profile");
    expect(viewLink.closest("a")).toHaveAttribute("href", "/charity/c1");
    expect(screen.queryByText("Donate")).not.toBeInTheDocument();
    expect(viewLink.className).not.toContain("bg-emerald-700");
    expect(viewLink.className).toContain("border");
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

  it("renders slide ARIA attributes on the page wrapper", () => {
    const charities = [makeCharity("c1"), makeCharity("c2"), makeCharity("c3")];
    mockUseFeaturedCharities.mockReturnValue({
      charities: charities as never,
      loading: false,
      error: null,
    });
    renderCarousel();
    const slides = screen.getAllByRole("group");
    expect(slides).toHaveLength(1);
    expect(slides[0]).toHaveAttribute("aria-roledescription", "slide");
    expect(slides[0]).toHaveAttribute("aria-label", "Page 1 of 1");
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
