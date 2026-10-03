import React from "react";
import { jest } from "@jest/globals";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { FeaturedCarousel } from "./FeaturedCarousel";

interface Item {
  id: string;
}

const items: Item[] = Array.from({ length: 6 }, (_, i) => ({
  id: `i${i + 1}`,
}));
const getKey = (item: Item) => item.id;
const renderCard = (item: Item) => <div>{`Card ${item.id}`}</div>;

function renderCarousel(
  overrides?: Partial<React.ComponentProps<typeof FeaturedCarousel<Item>>>,
) {
  return render(
    <FeaturedCarousel<Item>
      items={items}
      loading={false}
      error={null}
      getKey={getKey}
      renderCard={renderCard}
      heading="Heading"
      subheading="Sub"
      ariaLabel="Things"
      prevLabel="Previous things"
      nextLabel="Next things"
      emptyIcon={<span />}
      emptyMessage="Nothing here"
      {...overrides}
    />,
  );
}

function mockReducedMotion(reduce: boolean) {
  (window.matchMedia as unknown as jest.Mock).mockImplementation(
    (query: unknown) => ({
      matches: reduce,
      media: String(query),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    }),
  );
}

describe("FeaturedCarousel", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReducedMotion(false);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("auto-advances and silences the live region while rotating", () => {
    renderCarousel();
    const page = screen.getByRole("group");
    expect(page).toHaveAttribute("aria-label", "Page 1 of 2");
    expect(page).toHaveAttribute("aria-live", "off");
    expect(screen.getByText("Card i1")).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByRole("group")).toHaveAttribute(
      "aria-label",
      "Page 2 of 2",
    );
    expect(screen.getByText("Card i4")).toBeInTheDocument();
  });

  it("stops rotating when the user presses pause and announces changes politely", () => {
    renderCarousel();
    fireEvent.click(
      screen.getByRole("button", { name: "Pause automatic rotation" }),
    );
    expect(
      screen.getByRole("button", { name: "Resume automatic rotation" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("group")).toHaveAttribute("aria-live", "polite");

    act(() => {
      jest.advanceTimersByTime(20000);
    });
    expect(screen.getByText("Card i1")).toBeInTheDocument();
  });

  it("pauses while hovered", () => {
    renderCarousel();
    const section = screen.getByRole("region", { name: "Things" });
    fireEvent.mouseEnter(section);
    act(() => {
      jest.advanceTimersByTime(12000);
    });
    expect(screen.getByText("Card i1")).toBeInTheDocument();
    fireEvent.mouseLeave(section);
    act(() => {
      jest.advanceTimersByTime(6000);
    });
    expect(screen.getByText("Card i4")).toBeInTheDocument();
  });

  it("never auto-advances when the user prefers reduced motion", () => {
    mockReducedMotion(true);
    renderCarousel();
    act(() => {
      jest.advanceTimersByTime(30000);
    });
    expect(screen.getByText("Card i1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Resume automatic rotation" }),
    ).toBeDisabled();
    expect(screen.getByRole("group")).toHaveAttribute("aria-live", "polite");
  });

  it("exposes keyboard-reachable, labelled page buttons with aria-current", () => {
    renderCarousel();
    const first = screen.getByRole("button", { name: "Go to page 1" });
    const second = screen.getByRole("button", { name: "Go to page 2" });
    expect(first).toHaveAttribute("aria-current", "true");
    expect(second).not.toHaveAttribute("aria-current");
    expect(second).not.toHaveAttribute("tabindex", "-1");

    fireEvent.click(second);
    expect(screen.getByText("Card i4")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to page 2" }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("supports previous and next buttons with wrap-around", () => {
    renderCarousel();
    fireEvent.click(screen.getByRole("button", { name: "Previous things" }));
    expect(screen.getByText("Card i4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next things" }));
    expect(screen.getByText("Card i1")).toBeInTheDocument();
  });

  it("hides navigation and rotation controls for a single page", () => {
    renderCarousel({ items: items.slice(0, 2) });
    expect(
      screen.queryByRole("button", { name: "Next things" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /rotation/ }),
    ).not.toBeInTheDocument();
  });

  it("renders skeletons while loading", () => {
    renderCarousel({ loading: true });
    expect(screen.getByRole("region", { name: "Things" })).toHaveAttribute(
      "aria-busy",
      "true",
    );
    expect(screen.queryByText("Card i1")).not.toBeInTheDocument();
  });

  it("shows the empty message as a status", () => {
    renderCarousel({ items: [] });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing here");
  });

  it("shows a failure message as an alert instead of the empty message", () => {
    renderCarousel({ items: [], error: "boom" });
    expect(screen.getByRole("alert")).toHaveTextContent(
      "We couldn't load this section.",
    );
    expect(screen.queryByText("Nothing here")).not.toBeInTheDocument();
  });

  it("renders the toolbar slot", () => {
    renderCarousel({ toolbar: <input aria-label="search" /> });
    expect(screen.getByLabelText("search")).toBeInTheDocument();
  });
});
