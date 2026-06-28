import { render, screen } from "@testing-library/react";
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

describe("NewsUpdatesCard", () => {
  it("renders the Platform News heading", () => {
    render(
      <MemoryRouter>
        <NewsUpdatesCard items={MOCK_ITEMS} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Platform News")).toBeInTheDocument();
  });

  it("renders item titles", () => {
    render(
      <MemoryRouter>
        <NewsUpdatesCard items={MOCK_ITEMS} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Test update one")).toBeInTheDocument();
    expect(screen.getByText("Test update two")).toBeInTheDocument();
  });

  it("respects the limit prop", () => {
    render(
      <MemoryRouter>
        <NewsUpdatesCard items={MOCK_ITEMS} limit={1} />
      </MemoryRouter>,
    );
    expect(screen.getByText("Test update one")).toBeInTheDocument();
    expect(screen.queryByText("Test update two")).not.toBeInTheDocument();
  });

  it("renders links with correct hrefs", () => {
    render(
      <MemoryRouter>
        <NewsUpdatesCard items={MOCK_ITEMS} />
      </MemoryRouter>,
    );
    const link = screen.getByText("Test update one").closest("a");
    expect(link).toHaveAttribute("href", "/news/one");
  });
});
