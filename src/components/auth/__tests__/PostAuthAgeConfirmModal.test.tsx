import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { PostAuthAgeConfirmModal } from "../PostAuthAgeConfirmModal";

describe("PostAuthAgeConfirmModal", () => {
  it("renders the modal with title and age confirmation copy", () => {
    render(
      <PostAuthAgeConfirmModal onConfirm={jest.fn()} onDecline={jest.fn()} />,
    );
    expect(
      screen.getByRole("dialog", { name: /age confirmation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/I confirm.*16 or older/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/I am under 16/i)).toBeInTheDocument();
  });

  it("calls onConfirm when the confirm button is clicked", () => {
    const onConfirm = jest.fn();
    render(
      <PostAuthAgeConfirmModal onConfirm={onConfirm} onDecline={jest.fn()} />,
    );
    fireEvent.click(screen.getByText(/I confirm.*16 or older/i));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onDecline when the decline button is clicked", () => {
    const onDecline = jest.fn();
    render(
      <PostAuthAgeConfirmModal onConfirm={jest.fn()} onDecline={onDecline} />,
    );
    fireEvent.click(screen.getByText(/I am under 16/i));
    expect(onDecline).toHaveBeenCalledTimes(1);
  });

  it("shows the negative-path message (AGE_AFFIRMATION_COPY.negative)", () => {
    render(
      <PostAuthAgeConfirmModal onConfirm={jest.fn()} onDecline={jest.fn()} />,
    );
    // AGE_AFFIRMATION_COPY.negative is the aria-live paragraph at the bottom of the modal
    expect(
      screen.getByText(/unable to process your request/i),
    ).toBeInTheDocument();
  });

  it("contains a link to the Privacy Policy", () => {
    render(
      <PostAuthAgeConfirmModal onConfirm={jest.fn()} onDecline={jest.fn()} />,
    );
    const privacyLink = screen.getByRole("link", { name: /privacy policy/i });
    expect(privacyLink).toHaveAttribute("href", "/privacy");
  });
});
