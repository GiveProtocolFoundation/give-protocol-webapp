import { render, screen } from "@testing-library/react";

import { DiscoveryShellSkeleton } from "./DiscoveryShellSkeleton";

describe("DiscoveryShellSkeleton", () => {
  it("renders multiple skeleton placeholders", () => {
    render(<DiscoveryShellSkeleton />);
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders skeleton elements for each layout slot", () => {
    render(<DiscoveryShellSkeleton />);
    // topBar: 1 skeleton, main: 1 skeleton, rail: 2 skeletons = 4 total
    // (mock Skeleton ignores count prop, rendering one div per component instance)
    const skeletons = screen.getAllByTestId("skeleton");
    expect(skeletons.length).toBe(4);
  });

  it("renders without errors", () => {
    const { container } = render(<DiscoveryShellSkeleton />);
    expect(container.firstElementChild).toBeTruthy();
  });
});
