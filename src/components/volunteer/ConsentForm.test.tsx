import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { ConsentForm } from "./ConsentForm";

function getCheckbox(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

describe("ConsentForm", () => {
  let mockAccept: ReturnType<typeof jest.fn>;
  let mockDecline: ReturnType<typeof jest.fn>;

  beforeEach(() => {
    cleanup();
    mockAccept = jest.fn();
    mockDecline = jest.fn();
  });

  function renderForm() {
    return render(
      <ConsentForm onAccept={mockAccept} onDecline={mockDecline} />,
    );
  }

  it("should render consent form with all checkboxes", () => {
    renderForm();
    expect(screen.getByText("Volunteer Application Consent")).toBeTruthy();
    expect(getCheckbox("essential-processing")).toBeTruthy();
    expect(getCheckbox("international-transfers")).toBeTruthy();
    expect(getCheckbox("age-confirmation")).toBeTruthy();
    expect(getCheckbox("privacy-notice")).toBeTruthy();
  });

  it("should render accept and decline buttons", () => {
    renderForm();
    expect(screen.getByText("Accept and Continue")).toBeTruthy();
    expect(screen.getByText("Do Not Accept")).toBeTruthy();
  });

  it("should call onDecline when Do Not Accept clicked", () => {
    renderForm();
    fireEvent.click(screen.getByText("Do Not Accept"));
    expect(mockDecline).toHaveBeenCalled();
  });

  it("should call onDecline when backdrop clicked", () => {
    renderForm();
    fireEvent.click(screen.getByLabelText("Close modal"));
    expect(mockDecline).toHaveBeenCalled();
  });

  it("should call onDecline on Escape key", () => {
    renderForm();
    fireEvent.keyDown(screen.getByLabelText("Close modal"), {
      key: "Escape",
    });
    expect(mockDecline).toHaveBeenCalled();
  });

  it("should disable accept button when required checkboxes unchecked", () => {
    renderForm();
    const button = screen.getByText("Accept and Continue");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it("should keep accept disabled when only essential is checked", () => {
    renderForm();
    fireEvent.click(getCheckbox("essential-processing"));
    const button = screen.getByText("Accept and Continue");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mockAccept).not.toHaveBeenCalled();
  });

  it("should call onAccept when all required checkboxes checked", () => {
    renderForm();
    fireEvent.click(getCheckbox("essential-processing"));
    fireEvent.click(getCheckbox("age-confirmation"));
    fireEvent.click(getCheckbox("privacy-notice"));
    fireEvent.click(screen.getByText("Accept and Continue"));
    expect(mockAccept).toHaveBeenCalled();
  });

  it("should enable accept button after checking essential processing", () => {
    renderForm();
    expect(screen.getByText("Accept and Continue")).toBeDisabled();
    fireEvent.click(getCheckbox("essential-processing"));
    // Still disabled — age and privacy unchecked
    expect(screen.getByText("Accept and Continue")).toBeDisabled();
  });

  it("should enable accept button when all required checkboxes checked", () => {
    renderForm();
    expect(screen.getByText("Accept and Continue")).toBeDisabled();
    fireEvent.click(getCheckbox("essential-processing"));
    fireEvent.click(getCheckbox("age-confirmation"));
    fireEvent.click(getCheckbox("privacy-notice"));
    expect(screen.getByText("Accept and Continue")).not.toBeDisabled();
  });

  it("should allow toggling international transfers checkbox", () => {
    renderForm();
    const checkbox = getCheckbox("international-transfers");
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});
