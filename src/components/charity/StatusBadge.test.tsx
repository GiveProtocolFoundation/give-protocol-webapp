import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("should render unclaimed status", () => {
    render(<StatusBadge status="unclaimed" />);
    expect(screen.getByText("Unclaimed")).toBeDefined();
  });

  it("should render claimed-pending status", () => {
    render(<StatusBadge status="claimed-pending" />);
    expect(screen.getByText("Pending Verification")).toBeDefined();
  });

  it("should render verified status", () => {
    render(<StatusBadge status="verified" />);
    expect(screen.getByText("Verified")).toBeDefined();
  });

  it("should render unknown status as-is", () => {
    render(<StatusBadge status={"unknown-status" as "unclaimed"} />);
    expect(screen.getByText("unknown-status")).toBeDefined();
  });

  it("should apply correct CSS classes for unclaimed", () => {
    const { container } = render(<StatusBadge status="unclaimed" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-amber-100");
    expect(badge?.className).toContain("text-amber-700");
  });

  it("should apply correct CSS classes for verified", () => {
    const { container } = render(<StatusBadge status="verified" />);
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-emerald-100");
    expect(badge?.className).toContain("text-emerald-700");
  });
});
