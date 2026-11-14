import { jest, describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { TimeRangeFilter } from "@/components/contribution/TimeRangeFilter.real";

describe("TimeRangeFilter", () => {
  it("renders a labelled select with the current value", () => {
    render(<TimeRangeFilter value="month" onChange={jest.fn()} />);
    const select = screen.getByRole("combobox", {
      name: "Filter by time range",
    });
    expect(select).toHaveValue("month");
  });

  it("reports the chosen range", () => {
    const onChange = jest.fn();
    render(<TimeRangeFilter value="all" onChange={onChange} />);
    fireEvent.change(screen.getByRole("combobox"), {
      target: { value: "week" },
    });
    expect(onChange).toHaveBeenCalledWith("week");
  });
});
