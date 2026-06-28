import { render, screen } from "@testing-library/react";
import { DiscoveryShell } from "./DiscoveryShell";

describe("DiscoveryShell", () => {
  it("renders main content", () => {
    render(<DiscoveryShell main={<div>Main Content</div>} />);
    expect(screen.getByText("Main Content")).toBeInTheDocument();
  });

  it("renders topBar when provided", () => {
    render(
      <DiscoveryShell topBar={<div>Top Bar</div>} main={<div>Main</div>} />,
    );
    expect(screen.getByText("Top Bar")).toBeInTheDocument();
  });

  it("does not render topBar when not provided", () => {
    const { container } = render(<DiscoveryShell main={<div>Main</div>} />);
    expect(container.querySelector(".mb-10")).not.toBeInTheDocument();
  });

  it("renders rail when provided", () => {
    render(
      <DiscoveryShell main={<div>Main</div>} rail={<div>Rail Content</div>} />,
    );
    expect(screen.getByText("Rail Content")).toBeInTheDocument();
    expect(screen.getByRole("complementary")).toBeInTheDocument();
  });

  it("does not render aside when rail is not provided", () => {
    render(<DiscoveryShell main={<div>Main</div>} />);
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("renders bottom slot when provided", () => {
    render(
      <DiscoveryShell
        main={<div>Main</div>}
        bottom={<div>Bottom Content</div>}
      />,
    );
    expect(screen.getByText("Bottom Content")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DiscoveryShell main={<div>Main</div>} className="custom-class" />,
    );
    expect(container.firstElementChild).toHaveClass("custom-class");
  });
});
