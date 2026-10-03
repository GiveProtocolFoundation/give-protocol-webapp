import { jest, describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  DiscoveryTabs,
  getDiscoveryPanelId,
  getDiscoveryTabId,
  readTabParam,
} from "./DiscoveryTabs";

describe("readTabParam", () => {
  it("should return 'charities' for empty params", () => {
    expect(readTabParam(new URLSearchParams())).toBe("charities");
  });

  it("should return 'causes' when tab=causes", () => {
    expect(readTabParam(new URLSearchParams("tab=causes"))).toBe("causes");
  });

  it("should return 'funds' when tab=funds", () => {
    expect(readTabParam(new URLSearchParams("tab=funds"))).toBe("funds");
  });

  it("should fall back to 'charities' for invalid tab values", () => {
    expect(readTabParam(new URLSearchParams("tab=invalid"))).toBe("charities");
  });
});

describe("DiscoveryTabs", () => {
  it("should render three tabs", () => {
    const onTabChange = jest.fn();
    render(
      <MemoryRouter>
        <DiscoveryTabs activeTab="charities" onTabChange={onTabChange} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "Charities" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Causes" })).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "Portfolio Funds" }),
    ).toBeInTheDocument();
  });

  it("should mark the active tab as selected", () => {
    const onTabChange = jest.fn();
    render(
      <MemoryRouter>
        <DiscoveryTabs activeTab="causes" onTabChange={onTabChange} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("tab", { name: "Causes" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Charities" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("should call onTabChange when a tab is clicked", () => {
    const onTabChange = jest.fn();
    render(
      <MemoryRouter>
        <DiscoveryTabs activeTab="charities" onTabChange={onTabChange} />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("tab", { name: "Causes" }));
    expect(onTabChange).toHaveBeenCalledWith("causes");

    fireEvent.click(screen.getByRole("tab", { name: "Portfolio Funds" }));
    expect(onTabChange).toHaveBeenCalledWith("funds");
  });

  it("exposes a labelled tablist", () => {
    render(
      <MemoryRouter>
        <DiscoveryTabs activeTab="charities" onTabChange={jest.fn()} />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("tablist", { name: "Browse categories" }),
    ).toBeInTheDocument();
  });

  it("links each tab to its panel and uses roving tabindex", () => {
    render(
      <MemoryRouter>
        <DiscoveryTabs activeTab="causes" onTabChange={jest.fn()} />
      </MemoryRouter>,
    );
    const causes = screen.getByRole("tab", { name: "Causes" });
    expect(causes).toHaveAttribute("id", getDiscoveryTabId("causes"));
    expect(causes).toHaveAttribute(
      "aria-controls",
      getDiscoveryPanelId("causes"),
    );
    expect(causes).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Charities" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("moves between tabs with arrow, Home and End keys", () => {
    const onTabChange = jest.fn();
    render(
      <MemoryRouter>
        <DiscoveryTabs activeTab="charities" onTabChange={onTabChange} />
      </MemoryRouter>,
    );
    const charities = screen.getByRole("tab", { name: "Charities" });

    fireEvent.keyDown(charities, { key: "ArrowRight" });
    expect(onTabChange).toHaveBeenLastCalledWith("causes");

    fireEvent.keyDown(charities, { key: "ArrowLeft" });
    expect(onTabChange).toHaveBeenLastCalledWith("funds");

    fireEvent.keyDown(charities, { key: "End" });
    expect(onTabChange).toHaveBeenLastCalledWith("funds");

    fireEvent.keyDown(screen.getByRole("tab", { name: "Causes" }), {
      key: "Home",
    });
    expect(onTabChange).toHaveBeenLastCalledWith("charities");
  });

  it("ignores unrelated keys", () => {
    const onTabChange = jest.fn();
    render(
      <MemoryRouter>
        <DiscoveryTabs activeTab="charities" onTabChange={onTabChange} />
      </MemoryRouter>,
    );
    fireEvent.keyDown(screen.getByRole("tab", { name: "Charities" }), {
      key: "a",
    });
    expect(onTabChange).not.toHaveBeenCalled();
  });
});
