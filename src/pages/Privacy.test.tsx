import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { Privacy } from "./Privacy";

describe("Privacy", () => {
  it("should render without crashing", () => {
    const { container } = render(<Privacy />);
    expect(container).toBeDefined();
  });

  it("should display the privacy policy title", () => {
    const { container } = render(<Privacy />);
    expect(container.textContent).toContain("Privacy Policy");
  });
});
