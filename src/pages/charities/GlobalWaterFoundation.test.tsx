import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import GlobalWaterFoundation from "./GlobalWaterFoundation";

describe("GlobalWaterFoundation", () => {
  it("should render the charity page template", () => {
    render(
      <MemoryRouter>
        <GlobalWaterFoundation />
      </MemoryRouter>,
    );
    expect(document.body.textContent).toBeTruthy();
  });
});
