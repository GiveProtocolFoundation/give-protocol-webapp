import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { PhoneSettings } from "../PhoneSettings";
import { supabase } from "@/lib/supabase";

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const makeUser = (phone?: string) => ({
  id: "user-1",
  email: "user@example.com",
  identities: [],
  app_metadata: {},
  user_metadata: phone !== undefined ? { phone } : {},
  aud: "authenticated",
  created_at: "2024-01-01",
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
    data: { user: makeUser() },
    error: null,
  });
  // @ts-ignore - updateUser is not defined in SupabaseAuth API types
  mockSupabase.auth.updateUser = jest
    .fn()
    .mockResolvedValue({ data: {}, error: null });
});

describe("PhoneSettings", () => {
  describe("rendering", () => {
    it("shows the phone heading", async () => {
      render(<PhoneSettings />);
      await waitFor(() => {
        expect(screen.getByText(/Phone \(Optional/)).toBeInTheDocument();
      });
    });

    it("shows Add button when no phone saved", async () => {
      render(<PhoneSettings />);
      await waitFor(() => {
        expect(screen.getByText("Add")).toBeInTheDocument();
      });
    });

    it("shows saved phone number and Change button", async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: makeUser("+15550001234") },
        error: null,
      });
      render(<PhoneSettings />);
      await waitFor(() => {
        expect(screen.getByText("+15550001234")).toBeInTheDocument();
        expect(screen.getByText("Change")).toBeInTheDocument();
      });
    });
  });

  describe("editing", () => {
    it("shows input field when Add is clicked", async () => {
      render(<PhoneSettings />);
      await waitFor(() => {
        expect(screen.getByText("Add")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Add"));
      expect(
        screen.getByLabelText("Phone number for urgent impact alerts"),
      ).toBeInTheDocument();
    });

    it("shows validation error for invalid phone number", async () => {
      render(<PhoneSettings />);
      await waitFor(() => {
        fireEvent.click(screen.getByText("Add"));
      });
      const input = screen.getByLabelText(
        "Phone number for urgent impact alerts",
      );
      fireEvent.change(input, { target: { value: "not-a-phone" } });
      fireEvent.submit(input.closest("form") as HTMLElement);
      await waitFor(() => {
        expect(
          screen.getByText(/valid international phone number/),
        ).toBeInTheDocument();
      });
    });

    it("allows empty phone (clears the field)", async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: makeUser("+15550001234") },
        error: null,
      });
      render(<PhoneSettings />);
      await waitFor(() => {
        fireEvent.click(screen.getByText("Change"));
      });
      const input = screen.getByLabelText(
        "Phone number for urgent impact alerts",
      );
      fireEvent.change(input, { target: { value: "" } });
      fireEvent.submit(input.closest("form") as HTMLElement);
      await waitFor(() => {
        // @ts-ignore - missing updateUser in AuthUserApi mock types
        expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
          data: { phone: null },
        });
      });
    });

    it("saves valid phone number", async () => {
      render(<PhoneSettings />);
      await waitFor(() => {
        fireEvent.click(screen.getByText("Add"));
      });
      const input = screen.getByLabelText(
        "Phone number for urgent impact alerts",
      );
      fireEvent.change(input, { target: { value: "+15550001234" } });
      fireEvent.submit(input.closest("form") as HTMLElement);
      await waitFor(() => {
        // @ts-ignore - updateUser mock lacks TypeScript definitions
        expect(mockSupabase.auth.updateUser).toHaveBeenCalledWith({
          data: { phone: "+15550001234" },
        });
      });
    });

    it("shows success feedback after save", async () => {
      render(<PhoneSettings />);
      await waitFor(() => {
        fireEvent.click(screen.getByText("Add"));
      });
      const input = screen.getByLabelText(
        "Phone number for urgent impact alerts",
      );
      fireEvent.change(input, { target: { value: "+15550001234" } });
      fireEvent.submit(input.closest("form") as HTMLElement);
      await waitFor(() => {
        expect(screen.getByText("Phone number saved")).toBeInTheDocument();
      });
    });

    it("shows save error when updateUser fails", async () => {
      // @ts-ignore - updateUser is not in Supabase Auth types
      mockSupabase.auth.updateUser = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });
      render(<PhoneSettings />);
      await waitFor(() => {
        fireEvent.click(screen.getByText("Add"));
      });
      const input = screen.getByLabelText(
        "Phone number for urgent impact alerts",
      );
      fireEvent.change(input, { target: { value: "+15550001234" } });
      fireEvent.submit(input.closest("form") as HTMLElement);
      await waitFor(() => {
        expect(screen.getByText("Update failed")).toBeInTheDocument();
      });
    });

    it("cancels editing and restores previous value", async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: makeUser("+15550001234") },
        error: null,
      });
      render(<PhoneSettings />);
      await waitFor(() => {
        fireEvent.click(screen.getByText("Change"));
      });
      const input = screen.getByLabelText(
        "Phone number for urgent impact alerts",
      );
      fireEvent.change(input, { target: { value: "+19999999999" } });
      fireEvent.click(screen.getByText("Cancel"));
      await waitFor(() => {
        expect(screen.getByText("+15550001234")).toBeInTheDocument();
      });
    });
  });
});
