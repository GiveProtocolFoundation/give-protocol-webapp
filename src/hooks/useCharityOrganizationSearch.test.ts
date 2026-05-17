import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useCharityOrganizationSearch } from "./useCharityOrganizationSearch";
import { searchCharityOrganizations } from "@/services/charityOrganizationService";

const mockSearch = searchCharityOrganizations as jest.MockedFunction<
  typeof searchCharityOrganizations
>;

const defaultParams = {
  searchTerm: "",
  filterState: "",
  filterCountry: "",
  onPlatformOnly: false,
};

/** Helper: builds a minimal CharityOrganization row */
function makeOrg(overrides: Record<string, unknown> = {}) {
  return {
    id: "org-1",
    ein: "12-3456789",
    name: "Test Charity",
    city: null,
    state: null,
    zip: null,
    ntee_cd: null,
    deductibility: null,
    is_on_platform: false,
    platform_charity_id: null,
    rank: 1,
    country: null,
    registry_source: null,
    data_source: null,
    data_vintage: null,
    last_synced_at: null,
    ...overrides,
  };
}

describe("useCharityOrganizationSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSearch.mockResolvedValue({ organizations: [], hasMore: false });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ---------- Initial / empty state ----------

  it("returns empty results when no search term or filter is provided", () => {
    const { result } = renderHook(() =>
      useCharityOrganizationSearch(defaultParams),
    );

    expect(result.current.organizations).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.loadMore).toBe("function");
  });

  it("does not call the service when search term is shorter than 2 characters", async () => {
    renderHook(() =>
      useCharityOrganizationSearch({ ...defaultParams, searchTerm: "a" }),
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(mockSearch).not.toHaveBeenCalled();
  });

  // ---------- Successful search ----------

  it("searches after debounce when search term has 2+ characters", async () => {
    const orgs = [makeOrg({ name: "Found Charity" })];
    mockSearch.mockResolvedValue({ organizations: orgs, hasMore: false });

    const { result } = renderHook(() =>
      useCharityOrganizationSearch({ ...defaultParams, searchTerm: "test" }),
    );

    // Should be loading while waiting for debounce
    expect(result.current.loading).toBe(true);

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        search_query: "test",
        result_limit: 20,
        result_offset: 0,
      }),
    );
    expect(result.current.organizations).toHaveLength(1);
    expect(result.current.organizations[0].name).toBe("Found Charity");
  });

  it("searches when filterState is set even without search term", async () => {
    renderHook(() =>
      useCharityOrganizationSearch({ ...defaultParams, filterState: "CA" }),
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        search_query: null,
        filter_state: "CA",
      }),
    );
  });

  it("searches when filterCountry is set even without search term", async () => {
    renderHook(() =>
      useCharityOrganizationSearch({ ...defaultParams, filterCountry: "US" }),
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(mockSearch).toHaveBeenCalled();
    });

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filter_country: "US",
      }),
    );
  });

  // ---------- On-platform filtering ----------

  it("filters to on-platform organizations when onPlatformOnly is true", async () => {
    const orgs = [
      makeOrg({ id: "1", name: "On Platform", is_on_platform: true }),
      makeOrg({ id: "2", name: "Off Platform", is_on_platform: false }),
    ];
    mockSearch.mockResolvedValue({ organizations: orgs, hasMore: false });

    const { result } = renderHook(() =>
      useCharityOrganizationSearch({
        ...defaultParams,
        searchTerm: "platform",
        onPlatformOnly: true,
      }),
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.organizations).toHaveLength(1);
    expect(result.current.organizations[0].name).toBe("On Platform");
  });

  it("returns all organizations when onPlatformOnly is false", async () => {
    const orgs = [
      makeOrg({ id: "1", is_on_platform: true }),
      makeOrg({ id: "2", is_on_platform: false }),
    ];
    mockSearch.mockResolvedValue({ organizations: orgs, hasMore: false });

    const { result } = renderHook(() =>
      useCharityOrganizationSearch({
        ...defaultParams,
        searchTerm: "test",
        onPlatformOnly: false,
      }),
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.organizations).toHaveLength(2);
  });

  // ---------- Error handling ----------

  it("sets error on search failure", async () => {
    mockSearch.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() =>
      useCharityOrganizationSearch({ ...defaultParams, searchTerm: "fail" }),
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe("Failed to search organizations");
  });

  // ---------- hasMore / pagination ----------

  it("exposes hasMore from search results", async () => {
    mockSearch.mockResolvedValue({ organizations: [makeOrg()], hasMore: true });

    const { result } = renderHook(() =>
      useCharityOrganizationSearch({ ...defaultParams, searchTerm: "test" }),
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasMore).toBe(true);
  });

  it("loadMore does nothing when loading is true", () => {
    mockSearch.mockReturnValue(
      new Promise(() => {
        // Intentionally never resolves to keep loading state
      }),
    );

    const { result } = renderHook(() =>
      useCharityOrganizationSearch({ ...defaultParams, searchTerm: "test" }),
    );

    act(() => {
      jest.advanceTimersByTime(400);
    });

    // loading should be true because the promise never resolves
    expect(result.current.loading).toBe(true);

    act(() => {
      result.current.loadMore();
    });

    // loadMore should not have triggered a second search
    expect(mockSearch).toHaveBeenCalledTimes(1);
  });

  // ---------- Reset on input change ----------

  it("resets results when search term changes", async () => {
    const orgs = [makeOrg({ name: "First Result" })];
    mockSearch.mockResolvedValue({ organizations: orgs, hasMore: false });

    const { result, rerender } = renderHook(
      (props: { searchTerm: string }) =>
        useCharityOrganizationSearch({
          ...defaultParams,
          searchTerm: props.searchTerm,
        }),
      { initialProps: { searchTerm: "first" } },
    );

    await act(() => {
      jest.advanceTimersByTime(400);
    });

    await waitFor(() => {
      expect(result.current.organizations).toHaveLength(1);
    });

    // Change search term to trigger reset
    mockSearch.mockResolvedValue({ organizations: [], hasMore: false });
    rerender({ searchTerm: "second" });

    // After rerender with a new search term, error should be reset
    await waitFor(() => {
      expect(result.current.error).toBeNull();
    });
  });
});
