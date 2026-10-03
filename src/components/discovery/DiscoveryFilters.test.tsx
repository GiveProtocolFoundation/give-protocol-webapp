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

  it("calls onChange with updated searchTerm when typing in the search input", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    const searchInput = screen.getByPlaceholderText("Search charities...");
    fireEvent.change(searchInput, { target: { value: "water" } });
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({ searchTerm: "water" }),
    );
  });

  it("renders the location input", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(
      screen.getByPlaceholderText("City, state, or country..."),
    ).toBeInTheDocument();
  });

  it("renders GeographicFilter", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(
      screen.getByRole("radiogroup", { name: /location filter mode/i }),
    ).toBeInTheDocument();
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

  it("adds a location when the Add button is clicked", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    const locationInput = screen.getByPlaceholderText(
      "City, state, or country...",
    );
    fireEvent.change(locationInput, { target: { value: "TX" } });
    fireEvent.click(screen.getByRole("button", { name: "Add location" }));
    expect(noop).toHaveBeenCalledWith(
      expect.objectContaining({
        hqLocations: [expect.objectContaining({ id: "state:TX" })],
      }),
    );
  });

  it("disables the Add button until a location is typed", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(screen.getByRole("button", { name: "Add location" })).toBeDisabled();
  });

  it("explains how to apply a location", () => {
    render(<DiscoveryFilters value={defaultValue} onChange={noop} />);
    expect(
      screen.getByText("Press Enter or choose Add to apply a location."),
    ).toBeInTheDocument();
  });

  it("hints when the search term is only one character", () => {
    render(
      <DiscoveryFilters
        value={{ ...defaultValue, searchTerm: "a" }}
        onChange={noop}
      />,
    );
    expect(
      screen.getByText("Type at least 2 characters to search."),
    ).toBeInTheDocument();
  });

  it("does not show the minimum-length hint for empty or longer terms", () => {
    const { rerender } = render(
      <DiscoveryFilters value={defaultValue} onChange={noop} />,
    );
    expect(
      screen.queryByText("Type at least 2 characters to search."),
    ).not.toBeInTheDocument();
    rerender(
      <DiscoveryFilters
        value={{ ...defaultValue, searchTerm: "ab" }}
        onChange={noop}
      />,
    );
    expect(
      screen.queryByText("Type at least 2 characters to search."),
    ).not.toBeInTheDocument();
  });

  it("warns that impact-location filtering is not yet applied", () => {
    const impactLocation = {
      id: "country:FR",
      displayLabel: "France",
      type: "country" as const,
      stateCode: null,
      countryCode: "FR",
    };
    render(
      <DiscoveryFilters
        value={{ ...defaultValue, impactLocations: [impactLocation] }}
        onChange={noop}
      />,
    );
    expect(screen.getByText(/Impact-location filtering/)).toBeInTheDocument();
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
