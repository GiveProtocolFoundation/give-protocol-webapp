import { render, screen } from "@testing-library/react";
import { RegistryBadge } from "./RegistryBadge";

describe("RegistryBadge", () => {
  it("names the IRS only for IRS records", () => {
    render(<RegistryBadge registrySource="IRS_BMF" />);
    expect(screen.getByText("IRS-registered")).toBeInTheDocument();
  });

  it("uses the registry's own name for other sources", () => {
    render(<RegistryBadge registrySource="CRA_LISTED" />);
    expect(screen.getByText("CRA LISTED-registered")).toBeInTheDocument();
    expect(screen.queryByText(/IRS/)).not.toBeInTheDocument();
  });

  it("renders nothing for an unknown registry by default", () => {
    const { container } = render(<RegistryBadge registrySource={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("falls back to Verified when platform-verified and registry unknown", () => {
    render(<RegistryBadge registrySource={null} platformVerified />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
  });

  it("prefers the registry over the platform fallback", () => {
    render(<RegistryBadge registrySource="IRS_BMF" platformVerified />);
    expect(screen.getByText("IRS-registered")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });
});
