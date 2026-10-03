import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { CarouselSearch } from "./CarouselSearch";

describe("CarouselSearch", () => {
  it("reports changes and uses the placeholder as its accessible name", () => {
    const onChange = jest.fn();
    render(
      <CarouselSearch
        value=""
        onChange={onChange}
        placeholder="Search causes..."
      />,
    );
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Search causes..." }),
      {
        target: { value: "water" },
      },
    );
    expect(onChange).toHaveBeenCalledWith("water");
  });
});
