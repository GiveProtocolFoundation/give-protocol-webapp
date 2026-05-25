import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Governance from "../Governance";

// ScrollReveal is mocked via moduleNameMapper in jest.config.mjs

const renderGovernance = () =>
  render(
    <MemoryRouter>
      <Governance />
    </MemoryRouter>,
  );

describe("Governance", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Page header", () => {
    it("renders the page title", () => {
      renderGovernance();
      expect(screen.getByText("Protocol Governance")).toBeInTheDocument();
    });

    it("renders the page subtitle", () => {
      renderGovernance();
      expect(
        screen.getByText(
          /Empowering our community through transparent and decentralized/,
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Governance cards", () => {
    it("renders the Voting Power card", () => {
      renderGovernance();
      expect(screen.getByText("Voting Power")).toBeInTheDocument();
    });

    it("renders Voting Power description", () => {
      renderGovernance();
      expect(
        screen.getByText(
          "Voting power is earned through active participation:",
        ),
      ).toBeInTheDocument();
    });

    it("renders Voting Power bullet items", () => {
      renderGovernance();
      expect(
        screen.getByText("Donations contribute to base voting power"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Volunteer hours add additional weight"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Verified organizations receive multipliers"),
      ).toBeInTheDocument();
    });

    it("renders the Proposal Thresholds card", () => {
      renderGovernance();
      expect(screen.getByText("Proposal Thresholds")).toBeInTheDocument();
    });

    it("renders Proposal Thresholds description", () => {
      renderGovernance();
      expect(
        screen.getByText("Core protocol changes require:"),
      ).toBeInTheDocument();
    });

    it("renders Proposal Thresholds bullet items", () => {
      renderGovernance();
      expect(
        screen.getByText("66% supermajority approval"),
      ).toBeInTheDocument();
      expect(screen.getByText("50% minimum participation")).toBeInTheDocument();
      expect(screen.getByText("48-hour voting period")).toBeInTheDocument();
    });

    it("renders the Council Oversight card", () => {
      renderGovernance();
      expect(screen.getByText("Council Oversight")).toBeInTheDocument();
    });

    it("renders Council Oversight description", () => {
      renderGovernance();
      expect(
        screen.getByText("A multi-signature council provides:"),
      ).toBeInTheDocument();
    });

    it("renders Council Oversight bullet items", () => {
      renderGovernance();
      expect(
        screen.getByText("Emergency response capabilities"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("4/7 signatures for critical actions"),
      ).toBeInTheDocument();
      expect(screen.getByText("24-hour maximum timelock")).toBeInTheDocument();
    });
  });

  describe("Proposal Process section", () => {
    it("renders the section heading", () => {
      renderGovernance();
      expect(screen.getByText("Proposal Process")).toBeInTheDocument();
    });

    it("renders the Creation step", () => {
      renderGovernance();
      expect(screen.getByText("1. Creation")).toBeInTheDocument();
    });

    it("renders the Discussion step", () => {
      renderGovernance();
      expect(screen.getByText("2. Discussion")).toBeInTheDocument();
    });

    it("renders the Voting step", () => {
      renderGovernance();
      expect(screen.getByText("3. Voting")).toBeInTheDocument();
    });

    it("renders the Execution step", () => {
      renderGovernance();
      expect(screen.getByText("4. Execution")).toBeInTheDocument();
    });
  });

  describe("Timeframes section", () => {
    it("renders the section heading", () => {
      renderGovernance();
      expect(screen.getByText("Timeframes & Delays")).toBeInTheDocument();
    });

    it("renders Standard Changes heading", () => {
      renderGovernance();
      expect(screen.getByText("Standard Changes")).toBeInTheDocument();
    });

    it("renders Emergency Actions heading", () => {
      renderGovernance();
      expect(screen.getByText("Emergency Actions")).toBeInTheDocument();
    });
  });

  describe("Important Notice section", () => {
    it("renders the Important Notice heading", () => {
      renderGovernance();
      expect(screen.getByText("Important Notice")).toBeInTheDocument();
    });

    it("renders the notice text", () => {
      renderGovernance();
      expect(
        screen.getByText(/All governance participants are required to review/),
      ).toBeInTheDocument();
    });
  });

  describe("Layout structure", () => {
    it("renders multiple scroll reveal wrappers", () => {
      renderGovernance();
      const scrollReveals = screen.getAllByTestId("scroll-reveal");
      expect(scrollReveals.length).toBeGreaterThanOrEqual(3);
    });
  });
});
