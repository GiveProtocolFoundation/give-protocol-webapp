import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { FeaturedCharity } from "@/hooks/useFeaturedCharities";

// useFeaturedCharities is mocked via moduleNameMapper (ESM-compatible)
import { useFeaturedCharities } from "@/hooks/useFeaturedCharities";
import { FeaturedCharitiesCarousel } from "./FeaturedCharitiesCarousel";

const mockUseFeaturedCharities = useFeaturedCharities as jest.MockedFunction<
  typeof useFeaturedCharities
>;

const makeCharity = (id: string): FeaturedCharity => ({
  profileId: id,
  name: `Charity ${id}`,
  description: `Description for ${id}`,
  category: "Education",
  imageUrl: `https://example.com/${id}.jpg`,
  location: "Boston, MA",
});

function renderCarousel() {
  return render(
    <MemoryRouter>
      <FeaturedCharitiesCarousel />
    </MemoryRouter>,
  );
}

describe("FeaturedCharitiesCarousel", () => {
  beforeEach(() => {
    mockUseFeaturedCharities.mockReset();
  });

  it("shows loading spinner while loading", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [],
      loading: true,
      error: null,
    });

    renderCarousel();

    expect(screen.getByTestId("loading-spinner")).toBeDefined();
  });

  it("renders a card for each featured charity", () => {
    const charities = [makeCharity("12-3456789"), makeCharity("98-7654321")];
    mockUseFeaturedCharities.mockReturnValue({
      charities,
      loading: false,
      error: null,
    });

    renderCarousel();

    const cards = screen.getAllByTestId("charity-card");
    expect(cards).toHaveLength(2);
    expect(screen.getByText("Charity 12-3456789")).toBeDefined();
    expect(screen.getByText("Charity 98-7654321")).toBeDefined();
  });

  it("shows empty state when no platform charities exist", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [],
      loading: false,
      error: null,
    });

    renderCarousel();

    expect(
      screen.getByText("No featured charities available yet."),
    ).toBeDefined();
  });

  it("shows error message when fetch fails", () => {
    mockUseFeaturedCharities.mockReturnValue({
      charities: [],
      loading: false,
      error: "Failed to load featured charities",
    });

    renderCarousel();

    expect(screen.getByText("Failed to load featured charities")).toBeDefined();
  });
});
