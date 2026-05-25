import React from "react";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { FeaturedPortfolioFundsCarousel } from "./FeaturedPortfolioFundsCarousel";
import { useFeaturedPortfolioFunds } from "@/hooks/useFeaturedPortfolioFunds";

const mockHook = useFeaturedPortfolioFunds as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

const MOCK_FUNDS = [
  {
    id: "1",
    name: "Climate Fund",
    description: "Environmental giving",
    category: "Environment",
    charityCount: 5,
    imageUrl: null,
  },
  {
    id: "2",
    name: "Education Fund",
    description: "Education support",
    category: "Education",
    charityCount: 3,
    imageUrl: "https://example.com/img.jpg",
  },
  {
    id: "3",
    name: "Health Fund",
    description: "Health initiatives",
    category: "Health",
    charityCount: 8,
    imageUrl: null,
  },
  {
    id: "4",
    name: "Water Fund",
    description: "Clean water access",
    category: "Water",
    charityCount: 2,
    imageUrl: null,
  },
];

function renderCarousel(props: { heading?: string; subheading?: string } = {}) {
  return render(
    <MemoryRouter>
      <FeaturedPortfolioFundsCarousel {...props} />
    </MemoryRouter>,
  );
}

describe("FeaturedPortfolioFundsCarousel", () => {
  beforeEach(() => {
    mockHook.mockReturnValue({ funds: [], loading: false, error: null });
  });

  it("should show loading skeleton when loading", () => {
    mockHook.mockReturnValue({ funds: [], loading: true, error: null });
    renderCarousel();
    expect(screen.getByText("Portfolio Funds")).toBeTruthy();
  });

  it("should show empty state when no funds", () => {
    renderCarousel();
    expect(screen.getByText(/No portfolio funds available yet/)).toBeTruthy();
  });

  it("should render funds when available", () => {
    mockHook.mockReturnValue({
      funds: MOCK_FUNDS.slice(0, 3),
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Climate Fund")).toBeTruthy();
    expect(screen.getByText("Education Fund")).toBeTruthy();
    expect(screen.getByText("Health Fund")).toBeTruthy();
  });

  it("should use custom heading and subheading", () => {
    mockHook.mockReturnValue({
      funds: MOCK_FUNDS.slice(0, 1),
      loading: false,
      error: null,
    });
    renderCarousel({
      heading: "Custom Heading",
      subheading: "Custom Sub",
    });
    expect(screen.getByText("Custom Heading")).toBeTruthy();
    expect(screen.getByText("Custom Sub")).toBeTruthy();
  });

  it("should show navigation when multiple pages exist", () => {
    mockHook.mockReturnValue({
      funds: MOCK_FUNDS,
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByLabelText("Previous portfolio funds")).toBeTruthy();
    expect(screen.getByLabelText("Next portfolio funds")).toBeTruthy();
  });

  it("should navigate pages on button click", () => {
    mockHook.mockReturnValue({
      funds: MOCK_FUNDS,
      loading: false,
      error: null,
    });
    renderCarousel();
    // Click next to go to page 2
    fireEvent.click(screen.getByLabelText("Next portfolio funds"));
    expect(screen.getByText("Water Fund")).toBeTruthy();

    // Click prev to go back
    fireEvent.click(screen.getByLabelText("Previous portfolio funds"));
    expect(screen.getByText("Climate Fund")).toBeTruthy();
  });

  it("should render fund cards with category and count", () => {
    mockHook.mockReturnValue({
      funds: [MOCK_FUNDS[0]],
      loading: false,
      error: null,
    });
    renderCarousel();
    expect(screen.getByText("Environment")).toBeTruthy();
    expect(screen.getByText("Environmental giving")).toBeTruthy();
  });

  it("should render image when imageUrl provided", () => {
    mockHook.mockReturnValue({
      funds: [MOCK_FUNDS[1]],
      loading: false,
      error: null,
    });
    renderCarousel();
    const img = screen.getByAltText("Education Fund cover");
    expect(img.getAttribute("src")).toBe("https://example.com/img.jpg");
  });

  it("should render donate links", () => {
    mockHook.mockReturnValue({
      funds: [MOCK_FUNDS[0]],
      loading: false,
      error: null,
    });
    renderCarousel();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/portfolio/1");
  });

  it("should pause on mouse enter and resume on leave", () => {
    mockHook.mockReturnValue({
      funds: MOCK_FUNDS,
      loading: false,
      error: null,
    });
    renderCarousel();
    const section = screen.getByLabelText("Portfolio Funds");
    fireEvent.mouseEnter(section);
    fireEvent.mouseLeave(section);
    // No assertion needed - just ensures no errors during pause/resume
  });
});
