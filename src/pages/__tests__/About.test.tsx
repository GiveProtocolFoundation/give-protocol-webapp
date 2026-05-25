import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "../About";

// StaticPageLayout and ScrollReveal are mocked via moduleNameMapper
// in jest.config.mjs, so they render children without animations.

const renderAbout = () =>
  render(
    <MemoryRouter>
      <About />
    </MemoryRouter>,
  );

describe("About", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Page header", () => {
    it("renders the page title", () => {
      renderAbout();
      expect(screen.getByText("About Give Protocol")).toBeInTheDocument();
    });

    it("renders the subtitle", () => {
      renderAbout();
      expect(
        screen.getByText("Removing barriers to sustainable charitable giving."),
      ).toBeInTheDocument();
    });
  });

  describe("Mission and Vision section", () => {
    it("renders Our Mission heading", () => {
      renderAbout();
      expect(screen.getByText("Our Mission")).toBeInTheDocument();
    });

    it("renders mission description", () => {
      renderAbout();
      expect(
        screen.getByText(
          "To enable sustainable giving for lasting global impact.",
        ),
      ).toBeInTheDocument();
    });

    it("renders Our Vision heading", () => {
      renderAbout();
      expect(screen.getByText("Our Vision")).toBeInTheDocument();
    });

    it("renders vision description", () => {
      renderAbout();
      expect(
        screen.getByText(/A world where charitable giving is borderless/),
      ).toBeInTheDocument();
    });
  });

  describe("How We Make a Difference section", () => {
    it("renders section heading", () => {
      renderAbout();
      expect(screen.getByText("How We Make a Difference")).toBeInTheDocument();
    });

    it("renders Direct & Simple Giving feature", () => {
      renderAbout();
      expect(screen.getByText("Direct & Simple Giving")).toBeInTheDocument();
    });

    it("renders Making Time Count feature", () => {
      renderAbout();
      expect(screen.getByText("Making Time Count")).toBeInTheDocument();
    });

    it("renders Collective Impact Funds feature", () => {
      renderAbout();
      expect(screen.getByText("Collective Impact Funds")).toBeInTheDocument();
    });
  });

  describe("What We Stand For section", () => {
    it("renders section heading", () => {
      renderAbout();
      expect(screen.getByText("What We Stand For")).toBeInTheDocument();
    });

    it("renders Accountability value", () => {
      renderAbout();
      expect(screen.getByText("Accountability")).toBeInTheDocument();
    });

    it("renders Lasting Change value", () => {
      renderAbout();
      expect(screen.getByText("Lasting Change")).toBeInTheDocument();
    });

    it("renders Community Power value", () => {
      renderAbout();
      expect(screen.getByText("Community Power")).toBeInTheDocument();
    });

    it("renders Smart Innovation value", () => {
      renderAbout();
      expect(screen.getByText("Smart Innovation")).toBeInTheDocument();
    });
  });

  describe("Join Us section", () => {
    it("renders Join the Future of Giving heading", () => {
      renderAbout();
      expect(screen.getByText("Join the Future of Giving")).toBeInTheDocument();
    });

    it("renders Start Giving button", () => {
      renderAbout();
      expect(screen.getByText("Start Giving")).toBeInTheDocument();
    });

    it("renders Find Opportunities button", () => {
      renderAbout();
      expect(screen.getByText("Find Opportunities")).toBeInTheDocument();
    });
  });

  describe("Layout structure", () => {
    it("renders within the StaticPageLayout", () => {
      renderAbout();
      expect(screen.getByTestId("static-page-layout")).toBeInTheDocument();
    });

    it("renders multiple scroll reveal wrappers", () => {
      renderAbout();
      const scrollReveals = screen.getAllByTestId("scroll-reveal");
      expect(scrollReveals.length).toBeGreaterThanOrEqual(4);
    });
  });
});
