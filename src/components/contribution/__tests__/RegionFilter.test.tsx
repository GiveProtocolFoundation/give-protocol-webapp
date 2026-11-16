import { jest, describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { RegionFilter } from "@/components/contribution/RegionFilter.real";

describe("RegionFilter", () => {
  it("renders a labelled select with the current value", () => {
    render(<RegionFilter value="lac" onChange={jest.fn()} />);
    expect(
      screen.getByRole("combobox", { name: "Filter by giver region" }),
    ).toHaveValue("lac");
  });

  it("offers all giver regions, the seven UNICEF regions and unspecified", () => {
    render(<RegionFilter value="all" onChange={jest.fn()} />);
    const values = screen
      .getAllByRole("option")
      .map((option) => (option as HTMLOptionElement).value);
    expect(values).toEqual([
      "all",
      "na",
      "lac",
      "eca",
      "mena",
      "ssa",
      "sa",
      "eap",
      "unspecified",
    ]);
  });

  it("shows the UNICEF region names", () => {
    render(<RegionFilter value="all" onChange={jest.fn()} />);
    expect(
      screen.getByRole("option", { name: "Sub-Saharan Africa" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Region not specified" }),
    ).toBeInTheDocument();
  });

  it("reports the chosen region", () => {
    const onChange = jest.fn();
    render(<RegionFilter value="all" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "mena" },
    });
    expect(onChange).toHaveBeenCalledWith("mena");
  });
});
