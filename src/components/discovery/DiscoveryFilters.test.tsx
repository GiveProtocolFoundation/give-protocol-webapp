import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DiscoveryFiltersState } from "./discoveryFiltersState";
import { emptyDiscoveryFilters } from "./discoveryFiltersState";

// Mock resolveLocation to return a predictable LocationFilter
jest.mock("@/utils/locationResolver", () => ({
  resolveLocation: (input: string) => ({
    id: `state:${input.toUpperCase()}`,
    displayLabel: input,
    type: "state",
    stateCode: input.toUpperCase(),
    countryCode: null,
  }),
}));

import { DiscoveryFilters } from "./DiscoveryFilters";

describe("DiscoveryFilters", () => {
  const defaultValue: DiscoveryFiltersState = { ...emptyDiscoveryFilters };
  const noop = jest.fn<(_next: DiscoveryFiltersState) => void>();

  beforeEach(() => {
    noop.mockReset();
  });

  it("renders the search input", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(
      screen.getByPlaceholderText("Search charities..."),
    ).toBeInTheDocument();
  });

  it("renders the view toggle buttons by default", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(screen.getByText("Charities")).toBeInTheDocument();
    expect(screen.getByText("Causes")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Funds")).toBeInTheDocument();
  });

  it("hides the view toggle when showViewToggle is false", () => {
    render(
      <DiscoveryFilters
        value={defaultValue}
        onChange={noop}
        showViewToggle={false}
      />,
    );
    expect(screen.queryByText("Charities")).not.toBeInTheDocument();
    expect(screen.queryByText("Causes")).not.toBeInTheDocument();
    expect(screen.queryByText("Portfolio Funds")).not.toBeInTheDocument();
  });

  it("calls onChange with updated searchTerm when typing in the search input", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    const searchInput = screen.getByPlaceholderText("Search charities...");
    fireEvent.change(searchInput, { target: { value: "water" } });
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: "water" }),
    );
  });

  it("renders the location input when viewMode is charities", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(
      screen.getByPlaceholderText("City, state, or country..."),
    ).toBeInTheDocument();
  });

  it("hides location input when viewMode is causes", () => {
    const causesValue = { ...defaultValue, viewMode: "causes" as const };
    render(<DiscoveryFilters value={causesValue} onChange={noop} />);
    expect(
      screen.queryByPlaceholderText("City, state, or country..."),
    ).not.toBeInTheDocument();
  });

  it("renders GeographicFilter when viewMode is charities", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(
      screen.getByRole("radiogroup", { name: /location filter mode/i }),
    ).toBeInTheDocument();
  });

  it("hides GeographicFilter when viewMode is causes", () => {
    const causesValue = { ...defaultValue, viewMode: "causes" as const };
    render(<DiscoveryFilters value={causesValue} onChange={noop} />);
    expect(
      screen.queryByRole("radiogroup", { name: /location filter mode/i }),
    ).not.toBeInTheDocument();
  });

  it("switches viewMode to causes when Causes button is clicked", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    fireEvent.click(screen.getByText("Causes"));
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({ viewMode: "causes" }),
    );
  });

  it("switches viewMode to portfolios when Portfolio Funds button is clicked", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    fireEvent.click(screen.getByText("Portfolio Funds"));
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({ viewMode: "portfolios" }),
    );
  });

  it("switches viewMode to charities when Charities button is clicked", () => {
    const causesValue = { ...defaultValue, viewMode: "causes" as const };
    render(<DiscoveryFilters value={causesValue} onChange={noop} />);
    fireEvent.click(screen.getByText("Charities"));
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({ viewMode: "charities" }),
    );
  });

  it("adds a location filter on Enter key in the location input", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    const locationInput = screen.getByPlaceholderText(
      "City, state, or country...",
    );
    fireEvent.change(locationInput, { target: { value: "CA" } });
    fireEvent.keyDown(locationInput, { key: "Enter" });
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({
        hqLocations: [
          expect.objectContaining({ id: "state:CA", stateCode: "CA" }),
        ],
      }),
    );
  });

  it("does not add a location filter on non-Enter key", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    const locationInput = screen.getByPlaceholderText(
      "City, state, or country...",
    );
    fireEvent.change(locationInput, { target: { value: "CA" } });
    fireEvent.keyDown(locationInput, { key: "Tab" });
    expect(noop).not.toHaveBeenCalled();
  });

  it("does not add a location filter when input is empty", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    const locationInput = screen.getByPlaceholderText(
      "City, state, or country...",
    );
    fireEvent.keyDown(locationInput, { key: "Enter" });
    expect(noop).not.toHaveBeenCalled();
  });

  it("does not add a duplicate location filter", () => {
    const existingLocation = {
      id: "state:CA",
      displayLabel: "CA",
      type: "state" as const,
      stateCode: "CA",
      countryCode: null,
    };
    const valueWithLocation = {
      ...defaultValue,
      hqLocations: [existingLocation],
    };
    render(<DiscoveryFilters value={valueWithLocation} onChange={noop} />);
    const locationInput = screen.getByPlaceholderText(
      "City, state, or country...",
    );
    fireEvent.change(locationInput, { target: { value: "CA" } });
    fireEvent.keyDown(locationInput, { key: "Enter" });
    // onChange should NOT be called since it's a duplicate
    expect(noop).not.toHaveBeenCalled();
  });

  it("adds impact location when activeCategory is impact", () => {
    const impactValue = {
      ...defaultValue,
      activeCategory: "impact" as const,
    };
    render(<DiscoveryFilters value={impactValue} onChange={noop} />);
    const locationInput = screen.getByPlaceholderText(
      "City, state, or country...",
    );
    fireEvent.change(locationInput, { target: { value: "NY" } });
    fireEvent.keyDown(locationInput, { key: "Enter" });
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({
        impactLocations: [
          expect.objectContaining({ id: "state:NY", stateCode: "NY" }),
        ],
      }),
    );
  });

  it("applies custom className", () => {
    const { container } = render(
      <DiscoveryFilters
        value={defaultValue}
        onChange={noop}
        className="my-custom"
      />,
    );
    expect(container.firstElementChild).toHaveClass("my-custom");
  });
});
