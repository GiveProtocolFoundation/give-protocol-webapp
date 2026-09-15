import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { DiscoveryShell } from "./DiscoveryShell";

describe("DiscoveryShell", () => {
  it("renders main content inside overflow-x-hidden wrapper", () => {
    const { container } = render(
      <DiscoveryShell main={<p data-testid="main">Main content</p>} />,
    );
    const mainColumn = container.querySelector(".space-y-8.overflow-x-hidden");
    expect(mainColumn).toBeTruthy();
  });

  it("renders with rail slot", () => {
    const { container } = render(
      <DiscoveryShell
        main={<p>Main</p>}
        rail={<aside>Rail</aside>}
      />,
    );
    expect(container.textContent).toContain("Main");
    expect(container.textContent).toContain("Rail");
  });
});