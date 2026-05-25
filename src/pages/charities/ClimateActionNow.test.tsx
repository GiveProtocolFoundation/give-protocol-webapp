import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ClimateActionNow from "./ClimateActionNow";

describe("ClimateActionNow", () => {
  it("should render the charity page template", () => {
    render(
      <MemoryRouter>
        <ClimateActionNow />
      </MemoryRouter>,
    );
    // CharityPageTemplate is mocked, should render something
    expect(document.body.textContent).toBeTruthy();
  });
});
