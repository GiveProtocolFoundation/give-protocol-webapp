import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
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

  it("should render Section 6 Data Security in English", () => {
    render(<Privacy />);
    expect(
      screen.getByText(/As a technical measure under GDPR Article 32/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /we log and monitor administrative access to personal data/,
      ),
    ).toBeInTheDocument();
  });

  it("should not contain Spanish text in Section 6 or anywhere on the page", () => {
    const { container } = render(<Privacy />);
    expect(container.textContent).not.toContain("Como medida técnica conforme");
    expect(container.textContent).toContain(
      "As a technical measure under GDPR Article 32",
    );
  });
});
