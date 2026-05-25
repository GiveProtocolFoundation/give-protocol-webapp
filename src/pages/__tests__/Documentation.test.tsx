import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Documentation from "../Documentation";

// DOCS_CONFIG is mocked via moduleNameMapper in jest.config.mjs
// providing { url: "https://docs.giveprotocol.io" }

const renderDocumentation = () =>
  render(
    <MemoryRouter>
      <Documentation />
    </MemoryRouter>,
  );

describe("Documentation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Redirect text", () => {
    it("renders the redirecting heading", () => {
      renderDocumentation();
      expect(
        screen.getByText("Redirecting to Documentation..."),
      ).toBeInTheDocument();
    });

    it("renders the fallback instruction text", () => {
      renderDocumentation();
      expect(
        screen.getByText(/If you are not redirected automatically/),
      ).toBeInTheDocument();
    });

    it("renders a click here link", () => {
      renderDocumentation();
      const link = screen.getByText("click here");
      expect(link).toBeInTheDocument();
      expect(link.tagName).toBe("A");
    });

    it("click here link points to docs URL", () => {
      renderDocumentation();
      const link = screen.getByText("click here");
      expect(link).toHaveAttribute(
        "href",
        "https://docs.giveprotocol.io",
      );
    });
  });

  describe("Page structure", () => {
    it("renders the heading as h1", () => {
      renderDocumentation();
      const heading = screen.getByRole("heading", { level: 1 });
      expect(heading).toHaveTextContent("Redirecting to Documentation...");
    });
  });
});
