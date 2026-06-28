import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { ImportantNotice } from "./ImportantNotice";

describe("ImportantNotice", () => {
  it("should render children", () => {
    render(<ImportantNotice>Test content</ImportantNotice>);
    expect(screen.getByText("Test content")).toBeDefined();
  });

  it("should default to info variant", () => {
    const { container } = render(<ImportantNotice>Info text</ImportantNotice>);
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("bg-blue-50");
    expect(div.className).toContain("border-blue-400");
  });

  it("should apply warning variant classes", () => {
    const { container } = render(
      <ImportantNotice variant="warning">Warning text</ImportantNotice>,
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("bg-yellow-50");
    expect(div.className).toContain("border-yellow-400");
  });

  it("should apply highlight variant classes", () => {
    const { container } = render(
      <ImportantNotice variant="highlight">Highlight text</ImportantNotice>,
    );
    const div = container.firstElementChild as HTMLElement;
    expect(div.className).toContain("bg-gray-50");
    expect(div.className).toContain("border-gray-400");
  });

  it("should render warning icon for warning variant", () => {
    const { container } = render(
      <ImportantNotice variant="warning">Warning</ImportantNotice>,
    );
    // Warning variant wraps content in a flex container with icon
    const flexDiv = container.querySelector(".flex.items-start");
    expect(flexDiv).not.toBeNull();
  });

  it("should not render icon for non-warning variants", () => {
    const { container } = render(
      <ImportantNotice variant="info">Info</ImportantNotice>,
    );
    const flexDiv = container.querySelector(".flex.items-start");
    expect(flexDiv).toBeNull();
  });
});
