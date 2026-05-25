import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import CleanWaterInitiative from "./CleanWaterInitiative";

describe("CleanWaterInitiative", () => {
  it("should render without crashing", () => {
    const { container } = render(<CleanWaterInitiative />);
    expect(container).toBeDefined();
  });
});
