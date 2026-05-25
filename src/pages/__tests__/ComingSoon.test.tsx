import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ComingSoon from "../ComingSoon";

// Logger is mocked via moduleNameMapper in jest.config.mjs

const renderComingSoon = () =>
  render(
    <MemoryRouter>
      <ComingSoon />
    </MemoryRouter>,
  );

describe("ComingSoon", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock<typeof fetch>;
  });

  describe("Hero section", () => {
    it("renders the launch timeline badge", () => {
      renderComingSoon();
      expect(screen.getByText("Launching Q1 2026")).toBeInTheDocument();
    });

    it("renders the main heading", () => {
      renderComingSoon();
      expect(screen.getByText("The Future of")).toBeInTheDocument();
    });

    it("renders the gradient heading text", () => {
      renderComingSoon();
      expect(screen.getByText("Transparent Giving")).toBeInTheDocument();
    });

    it("renders the waitlist call-to-action", () => {
      renderComingSoon();
      expect(
        screen.getByText(/Join the waitlist for pre-launch access/),
      ).toBeInTheDocument();
    });

    it("renders the impact tagline", () => {
      renderComingSoon();
      expect(
        screen.getByText("Transform how charities sustain impact"),
      ).toBeInTheDocument();
    });
  });

  describe("Email form", () => {
    it("renders the email input", () => {
      renderComingSoon();
      expect(
        screen.getByPlaceholderText("Enter your email for pre-launch access"),
      ).toBeInTheDocument();
    });

    it("renders the email input with accessible label", () => {
      renderComingSoon();
      expect(
        screen.getByLabelText("Email address for waitlist"),
      ).toBeInTheDocument();
    });

    it("renders the Join Waitlist button", () => {
      renderComingSoon();
      expect(screen.getByText("Join Waitlist")).toBeInTheDocument();
    });

    it("updates email input value on change", () => {
      renderComingSoon();
      const input = screen.getByLabelText("Email address for waitlist");
      fireEvent.change(input, { target: { value: "test@example.com" } });
      expect(input).toHaveValue("test@example.com");
    });

    it("shows error for invalid email without @", () => {
      renderComingSoon();
      const input = screen.getByLabelText("Email address for waitlist");
      fireEvent.change(input, { target: { value: "invalidemail" } });
      const form = input.closest("form") as HTMLFormElement;
      fireEvent.submit(form);
      expect(
        screen.getByText("Please enter a valid email address"),
      ).toBeInTheDocument();
    });

    it("shows error for empty email", () => {
      renderComingSoon();
      const input = screen.getByLabelText("Email address for waitlist");
      const form = input.closest("form") as HTMLFormElement;
      fireEvent.submit(form);
      expect(
        screen.getByText("Please enter a valid email address"),
      ).toBeInTheDocument();
    });

    it("clears error state when user types after error", () => {
      renderComingSoon();
      const input = screen.getByLabelText("Email address for waitlist");
      const form = input.closest("form") as HTMLFormElement;
      fireEvent.submit(form);
      expect(
        screen.getByText("Please enter a valid email address"),
      ).toBeInTheDocument();

      fireEvent.change(input, { target: { value: "t" } });
      expect(
        screen.queryByText("Please enter a valid email address"),
      ).not.toBeInTheDocument();
    });

    it("shows success message on successful submission", async () => {
      const mockFetch = jest.fn() as jest.Mock<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);
      global.fetch = mockFetch;

      renderComingSoon();
      const input = screen.getByLabelText("Email address for waitlist");
      fireEvent.change(input, { target: { value: "test@example.com" } });
      fireEvent.click(screen.getByText("Join Waitlist"));

      await waitFor(() => {
        expect(screen.getByText(/Thanks for joining/)).toBeInTheDocument();
      });
    });

    it("shows error message on failed submission", async () => {
      const mockFetch = jest.fn() as jest.Mock<typeof fetch>;
      mockFetch.mockResolvedValue({
        ok: false,
        json: () => Promise.resolve({ message: "Server error" }),
      } as Response);
      global.fetch = mockFetch;

      renderComingSoon();
      const input = screen.getByLabelText("Email address for waitlist");
      fireEvent.change(input, { target: { value: "test@example.com" } });
      fireEvent.click(screen.getByText("Join Waitlist"));

      await waitFor(() => {
        expect(
          screen.getByText("Failed to join waitlist. Please try again."),
        ).toBeInTheDocument();
      });
    });

    it("shows error message on network failure", async () => {
      const mockFetch = jest.fn() as jest.Mock<typeof fetch>;
      mockFetch.mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      renderComingSoon();
      const input = screen.getByLabelText("Email address for waitlist");
      fireEvent.change(input, { target: { value: "test@example.com" } });
      fireEvent.click(screen.getByText("Join Waitlist"));

      await waitFor(() => {
        expect(
          screen.getByText("Failed to join waitlist. Please try again."),
        ).toBeInTheDocument();
      });
    });
  });

  describe("Features preview", () => {
    it("renders the Transparent feature card", () => {
      renderComingSoon();
      expect(screen.getByText("Transparent")).toBeInTheDocument();
    });

    it("renders the Transparent feature description", () => {
      renderComingSoon();
      expect(
        screen.getByText(
          "Track your impact with blockchain-verified donations",
        ),
      ).toBeInTheDocument();
    });

    it("renders the Efficient feature card", () => {
      renderComingSoon();
      expect(screen.getByText("Efficient")).toBeInTheDocument();
    });

    it("renders the Efficient feature description", () => {
      renderComingSoon();
      expect(
        screen.getByText(
          "Smart contracts ensure funds reach their destination",
        ),
      ).toBeInTheDocument();
    });

    it("renders the Impactful feature card", () => {
      renderComingSoon();
      expect(screen.getByText("Impactful")).toBeInTheDocument();
    });

    it("renders the Impactful feature description", () => {
      renderComingSoon();
      expect(
        screen.getByText(
          "Maximize your giving through innovative DeFi strategies",
        ),
      ).toBeInTheDocument();
    });

    it("renders the Sustainable feature card", () => {
      renderComingSoon();
      expect(screen.getByText("Sustainable")).toBeInTheDocument();
    });

    it("renders the Sustainable feature description", () => {
      renderComingSoon();
      expect(
        screen.getByText(
          "Creating the rails for perpetual funding for charities",
        ),
      ).toBeInTheDocument();
    });

    it("renders four feature articles", () => {
      renderComingSoon();
      const articles = document.querySelectorAll("article");
      expect(articles).toHaveLength(4);
    });
  });
});
