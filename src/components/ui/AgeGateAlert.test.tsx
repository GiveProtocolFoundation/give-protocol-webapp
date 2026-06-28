import { jest, describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { AGE_AFFIRMATION_COPY } from "@/constants/ageAffirmation";

jest.mock("@/hooks/useTranslation", () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}));

import { AgeGateAlert } from "./AgeGateAlert";

describe("AgeGateAlert", () => {
  it("renders nothing when visible is false", () => {
    const { container } = render(<AgeGateAlert visible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the negative-path message when visible", () => {
    render(<AgeGateAlert visible={true} />);
    expect(screen.getByText(AGE_AFFIRMATION_COPY.negative)).toBeInTheDocument();
  });

  it("has role=alert for screen reader announcement", () => {
    render(<AgeGateAlert visible={true} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("has aria-live=polite on the alert container", () => {
    render(<AgeGateAlert visible={true} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "polite");
  });

  it("hides the icon from assistive technology", () => {
    render(<AgeGateAlert visible={true} />);
    const alert = screen.getByRole("alert");
    const svg = alert.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies dark-mode contrast classes", () => {
    render(<AgeGateAlert visible={true} />);
    const alert = screen.getByRole("alert");
    expect(alert.className).toContain("dark:bg-red-900/30");
    expect(alert.className).toContain("dark:border-red-800");
  });
});
