import React from "react"; // eslint-disable-line no-unused-vars, @typescript-eslint/no-unused-vars
import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomizeModal } from "../CustomizeModal";
import { ConsentProvider } from "@/lib/consent/ConsentProvider";
import { CONSENT_STORAGE_KEY } from "@/lib/consent/storage";

// Modal is mocked globally via moduleNameMapper (data-testid="modal", always renders).
// useTranslation is mocked globally via moduleNameMapper (returns en.ts strings).

const renderModal = (onClose = jest.fn(), showCloseButton?: boolean) =>
  render(
    <ConsentProvider>
      <CustomizeModal onClose={onClose} showCloseButton={showCloseButton} />
    </ConsentProvider>,
  );

describe("CustomizeModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("essential toggle is disabled and aria-checked is true", () => {
    renderModal();
    const essentialToggle = screen.getByRole("switch", {
      name: /essential cookies/i,
    });
    expect(essentialToggle).toBeDisabled();
    expect(essentialToggle).toHaveAttribute("aria-checked", "true");
  });

  it("analytics toggle starts at categories.analytics default (false)", () => {
    renderModal();
    // With no stored consent, categories.analytics defaults to false.
    const analyticsToggle = screen.getByRole("switch", { name: /analytics/i });
    expect(analyticsToggle).toHaveAttribute("aria-checked", "false");
  });

  it("analytics toggle aria-checked reflects stored analytics value (true)", () => {
    localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        decidedAt: new Date().toISOString(),
        categories: { essential: true, analytics: true },
      }),
    );
    renderModal();
    const analyticsToggle = screen.getByRole("switch", { name: /analytics/i });
    expect(analyticsToggle).toHaveAttribute("aria-checked", "true");
  });

  it("Save calls accept({ essential:true, analytics:false }) and calls onClose", () => {
    const onClose = jest.fn();
    renderModal(onClose);

    fireEvent.click(screen.getByText("Save preferences"));

    expect(onClose).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!);
    expect(stored.categories).toEqual({ essential: true, analytics: false });
  });

  it("Save with analytics toggled on calls accept({ essential:true, analytics:true })", () => {
    const onClose = jest.fn();
    renderModal(onClose);

    // Toggle analytics on
    fireEvent.click(screen.getByRole("switch", { name: /analytics/i }));

    // Save
    fireEvent.click(screen.getByText("Save preferences"));

    expect(onClose).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(localStorage.getItem(CONSENT_STORAGE_KEY)!);
    expect(stored.categories).toEqual({ essential: true, analytics: true });
  });

  it("Cancel calls onClose without writing consent", () => {
    const onClose = jest.fn();
    renderModal(onClose);

    fireEvent.click(screen.getByText("Cancel"));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });

  it("ESC key does not call accept or decline (no consent written)", () => {
    // ESC is forwarded to onClose by the real Modal's focus-trap; the modal
    // mock does not wire up ESC.  This test verifies that nothing in
    // CustomizeModal itself calls accept/decline on an Escape keydown —
    // protecting against accidental handler additions.
    renderModal();

    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });

    expect(localStorage.getItem(CONSENT_STORAGE_KEY)).toBeNull();
  });
});
