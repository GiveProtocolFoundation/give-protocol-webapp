import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import ReforestationProject from "./ReforestationProject";

describe("ReforestationProject", () => {
  it("should render without crashing", () => {
    const { container } = render(<ReforestationProject />);
    expect(container).toBeDefined();
  });
});
