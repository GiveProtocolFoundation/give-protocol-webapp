import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import type { CharityOrganization } from "@/types/charityOrganization";

// useCharityOrganizationSearch is mocked via moduleNameMapper (ESM-compatible)
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import { CharityOrgAutocomplete } from "./CharityOrgAutocomplete";

const mockUseCharityOrgSearch =
  useCharityOrganizationSearch as jest.MockedFunction<
    typeof useCharityOrganizationSearch
  >;

const makeOrg = (
  overrides: Partial<CharityOrganization> = {},
): CharityOrganization => ({
  id: "co-uuid-1",
  ein: "12-3456789",
  name: "American Red Cross",
  city: "Washington",
  state: "DC",
  zip: "20006",
  ntee_cd: "P",
  deductibility: "1",
  is_on_platform: false,
  platform_charity_id: null,
  rank: 0.5,
  country: "US",
  registry_source: "IRS_BMF",
  data_source: null,
  data_vintage: null,
  last_synced_at: null,
  ...overrides,
});

const IDLE_STATE = {
  organizations: [],
  loading: false,
  hasMore: false,
  error: null,
  loadMore: jest.fn(),
};

describe("CharityOrgAutocomplete", () => {
  beforeEach(() => {
    mockUseCharityOrgSearch.mockReturnValue(IDLE_STATE);
  });

  it("renders the search input", () => {
    render(<CharityOrgAutocomplete onSelect={jest.fn()} />);
    expect(
      screen.getByPlaceholderText(/search charity registry/i),
    ).toBeDefined();
  });

  it("shows results when search term returns organizations", () => {
    const org = makeOrg();
    mockUseCharityOrgSearch.mockReturnValue({
      ...IDLE_STATE,
      organizations: [org],
    });

    render(<CharityOrgAutocomplete onSelect={jest.fn()} />);
    const input = screen.getByPlaceholderText(/search charity registry/i);

    act(() => {
      fireEvent.change(input, { target: { value: "Red" } });
      fireEvent.focus(input);
    });

    expect(screen.getByText("American Red Cross")).toBeDefined();
  });

  it("calls onSelect with the org when an item is clicked", () => {
    const org = makeOrg();
    const onSelect = jest.fn();
    mockUseCharityOrgSearch.mockReturnValue({
      ...IDLE_STATE,
      organizations: [org],
    });

    render(<CharityOrgAutocomplete onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/search charity registry/i);

    act(() => {
      fireEvent.change(input, { target: { value: "Red" } });
    });

    const button = screen.getByRole("button", { name: /american red cross/i });
    act(() => {
      fireEvent.click(button);
    });

    expect(onSelect).toHaveBeenCalledWith(org);
  });

  it("calls onSelect with null when cleared", () => {
    const org = makeOrg();
    const onSelect = jest.fn();
    mockUseCharityOrgSearch.mockReturnValue({
      ...IDLE_STATE,
      organizations: [org],
    });

    render(<CharityOrgAutocomplete onSelect={onSelect} />);
    const input = screen.getByPlaceholderText(/search charity registry/i);

    act(() => {
      fireEvent.change(input, { target: { value: "Red" } });
    });

    // Select org
    const button = screen.getByRole("button", { name: /american red cross/i });
    act(() => {
      fireEvent.click(button);
    });

    // Clear
    const clearButton = screen.getByRole("button", { name: "" });
    act(() => {
      fireEvent.click(clearButton);
    });

    expect(onSelect).toHaveBeenLastCalledWith(null);
  });

  it("shows 'On Platform' badge for is_on_platform orgs", () => {
    const org = makeOrg({
      is_on_platform: true,
      platform_charity_id: "profile-uuid-1",
    });
    mockUseCharityOrgSearch.mockReturnValue({
      ...IDLE_STATE,
      organizations: [org],
    });

    render(<CharityOrgAutocomplete onSelect={jest.fn()} />);
    const input = screen.getByPlaceholderText(/search charity registry/i);

    act(() => {
      fireEvent.change(input, { target: { value: "Red" } });
    });

    // Badge check icon should appear for on-platform org
    // The BadgeCheck icon is rendered; check for the "On Platform" text after selection
    const button = screen.getByRole("button", { name: /american red cross/i });
    act(() => {
      fireEvent.click(button);
    });

    expect(screen.getByText("On Platform")).toBeDefined();
  });

  it("shows no results message when query returns empty", () => {
    mockUseCharityOrgSearch.mockReturnValue({
      ...IDLE_STATE,
      organizations: [],
    });

    render(<CharityOrgAutocomplete onSelect={jest.fn()} />);
    const input = screen.getByPlaceholderText(/search charity registry/i);

    act(() => {
      fireEvent.change(input, { target: { value: "xyznotfound" } });
      fireEvent.focus(input);
    });

    expect(screen.getByText(/no registry matches/i)).toBeDefined();
  });

  it("shows error message when error prop is provided", () => {
    render(
      <CharityOrgAutocomplete
        onSelect={jest.fn()}
        error="Please select an organization from the registry"
      />,
    );
    expect(
      screen.getByText("Please select an organization from the registry"),
    ).toBeDefined();
  });
});
