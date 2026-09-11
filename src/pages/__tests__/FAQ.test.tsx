import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FAQ from "../FAQ";

// StaticPageLayout is mocked via moduleNameMapper in jest.config.mjs, so page
// content renders directly without animation or layout dependencies.

const renderFAQ = () =>
  render(
    <MemoryRouter>
      <FAQ />
    </MemoryRouter>,
  );

describe("FAQ", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Page header", () => {
    it("renders the page title", () => {
      renderFAQ();
      expect(
        screen.getByText("Frequently Asked Questions"),
      ).toBeInTheDocument();
    });

    it("renders the subtitle", () => {
      renderFAQ();
      expect(
        screen.getByText(
          "Everything you need to know about giving, volunteering, and blockchain transparency.",
        ),
      ).toBeInTheDocument();
    });
  });

  describe("Question content", () => {
    it("renders all five category sections", () => {
      renderFAQ();
      expect(screen.getByText("About Give Protocol")).toBeInTheDocument();
      expect(screen.getByText("Crypto & Donations")).toBeInTheDocument();
      expect(screen.getByText("Trust & Safety")).toBeInTheDocument();
      expect(screen.getByText("Volunteering")).toBeInTheDocument();
      expect(screen.getByText("For Organizations")).toBeInTheDocument();
    });

    it("renders all 16 question buttons", () => {
      renderFAQ();
      const questionButtons = screen
        .getAllByRole("button")
        .filter((button) => button.hasAttribute("aria-expanded"));
      expect(questionButtons.length).toBe(16);
    });

    it("expands an answer when its question is clicked", () => {
      renderFAQ();
      const firstQuestion = screen.getByText("What is Give Protocol?");
      fireEvent.click(firstQuestion);
      expect(
        screen.getByText(/transparent, blockchain-powered platform/i),
      ).toBeInTheDocument();
    });

    it("collapses an open answer when clicked again", () => {
      renderFAQ();
      const firstQuestion = screen.getByText("What is Give Protocol?");
      fireEvent.click(firstQuestion);
      expect(
        screen.getByText(/transparent, blockchain-powered platform/i),
      ).toBeInTheDocument();
      fireEvent.click(firstQuestion);
      expect(
        screen.queryByText(/transparent, blockchain-powered platform/i),
      ).not.toBeInTheDocument();
    });
  });
});
