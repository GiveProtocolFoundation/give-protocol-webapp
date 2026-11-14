import { jest, describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  OpportunityDetailFields,
  type OpportunityDetailValues,
} from "../OpportunityDetailFields";

const values: OpportunityDetailValues = {
  schedule: "",
  startDate: "",
  endDate: "",
  applicationDeadline: "",
  volunteersNeeded: "",
  minimumAge: "",
  requirements: "",
  benefits: "",
  backgroundCheckRequired: false,
  trainingProvided: false,
};

describe("OpportunityDetailFields", () => {
  it("renders every detail input", () => {
    render(
      <OpportunityDetailFields
        values={values}
        errors={{}}
        onChange={jest.fn()}
      />,
    );
    for (const label of [
      "Schedule",
      "Start date",
      "End date",
      "Application deadline",
      "Volunteers needed",
      "Minimum age",
      "Requirements (one per line)",
      "Benefits (one per line)",
      "Background check required",
      "Training provided",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("reports changes to text inputs and checkboxes", () => {
    const onChange = jest.fn();
    render(
      <OpportunityDetailFields
        values={values}
        errors={{}}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText("Schedule"), {
      target: { value: "Tuesdays" },
    });
    fireEvent.click(screen.getByLabelText("Training provided"));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("shows validation errors", () => {
    render(
      <OpportunityDetailFields
        values={values}
        errors={{ endDate: "End date must be on or after the start date" }}
        onChange={jest.fn()}
      />,
    );
    expect(
      screen.getByText("End date must be on or after the start date"),
    ).toBeInTheDocument();
  });
});
