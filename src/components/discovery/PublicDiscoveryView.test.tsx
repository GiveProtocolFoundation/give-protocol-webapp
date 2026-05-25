import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PublicDiscoveryView } from "./PublicDiscoveryView";

describe("PublicDiscoveryView", () => {
  it("renders the hero headline", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    expect(screen.getByText("Giving, verified on-chain.")).toBeInTheDocument();
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

  it("renders the NewsUpdatesCard in the side rail", () => {
    render(
      <MemoryRouter>
        <PublicDiscoveryView />
      </MemoryRouter>,
    );
    expect(screen.getByText("Platform News")).toBeInTheDocument();
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
});
