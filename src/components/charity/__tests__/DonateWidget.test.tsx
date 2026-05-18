import React from "react";
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DonateWidget } from "../DonateWidget";

// Card, Button, DonationModal, and all contexts are mocked via moduleNameMapper

const defaultProps = {
  ein: "12-3456789",
  charityName: "Test Charity",
  walletAddress: "0x1234567890abcdef1234567890abcdef12345678",
  charityId: "charity-1",
  mode: "sidebar" as const,
  isVerified: false,
};

const renderWidget = (props = defaultProps) =>
  render(
    <MemoryRouter>
      <DonateWidget {...props} />
    </MemoryRouter>,
  );

describe("DonateWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Sidebar mode rendering", () => {
    it("renders the charity name in the heading", () => {
      renderWidget();
      expect(screen.getByText("Support Test Charity")).toBeInTheDocument();
    });

    it("renders the Card wrapper in sidebar mode", () => {
      renderWidget();
      expect(screen.getByTestId("card")).toBeInTheDocument();
    });

    it("renders a single Donate button", () => {
      renderWidget();
      expect(screen.getByText("Donate")).toBeInTheDocument();
    });

    it("renders fee disclosure text", () => {
      renderWidget();
      expect(
        screen.getByText(/0% platform fee on direct donations/),
      ).toBeInTheDocument();
    });
  });

  describe("Modal mode rendering", () => {
    it("does not render Card wrapper in modal mode", () => {
      renderWidget({ ...defaultProps, mode: "modal" });
      expect(screen.queryByTestId("card")).not.toBeInTheDocument();
    });

    it("does not render charity name heading in modal mode", () => {
      renderWidget({ ...defaultProps, mode: "modal" });
      expect(
        screen.queryByText("Support Test Charity"),
      ).not.toBeInTheDocument();
    });

    it("still renders the Donate button in modal mode", () => {
      renderWidget({ ...defaultProps, mode: "modal" });
      expect(screen.getByText("Donate")).toBeInTheDocument();
    });
  });

  describe("Wallet warning", () => {
    it("shows setup warning when charity has no wallet and no designation status", () => {
      renderWidget({ ...defaultProps, walletAddress: null });
      expect(
        screen.getByText(/hasn.t set up an official receiving wallet/),
      ).toBeInTheDocument();
    });

    it("does not show warning when charity has a legacy wallet (grandfathered)", () => {
      // walletDesignationStatus not provided — treated as legacy: donations allowed, no banner
      renderWidget();
      expect(
        screen.queryByText(/hasn.t set up an official receiving wallet/),
      ).not.toBeInTheDocument();
    });

    it("shows pending warning when designation is mid-flight", () => {
      renderWidget({
        ...defaultProps,
        walletAddress: null,
        walletDesignationStatus: "pending_email_confirmation",
      });
      expect(screen.getByText(/finishing wallet setup/)).toBeInTheDocument();
    });

    it("shows legacy banner when wallet present but status is 'unset' (post-migration grandfather)", () => {
      renderWidget({
        ...defaultProps,
        walletDesignationStatus: "unset",
      });
      expect(
        screen.getByText(/using a legacy wallet address/),
      ).toBeInTheDocument();
    });
  });

  describe("Donate button gating", () => {
    it("enables Donate when status is 'active'", () => {
      renderWidget({
        ...defaultProps,
        walletDesignationStatus: "active",
      });
      expect(screen.getByText("Donate").closest("button")).not.toBeDisabled();
    });

    it("disables Donate when status is pending", () => {
      renderWidget({
        ...defaultProps,
        walletDesignationStatus: "pending_email_confirmation",
      });
      expect(screen.getByText("Donate").closest("button")).toBeDisabled();
    });

    it("disables Donate when no wallet and no status", () => {
      renderWidget({ ...defaultProps, walletAddress: null });
      expect(screen.getByText("Donate").closest("button")).toBeDisabled();
    });
  });

  describe("Donation modal", () => {
    it("opens the donation modal when the user clicks Donate", async () => {
      renderWidget({ ...defaultProps, walletDesignationStatus: "active" });
      fireEvent.click(screen.getByText("Donate"));
      await waitFor(() => {
        expect(screen.getByTestId("donation-modal")).toBeInTheDocument();
      });
    });

    it("does not show the donation modal before the Donate button is clicked", () => {
      renderWidget();
      expect(screen.queryByTestId("donation-modal")).not.toBeInTheDocument();
    });
  });
});
