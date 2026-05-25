import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import { signInWithEmail, signUpWithEmail, createProfile } from "./auth";
import { supabase, setMockResult } from "@/lib/supabase";

const mockSignInWithPassword = supabase.auth.signInWithPassword as ReturnType<
  typeof jest.fn
>;

describe("auth utils", () => {
  beforeEach(() => {
    mockSignInWithPassword.mockResolvedValue({
      data: {
        user: { id: "user-1", email: "test@example.com" },
        session: { access_token: "token" },
      },
      error: null,
    });
  });

  describe("signInWithEmail", () => {
    it("should call supabase signInWithPassword and return data", async () => {
      const result = await signInWithEmail("test@example.com", "password123");
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
      expect(result).toHaveProperty("user");
    });

    it("should throw when supabase returns an error", async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: null,
        error: new Error("Invalid credentials"),
      });
      await expect(signInWithEmail("bad@example.com", "wrong")).rejects.toThrow(
        "Invalid credentials",
      );
    });
  });

  describe("signUpWithEmail", () => {
    it("should call supabase signUp with type and metadata", async () => {
      const mockSignUp = jest.fn().mockResolvedValue({
        data: { user: { id: "new-user" }, session: null },
        error: null,
      });
      (supabase.auth as Record<string, unknown>).signUp = mockSignUp;

      const result = await signUpWithEmail(
        "new@example.com",
        "pass123",
        "donor",
        { firstName: "John" },
      );
      expect(mockSignUp).toHaveBeenCalledWith({
        email: "new@example.com",
        password: "pass123",
        options: {
          data: { type: "donor", firstName: "John" },
        },
      });
      expect(result).toHaveProperty("user");
    });

    it("should throw when signUp returns an error", async () => {
      (supabase.auth as Record<string, unknown>).signUp = jest
        .fn()
        .mockResolvedValue({
          data: null,
          error: new Error("Email taken"),
        });
      await expect(
        signUpWithEmail("taken@example.com", "pass", "charity"),
      ).rejects.toThrow("Email taken");
    });
  });

  describe("createProfile", () => {
    it("should insert a profile record without throwing", async () => {
      await expect(createProfile("user-1", "donor")).resolves.toBeUndefined();
    });

    it("should throw when insert returns an error", async () => {
      setMockResult("profiles", { data: null, error: new Error("DB error") });
      await expect(createProfile("user-1", "charity")).rejects.toThrow(
        "DB error",
      );
      // Reset
      setMockResult("profiles", { data: [], error: null });
    });
  });
});
