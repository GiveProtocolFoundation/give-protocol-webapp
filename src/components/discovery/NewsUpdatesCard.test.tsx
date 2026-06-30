import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NewsUpdatesCard } from "./NewsUpdatesCard";

const MOCK_ITEMS = [
  {
    id: "n1",
    title: "Test update one",
    excerpt: "First excerpt",
    url: "/news/one",
    publishedAt: "2026-04-10",
  },
  {
    id: "n2",
    title: "Test update two",
    excerpt: "Second excerpt",
    url: "/news/two",
    publishedAt: "2026-04-11",
  },
];

/**
 * Renders the card inside a router and flushes the async state update from
 * the internal usePlatformNews hook, so its post-mount setState lands inside
 * act() (avoids "not wrapped in act(...)" warnings). Items are still passed as
 * a prop, so the rendered output is driven by MOCK_ITEMS, not the hook.
 */
async function renderCard(limit?: number) {
  await act(async () => {
    render(
      <MemoryRouter>
        <NewsUpdatesCard items={MOCK_ITEMS} limit={limit} />
      </MemoryRouter>,
    );
    // Yield so usePlatformNews's microtask-resolved fetch settles inside act().
    await Promise.resolve();
  });
}

describe("NewsUpdatesCard", () => {
  it("renders the Platform News heading", async () => {
    await renderCard();
    expect(screen.getByText("Platform News")).toBeInTheDocument();
  });

  it("renders item titles", async () => {
    await renderCard();
    expect(screen.getByText("Test update one")).toBeInTheDocument();
    expect(screen.getByText("Test update two")).toBeInTheDocument();
  });

  it("respects the limit prop", async () => {
    await renderCard(1);
    expect(screen.getByText("Test update one")).toBeInTheDocument();
    expect(screen.queryByText("Test update two")).not.toBeInTheDocument();
  });

  it("renders links with correct hrefs", async () => {
    await renderCard();
    const link = screen.getByText("Test update one").closest("a");
    expect(link).toHaveAttribute("href", "/news/one");
  });
});
