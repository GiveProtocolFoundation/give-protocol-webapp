import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EducationForAll from "./EducationForAll";

describe("EducationForAll", () => {
  it("should render the charity page template", () => {
    render(
      <MemoryRouter>
        <EducationForAll />
      </MemoryRouter>,
    );
    expect(document.body.textContent).toBeTruthy();
  });
});
