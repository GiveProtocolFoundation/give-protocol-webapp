import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "../NotFound";

const renderWithRouter = (props = {}) =>
  render(
    <MemoryRouter>
      <NotFound {...props} />
    </MemoryRouter>,
  );

describe("NotFound", () => {
  describe("Default rendering", () => {
    it("renders the 404 heading", () => {
      renderWithRouter();
      expect(screen.getByText("404")).toBeInTheDocument();
    });

    it("renders default title", () => {
      renderWithRouter();
      expect(screen.getByText("Page Not Found")).toBeInTheDocument();
    });

    it("renders default message", () => {
      renderWithRouter();
      expect(
        screen.getByText(
          "The page you're looking for doesn't exist or has been moved.",
        ),
      ).toBeInTheDocument();
    });

    it("renders home button by default", () => {
      renderWithRouter();
      expect(screen.getByText("Go Home")).toBeInTheDocument();
    });

    it("renders back button by default", () => {
      renderWithRouter();
      expect(screen.getByText("Go Back")).toBeInTheDocument();
    });
  });

  describe("Custom props", () => {
    it("renders custom title", () => {
      renderWithRouter({ title: "Custom Error Title" });
      expect(screen.getByText("Custom Error Title")).toBeInTheDocument();
    });

    it("renders custom message", () => {
      renderWithRouter({ message: "Custom error message" });
      expect(screen.getByText("Custom error message")).toBeInTheDocument();
    });

    it("hides home button when showHomeButton is false", () => {
      renderWithRouter({ showHomeButton: false });
      expect(screen.queryByText("Go Home")).not.toBeInTheDocument();
    });

    it("hides back button when showBackButton is false", () => {
      renderWithRouter({ showBackButton: false });
      expect(screen.queryByText("Go Back")).not.toBeInTheDocument();
    });

    it("renders retry button when onRetry is provided", () => {
      const onRetry = jest.fn();
      renderWithRouter({ onRetry });
      expect(screen.getByText("Retry")).toBeInTheDocument();
    });

    it("calls onRetry when retry button is clicked", () => {
      const onRetry = jest.fn();
      renderWithRouter({ onRetry });
      fireEvent.click(screen.getByText("Retry"));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe("Navigation", () => {
    it("Go Home button is clickable", () => {
      renderWithRouter();
      expect(() => fireEvent.click(screen.getByText("Go Home"))).not.toThrow();
    });

    it("Go Back button is clickable", () => {
      renderWithRouter();
      expect(() => fireEvent.click(screen.getByText("Go Back"))).not.toThrow();
    });
  });
});
