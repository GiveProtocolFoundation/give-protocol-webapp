import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { Legal } from "./Legal";

describe("Legal", () => {
  it("should render without crashing", () => {
    const { container } = render(<Legal />);
    expect(container).toBeDefined();
  });

  it("should display the terms title", () => {
    const { container } = render(<Legal />);
    expect(container.textContent).toContain("TERMS AND CONDITIONS");
  });
});
