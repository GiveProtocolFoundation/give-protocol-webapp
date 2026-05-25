import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { PortfolioGrid } from "./PortfolioGrid";

function renderGrid(searchTerm = "", category = "") {
  return render(
    <MemoryRouter>
      <PortfolioGrid searchTerm={searchTerm} category={category} />
    </MemoryRouter>,
  );
}

describe("PortfolioGrid", () => {
  it("should render all portfolio funds when no filters", () => {
    renderGrid();
    expect(screen.getByText("Environmental Impact Fund")).toBeTruthy();
    expect(screen.getByText("Poverty Relief Impact Fund")).toBeTruthy();
    expect(screen.getByText("Education Impact Fund")).toBeTruthy();
  });

  it("should filter by search term", () => {
    renderGrid("poverty");
    expect(screen.getByText("Poverty Relief Impact Fund")).toBeTruthy();
    expect(screen.queryByText("Environmental Impact Fund")).toBeNull();
  });

  it("should filter by category", () => {
    renderGrid("", "Education");
    expect(screen.getByText("Education Impact Fund")).toBeTruthy();
    expect(screen.queryByText("Environmental Impact Fund")).toBeNull();
  });

  it("should render empty grid when nothing matches", () => {
    renderGrid("nonexistent");
    expect(screen.queryByText("Environmental Impact Fund")).toBeNull();
  });

  it("should render links with portfolio slug URLs", () => {
    renderGrid();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/portfolio/environmental");
  });
});
