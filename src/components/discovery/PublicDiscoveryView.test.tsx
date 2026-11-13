import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { jest } from "@jest/globals";
import { useCharityOrganizationSearch } from "@/hooks/useCharityOrganizationSearch";
import { PublicDiscoveryView } from "./PublicDiscoveryView";

const mockSearch = jest.mocked(useCharityOrganizationSearch);

describe("PublicDiscoveryView", () => {
  it("renders the hero headline", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    expect(
      screen.getByText("Transparent giving. Measurable change."),
    ).toBeInTheDocument();
  });

  it("renders hero stat tiles", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    expect(screen.getByText("Networks supported")).toBeInTheDocument();
    expect(screen.getByText("Charitable sectors")).toBeInTheDocument();
    expect(screen.getByText("Verified organizations")).toBeInTheDocument();
    expect(screen.getByText("Volunteer hours")).toBeInTheDocument();
  });

  it("renders the WhyGiveProtocolRail in the side rail", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    expect(screen.getByText("Why Give Protocol")).toBeInTheDocument();
  });

  it("omits the Platform News card when there is no news to show", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    expect(screen.queryByText("Platform News")).not.toBeInTheDocument();
  });

  it("renders tab semantics with a labelled tabpanel", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    const panel = screen.getByRole("tabpanel");
    const tab = screen.getByRole("tab", { name: "Charities" });
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
    expect(tab).toHaveAttribute("aria-controls", panel.id);
  });

  it("shows placeholder dashes, not invented numbers, while stats are unavailable", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    // Networks come from config; the other three await the stats RPC.
    expect(screen.getAllByText("\u2014").length).toBeGreaterThanOrEqual(3);
  });

  it("renders the Give Protocol label", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    expect(screen.getByText("Give Protocol")).toBeInTheDocument();
  });

  it("shows empty-state message only when filter is active", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    // Without an active filter, the empty-state message should not appear
    expect(
      screen.queryByText(/No organizations match that search yet/),
    ).not.toBeInTheDocument();
  });

  describe("search behaviour", () => {
    const loadMore = jest.fn();

    beforeEach(() => {
      loadMore.mockReset();
      mockSearch.mockReset();
      mockSearch.mockReturnValue({
        organizations: [],
        loading: false,
        hasMore: false,
        error: null,
        loadMore,
      });
    });

    /** Renders the discovery view inside a router. */
    function renderView() {
      return render(
        <MemoryRouter>
          <PublicDiscoveryView />
        </MemoryRouter>,
      );
    }

    it("never silently restricts results to one country", () => {
      renderView();
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ filterCountry: "", filterState: "" }),
      );
    });

    it("keeps showing the featured section for a single-character term", () => {
      renderView();
      fireEvent.change(screen.getByPlaceholderText("Search charities..."), {
        target: { value: "a" },
      });
      expect(
        screen.queryByLabelText("Charity results"),
      ).not.toBeInTheDocument();
      expect(
        screen.getByText("Type at least 2 characters to search."),
      ).toBeInTheDocument();
    });

    it("switches to results once the term has 2+ characters", () => {
      renderView();
      fireEvent.change(screen.getByPlaceholderText("Search charities..."), {
        target: { value: "ab" },
      });
      expect(screen.getByLabelText("Charity results")).toBeInTheDocument();
      expect(
        screen.getByText(/No organizations match that search yet/),
      ).toBeInTheDocument();
    });

    it("shows an error message when the search fails", () => {
      mockSearch.mockReturnValue({
        organizations: [],
        loading: false,
        hasMore: false,
        error: "Failed to search organizations",
        loadMore,
      });
      renderView();
      fireEvent.change(screen.getByPlaceholderText("Search charities..."), {
        target: { value: "water" },
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        "We couldn't run that search.",
      );
      expect(
        screen.queryByText(/No organizations match that search yet/),
      ).not.toBeInTheDocument();
    });

    it("offers Load More when more results exist", () => {
      mockSearch.mockReturnValue({
        organizations: [],
        loading: false,
        hasMore: true,
        error: null,
        loadMore,
      });
      renderView();
      fireEvent.change(screen.getByPlaceholderText("Search charities..."), {
        target: { value: "water" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Load More" }));
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it("adds an HQ location filter and treats it as active", () => {
      renderView();
      const input = screen.getByPlaceholderText("City, state, or country...");
      fireEvent.change(input, { target: { value: "CA" } });
      fireEvent.click(screen.getByRole("button", { name: "Add location" }));
      expect(screen.getByLabelText("Charity results")).toBeInTheDocument();
    });
  });
});
