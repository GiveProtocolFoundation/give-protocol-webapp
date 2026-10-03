import { render, screen, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NewsUpdatesCard } from "./NewsUpdatesCard";

// Built at runtime so no script-URL literal appears in source.
const UNSAFE_URL = ["java", "script:alert(1)"].join("");

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

  it("opens external links in a new tab safely", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <NewsUpdatesCard
            items={[
              {
                id: "x",
                title: "External",
                excerpt: "e",
                url: "https://example.org/post",
                publishedAt: "2026-04-10",
              },
            ]}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    const link = screen.getByText("External").closest("a");
    expect(link).toHaveAttribute("href", "https://example.org/post");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("renders items without a usable link as plain text", async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <NewsUpdatesCard
            items={[
              {
                id: "a",
                title: "No link",
                excerpt: "e",
                url: null,
                publishedAt: "2026-04-10",
              },
              {
                id: "b",
                title: "Unsafe link",
                excerpt: "e",
                url: UNSAFE_URL,
                publishedAt: "2026-04-10",
              },
            ]}
          />
        </MemoryRouter>,
      );
      await Promise.resolve();
    });
    expect(screen.getByText("No link").closest("a")).toBeNull();
    expect(screen.getByText("Unsafe link").closest("a")).toBeNull();
  });

  it("renders nothing when there is no news", async () => {
    let container: HTMLElement | undefined;
    await act(async () => {
      ({ container } = render(
        <MemoryRouter>
          <NewsUpdatesCard items={[]} />
        </MemoryRouter>,
      ));
      await Promise.resolve();
    });
    expect(container?.firstChild).toBeNull();
    expect(screen.queryByText("Platform News")).not.toBeInTheDocument();
  });
});
