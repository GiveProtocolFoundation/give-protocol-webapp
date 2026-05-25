import { jest, describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DiscoveryTabs, readTabParam } from "./DiscoveryTabs";

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
});
