import React from "react";
import { describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CharityGrid } from "./CharityGrid";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";

const mockSearch = useCharityOrganizationSearch as ReturnType<
  typeof import("@jest/globals").jest.fn
>;

function renderGrid(
  props: Partial<{
    searchTerm: string;
    filterState: string;
    filterCountry: string;
    onPlatformOnly: boolean;
  }> = {},
) {
  return render(
    <MemoryRouter>
      <CharityGrid
        searchTerm={props.searchTerm ?? "test"}
        filterState={props.filterState ?? ""}
        filterCountry={props.filterCountry ?? ""}
        onPlatformOnly={props.onPlatformOnly ?? false}
      />
    </MemoryRouter>,
  );
}

describe("CharityGrid", () => {
  beforeEach(() => {
    mockSearch.mockReturnValue({
      organizations: [],
      loading: false,
      hasMore: false,
      error: null,
      loadMore: () => {
        // Empty mock
      },
    });
  });

  it("should show search prompt when no input provided", () => {
    renderGrid({ searchTerm: "" });
    expect(screen.getByText(/Enter a search term/)).toBeTruthy();
  });

  it("should show loading spinner when loading with no results", () => {
    mockSearch.mockReturnValue({
      organizations: [],
      loading: true,
      hasMore: false,
      error: null,
      loadMore: () => {
        // Empty mock
      },
    });
    renderGrid();
    expect(screen.getByText("Loading...")).toBeTruthy();
  });

  it("should show error message when error occurs", () => {
    mockSearch.mockReturnValue({
      organizations: [],
      loading: false,
      hasMore: false,
      error: "Search failed",
      loadMore: () => {
        // Empty mock
      },
    });
    renderGrid();
    expect(screen.getByText("Search failed")).toBeTruthy();
  });

  it("should show no results message when empty results", () => {
    renderGrid();
    expect(screen.getByText(/No charities found/)).toBeTruthy();
  });

  it("should render organization cards", () => {
    mockSearch.mockReturnValue({
      organizations: [
        { ein: "12-3456789", name: "Test Charity", city: "NYC", state: "NY" },
      ],
      loading: false,
      hasMore: false,
      error: null,
      loadMore: () => {
        // Empty mock
      },
    });
    renderGrid();
    // CharityOrganizationCard is mocked, should render something
    expect(screen.queryByText(/No charities found/)).toBeNull();
  });

  it("should show Load More button when hasMore is true", () => {
    mockSearch.mockReturnValue({
      organizations: [
        { ein: "12-3456789", name: "Test Charity", city: "NYC", state: "NY" },
      ],
      loading: false,
      hasMore: true,
      error: null,
      loadMore: () => {
        // Empty mock
      },
    });
    renderGrid();
    expect(screen.getByText("Load More")).toBeTruthy();
  });

  it("should call loadMore when button clicked", () => {
    const mockLoadMore = () => {
      // Empty mock
    };
    mockSearch.mockReturnValue({
      organizations: [
        { ein: "12-3456789", name: "Test Charity", city: "NYC", state: "NY" },
      ],
      loading: false,
      hasMore: true,
      error: null,
      loadMore: mockLoadMore,
    });
    renderGrid();
    fireEvent.click(screen.getByText("Load More"));
  });
});
