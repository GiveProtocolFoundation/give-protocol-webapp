import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { ImpactProfileForm } from "../ImpactProfileForm";

const mockOnSave = jest.fn(() => Promise.resolve());

const defaultProps = {
  initialData: null,
  onSave: mockOnSave,
  loading: false,
};

describe("ImpactProfileForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Accessibility — ARIA labels", () => {
    it("mission statement textarea has aria-label", () => {
      render(<ImpactProfileForm {...defaultProps} />);
      const textarea = screen.getByRole("textbox", {
        name: /mission statement/i,
      });
      expect(textarea.tagName).toBe("TEXTAREA");
    });

    it("stat label inputs are associated with visible labels", () => {
      render(<ImpactProfileForm {...defaultProps} />);
      // Input mock renders <label htmlFor> + <input> — getByLabelText works
      expect(screen.getByLabelText(/label 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/label 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/label 3/i)).toBeInTheDocument();
    });

    it("stat value inputs are associated with visible labels", () => {
      render(<ImpactProfileForm {...defaultProps} />);
      expect(screen.getByLabelText(/value 1/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/value 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/value 3/i)).toBeInTheDocument();
    });

    it("newly added highlight input has aria-label", () => {
      render(<ImpactProfileForm {...defaultProps} />);
      const addBtn = screen.getByRole("button", { name: /add highlight/i });
      fireEvent.click(addBtn);

      const highlightInput = screen.getByRole("textbox", {
        name: /impact highlight 1/i,
      });
      expect(highlightInput).toBeInTheDocument();
    });

    it("highlight aria-label increments for each added highlight", () => {
      render(<ImpactProfileForm {...defaultProps} />);
      const addBtn = screen.getByRole("button", { name: /add highlight/i });

      fireEvent.click(addBtn);
      fireEvent.click(addBtn);

      expect(
        screen.getByRole("textbox", { name: /impact highlight 1/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("textbox", { name: /impact highlight 2/i }),
      ).toBeInTheDocument();
    });
  });
});
