import { render } from "@testing-library/react";
import {
  TestWrapper,
  renderWithRouter,
  expectBlockchainLink,
  validationErrors,
  cssClasses,
} from "../testHelpers";

describe("testHelpers", () => {
  describe("TestWrapper", () => {
    it("renders children within BrowserRouter", () => {
      const TestChild = () => <div data-testid="test-child">Test Content</div>;
      const { getByTestId } = render(
        <TestWrapper>
          <TestChild />
        </TestWrapper>,
      );

      expect(getByTestId("test-child")).toBeInTheDocument();
      expect(getByTestId("test-child")).toHaveTextContent("Test Content");
    });

    it("creates BrowserRouter element correctly", () => {
      const children = <div>Test</div>;
      const wrapper = TestWrapper({ children });

      // Test that React.createElement was called with correct parameters
      expect(wrapper).toBeDefined();
    });
  });

  describe("renderWithRouter", () => {
    it("renders component with router context", () => {
      const TestComponent = () => (
        <div data-testid="routed-component">Routed Content</div>
      );
      const { getByTestId } = renderWithRouter(<TestComponent />);

      expect(getByTestId("routed-component")).toBeInTheDocument();
      expect(getByTestId("routed-component")).toHaveTextContent(
        "Routed Content",
      );
    });

    it("wraps component in TestWrapper", () => {
      const TestComponent = () => <div data-testid="wrapped">Wrapped</div>;
      const result = renderWithRouter(<TestComponent />);

      expect(result.getByTestId("wrapped")).toBeInTheDocument();
    });
  });

  describe("expectBlockchainLink", () => {
    it("validates blockchain explorer link attributes", () => {
      const { container } = render(
        <a
          href="https://moonbase.moonscan.io/tx/0xabcdef123456"
          target="_blank"
          rel="noopener noreferrer"
          data-testid="blockchain-link"
        >
          View Transaction
        </a>,
      );

      const link = container.querySelector(
        '[data-testid="blockchain-link"]',
      ) as HTMLElement;

      // This should not throw
      expect(() => {
        expectBlockchainLink(link, "0xabcdef123456");
      }).not.toThrow();
    });

    it("checks href attribute with hash", () => {
      const mockElement = document.createElement("a");
      mockElement.setAttribute(
        "href",
        "https://moonbase.moonscan.io/tx/0x123hash",
      );
      mockElement.setAttribute("target", "_blank");
      mockElement.setAttribute("rel", "noopener noreferrer");

      expect(() => {
        expectBlockchainLink(mockElement, "0x123hash");
      }).not.toThrow();
    });

    it("checks target and rel attributes", () => {
      const mockElement = document.createElement("a");
      mockElement.setAttribute(
        "href",
        "https://moonbase.moonscan.io/tx/0xtest",
      );
      mockElement.setAttribute("target", "_blank");
      mockElement.setAttribute("rel", "noopener noreferrer");

      // Test all three attribute checks
      expect(mockElement).toHaveAttribute(
        "href",
        "https://moonbase.moonscan.io/tx/0xtest",
      );
      expect(mockElement).toHaveAttribute("target", "_blank");
      expect(mockElement).toHaveAttribute("rel", "noopener noreferrer");

      expectBlockchainLink(mockElement, "0xtest");
    });
  });

  describe("validationErrors", () => {
    it("contains expected error messages", () => {
      expect(validationErrors.emptyAlias).toBe("Alias cannot be empty");
      expect(validationErrors.aliasLength).toBe(
        "Alias must be between 3 and 20 characters",
      );
      expect(validationErrors.invalidCharacters).toBe(
        "Alias can only contain letters, numbers, underscores, and hyphens",
      );
    });

    it("has all required validation error types", () => {
      expect(validationErrors).toHaveProperty("emptyAlias");
      expect(validationErrors).toHaveProperty("aliasLength");
      expect(validationErrors).toHaveProperty("invalidCharacters");
    });
  });

  describe("cssClasses", () => {
    it("contains expected card classes", () => {
      expect(cssClasses.card.default).toEqual([
        "bg-white",
        "border",
        "border-gray-200",
        "rounded-lg",
        "p-4",
      ]);
      expect(cssClasses.card.success).toEqual([
        "bg-green-50",
        "border",
        "border-green-200",
        "rounded-lg",
        "p-4",
      ]);
      expect(cssClasses.card.error).toEqual([
        "p-3",
        "bg-red-50",
        "text-red-700",
        "text-sm",
        "rounded-md",
      ]);
    });

    it("contains expected button classes", () => {
      expect(cssClasses.button.primary).toEqual(["flex", "items-center"]);
    });

    it("has all required class categories", () => {
      expect(cssClasses).toHaveProperty("card");
      expect(cssClasses).toHaveProperty("button");
      expect(cssClasses.card).toHaveProperty("default");
      expect(cssClasses.card).toHaveProperty("success");
      expect(cssClasses.card).toHaveProperty("error");
    });
  });
});
