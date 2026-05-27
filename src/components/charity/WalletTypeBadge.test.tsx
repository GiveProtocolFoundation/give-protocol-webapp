import { describe, it, expect } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { WalletTypeBadge } from "./WalletTypeBadge";

describe("WalletTypeBadge", () => {
  it("should render nothing for EOA wallet type", () => {
    const { container } = render(<WalletTypeBadge walletType="eoa" />);
    expect(container.innerHTML).toBe("");
  });

  it("should render Safe multisig badge with threshold and signer count", () => {
    render(
      <WalletTypeBadge
        walletType="safe"
        signerThreshold={2}
        signerCount={3}
      />,
    );
    expect(
      screen.getByText("Multisig treasury · 2-of-3 signers"),
    ).toBeDefined();
  });

  it("should apply emerald color classes for Safe badge", () => {
    const { container } = render(
      <WalletTypeBadge
        walletType="safe"
        signerThreshold={2}
        signerCount={3}
      />,
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-emerald-100");
    expect(badge?.className).toContain("text-emerald-700");
  });

  it("should render institutional badge with custodian name", () => {
    render(
      <WalletTypeBadge
        walletType="institutional"
        custodianName="Fireblocks"
      />,
    );
    expect(screen.getByText("Held at Fireblocks")).toBeDefined();
  });

  it("should apply blue color classes for institutional badge", () => {
    const { container } = render(
      <WalletTypeBadge
        walletType="institutional"
        custodianName="Anchorage"
      />,
    );
    const badge = container.querySelector("span");
    expect(badge?.className).toContain("bg-blue-100");
    expect(badge?.className).toContain("text-blue-700");
  });

  it("should fall back to 'Custodian' when custodianName is null", () => {
    render(
      <WalletTypeBadge walletType="institutional" custodianName={null} />,
    );
    expect(screen.getByText("Held at Custodian")).toBeDefined();
  });

  it("should fall back to 0 values when signerThreshold/signerCount are null", () => {
    render(
      <WalletTypeBadge
        walletType="safe"
        signerThreshold={null}
        signerCount={null}
      />,
    );
    expect(
      screen.getByText("Multisig treasury · 0-of-0 signers"),
    ).toBeDefined();
  });

  it("should have role=status for accessibility", () => {
    render(
      <WalletTypeBadge
        walletType="safe"
        signerThreshold={3}
        signerCount={5}
      />,
    );
    expect(screen.getByRole("status")).toBeDefined();
  });

  it("should show tooltip on mouse enter for Safe badge", () => {
    render(
      <WalletTypeBadge
        walletType="safe"
        signerThreshold={2}
        signerCount={3}
      />,
    );
    const badge = screen.getByRole("status");
    fireEvent.mouseEnter(badge);
    expect(screen.getByRole("tooltip")).toBeDefined();
    expect(
      screen.getByText(
        "Donations go to a multi-signature wallet requiring multiple approvals before funds can move.",
      ),
    ).toBeDefined();
  });

  it("should hide tooltip on mouse leave", () => {
    render(
      <WalletTypeBadge
        walletType="safe"
        signerThreshold={2}
        signerCount={3}
      />,
    );
    const badge = screen.getByRole("status");
    fireEvent.mouseEnter(badge);
    expect(screen.getByRole("tooltip")).toBeDefined();
    fireEvent.mouseLeave(badge);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("should toggle tooltip on click (tap)", () => {
    render(
      <WalletTypeBadge
        walletType="institutional"
        custodianName="BitGo"
      />,
    );
    const badge = screen.getByRole("status");

    fireEvent.click(badge);
    expect(screen.getByRole("tooltip")).toBeDefined();

    fireEvent.click(badge);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });

  it("should show institutional tooltip with correct text", () => {
    render(
      <WalletTypeBadge
        walletType="institutional"
        custodianName="Fireblocks"
      />,
    );
    const badge = screen.getByRole("status");
    fireEvent.mouseEnter(badge);
    expect(
      screen.getByText(
        "Donations go to a wallet held by a qualified institutional custodian.",
      ),
    ).toBeDefined();
  });
});
