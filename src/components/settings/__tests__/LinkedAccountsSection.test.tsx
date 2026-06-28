import { jest } from "@jest/globals";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { LinkedAccountsSection } from "../LinkedAccountsSection";
import { supabase } from "@/lib/supabase";

const mockSupabase = supabase as jest.Mocked<typeof supabase>;

const googleIdentity = {
  identity_id: "g-id-1",
  id: "g-id-1",
  user_id: "user-1",
  provider: "google",
  created_at: "2024-01-01",
  last_sign_in_at: "2024-01-01",
  updated_at: "2024-01-01",
  identity_data: {},
};

const makeUser = (identities = [googleIdentity]) => ({
  id: "user-1",
  email: "user@example.com",
  identities,
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: "2024-01-01",
});

const renderSection = () =>
  render(
    <MemoryRouter>
      <LinkedAccountsSection />
    </MemoryRouter>,
  );

// Provide stubs for methods not in base mock
beforeEach(() => {
  jest.clearAllMocks();
  // @ts-ignore - extending the mock for these tests
  mockSupabase.auth.linkIdentity = jest
    .fn()
    .mockResolvedValue({ data: null, error: null });
  // @ts-ignore - mocking unlinkIdentity method not in type definitions
  mockSupabase.auth.unlinkIdentity = jest
    .fn()
    .mockResolvedValue({ data: null, error: null });
  // Default: user with Google linked
  mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
    data: { user: makeUser([googleIdentity]) },
    error: null,
  });
});

describe("LinkedAccountsSection", () => {
  describe("rendering", () => {
    it("shows Linked Accounts heading", async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.getByText("Linked Accounts")).toBeInTheDocument();
      });
    });

    it("shows Google and Apple provider cards", async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.getByText("Google")).toBeInTheDocument();
        expect(screen.getByText("Apple")).toBeInTheDocument();
      });
    });

    it("shows Connected status for Google when identity exists", async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.getAllByText("Connected").length).toBeGreaterThan(0);
      });
    });

    it("shows Disconnect button for linked provider", async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.getByText("Disconnect Google")).toBeInTheDocument();
      });
    });

    it("shows Connect button for unlinked provider", async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: makeUser([]) },
        error: null,
      });
      renderSection();
      await waitFor(() => {
        expect(screen.getByText("Connect Google")).toBeInTheDocument();
        expect(screen.getByText("Connect Apple")).toBeInTheDocument();
      });
    });

    it("shows load error when getUser fails", async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "Auth error" },
      });
      renderSection();
      await waitFor(() => {
        expect(
          screen.getByText("Could not load linked accounts"),
        ).toBeInTheDocument();
      });
    });
  });

  describe("interactions", () => {
    it("calls linkIdentity when Connect Google is clicked", async () => {
      mockSupabase.auth.getUser = jest.fn().mockResolvedValue({
        data: { user: makeUser([]) },
        error: null,
      });
      renderSection();
      await waitFor(() => {
        expect(screen.getByText("Connect Google")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Connect Google"));
      await waitFor(() => {
        // @ts-ignore - suppress TS error because linkIdentity isn't in Supabase types
        expect(mockSupabase.auth.linkIdentity).toHaveBeenCalledWith({
          provider: "google",
        });
      });
    });

    it("calls unlinkIdentity and removes identity on Disconnect Google", async () => {
      renderSection();
      await waitFor(() => {
        expect(screen.getByText("Disconnect Google")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Disconnect Google"));
      await waitFor(() => {
        // @ts-ignore - unlinkIdentity isn't declared in Supabase type definitions
        expect(mockSupabase.auth.unlinkIdentity).toHaveBeenCalledWith(
          googleIdentity,
        );
      });
    });

    it("shows disconnect error if unlinkIdentity fails", async () => {
      // @ts-ignore - unlinkIdentity not present on mockSupabase.auth type
      mockSupabase.auth.unlinkIdentity = jest.fn().mockResolvedValue({
        data: null,
        error: { message: "Unlink failed" },
      });
      renderSection();
      await waitFor(() => {
        expect(screen.getByText("Disconnect Google")).toBeInTheDocument();
      });
      fireEvent.click(screen.getByText("Disconnect Google"));
      await waitFor(() => {
        expect(screen.getByText("Unlink failed")).toBeInTheDocument();
      });
    });
  });
});
