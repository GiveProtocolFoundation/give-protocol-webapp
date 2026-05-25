import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CauseGrid } from "./CauseGrid";

function renderGrid(searchTerm = "", category = "") {
  return render(
    <MemoryRouter>
      <CauseGrid searchTerm={searchTerm} category={category} />
    </MemoryRouter>,
  );
}

describe("CauseGrid", () => {
  it("should render all causes when no filters", () => {
    renderGrid();
    expect(screen.getByText("Clean Water Initiative")).toBeTruthy();
    expect(screen.getByText("Education Access Program")).toBeTruthy();
    expect(screen.getByText("Reforestation Project")).toBeTruthy();
  });

  it("should filter by search term", () => {
    renderGrid("water");
    expect(screen.getByText("Clean Water Initiative")).toBeTruthy();
    expect(screen.queryByText("Education Access Program")).toBeNull();
  });

  it("should filter by category", () => {
    renderGrid("", "Education");
    expect(screen.getByText("Education Access Program")).toBeTruthy();
    expect(screen.queryByText("Clean Water Initiative")).toBeNull();
  });

  it("should show no results message when nothing matches", () => {
    renderGrid("nonexistent", "");
    expect(screen.getByText(/No causes found/)).toBeTruthy();
  });

  it("should render links with cause slug URLs", () => {
    renderGrid();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/causes/clean-water-initiative");
  });
});
