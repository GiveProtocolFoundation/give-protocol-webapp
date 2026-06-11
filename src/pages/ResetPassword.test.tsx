import React from "react";
import {
  jest,
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import ResetPassword from "./ResetPassword";

// supabase is auto-mocked via moduleNameMapper → src/test-utils/supabaseMock.js
// Button, Input, and LoadingSpinner are auto-mocked via moduleNameMapper
const mockGetSession = jest.mocked(supabase.auth.getSession);
const mockOnAuthStateChange = jest.mocked(supabase.auth.onAuthStateChange);
const mockUpdateUser = jest.mocked(supabase.auth.updateUser);

/** Renders ResetPassword inside a MemoryRouter with an /auth stub. */
function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/auth/reset-password"]}>
      <Routes>
        <Route path="/auth/reset-password" element={<ResetPassword />} />
        <Route path="/auth" element={<div>Sign In</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPassword", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Default: no existing session
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    } as never);
    // Default: onAuthStateChange returns subscription with unsubscribe
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    } as never);
    mockUpdateUser.mockResolvedValue({ data: {} as never, error: null });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("shows loading spinner while validating", () => {
    renderPage();
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.getByText(/validating reset link/i)).toBeInTheDocument();
  });

  it("shows invalid-link state after timeout with no session", async () => {
    renderPage();

    // Flush getSession promise (resolves null)
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(5001);
    });

    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /request a new reset link/i }),
    ).toHaveAttribute("href", "/auth");
  });

  it("shows the form when an existing session is present", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    } as never);

    renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText("New Password")).toBeInTheDocument();
  });

  it("shows the form when PASSWORD_RECOVERY event fires", async () => {
    let capturedCallback: ((event: string) => void) | null = null;
    mockOnAuthStateChange.mockImplementation((cb) => {
      capturedCallback = cb as (event: string) => void;
      return { data: { subscription: { unsubscribe: jest.fn() } } } as never;
    });

    renderPage();

    await act(async () => {
      await Promise.resolve();
      if (capturedCallback !== null) {
        capturedCallback("PASSWORD_RECOVERY");
      }
    });

    expect(screen.getByText(/set new password/i)).toBeInTheDocument();
  });

  it("shows mismatch error when passwords differ", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    } as never);

    renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "different456" },
    });

    const form = screen
      .getByRole("button", { name: /update password/i })
      .closest("form");
    if (form === null) throw new Error("Form not found");

    act(() => {
      fireEvent.submit(form);
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /passwords do not match/i,
    );
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("calls supabase.auth.updateUser with the new password on valid submit", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    } as never);

    renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newpassword1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "newpassword1" },
    });

    const form = screen
      .getByRole("button", { name: /update password/i })
      .closest("form");
    if (form === null) throw new Error("Form not found");

    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "newpassword1" });
  });

  it("shows success state after successful password update", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    } as never);

    renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newpassword1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "newpassword1" },
    });

    const form = screen
      .getByRole("button", { name: /update password/i })
      .closest("form");
    if (form === null) throw new Error("Form not found");

    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });

    expect(
      screen.getByText(/password updated successfully/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /back to sign in/i }),
    ).toHaveAttribute("href", "/auth");
  });

  it("shows updateUser error message on failure", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    } as never);
    mockUpdateUser.mockResolvedValue({
      data: {} as never,
      error: { message: "Token has expired or is invalid" } as never,
    });

    renderPage();

    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.change(screen.getByLabelText("New Password"), {
      target: { value: "newpassword1" },
    });
    fireEvent.change(screen.getByLabelText("Confirm New Password"), {
      target: { value: "newpassword1" },
    });

    const form = screen
      .getByRole("button", { name: /update password/i })
      .closest("form");
    if (form === null) throw new Error("Form not found");

    await act(async () => {
      fireEvent.submit(form);
      await Promise.resolve();
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      /token has expired or is invalid/i,
    );
  });
});
