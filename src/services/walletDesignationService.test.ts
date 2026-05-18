import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { supabase } from "@/lib/supabase";
import {
  requestNonce,
  submitSignature,
  recheckPending,
  confirmWalletByToken,
  getDesignationState,
} from "./walletDesignationService";

interface InvokeArgs {
  body: Record<string, unknown>;
}
type InvokeFn = (
  _name: string,
  _args?: InvokeArgs,
) => Promise<{ data: unknown; error: unknown }>;

// supabase is mocked via moduleNameMapper. We extend it inline with
// functions.invoke (the moduleNameMapper mock does not stub it by default).
interface MockSupabase {
  from: ReturnType<typeof jest.fn>;
  functions: { invoke: ReturnType<typeof jest.fn> };
}

const sb = supabase as unknown as MockSupabase;
sb.functions = { invoke: jest.fn() };

const invokeMock = sb.functions.invoke as unknown as InvokeFn & {
  mockResolvedValue: (_v: { data: unknown; error: unknown }) => void;
  mockReset: () => void;
};

describe("walletDesignationService", () => {
  beforeEach(() => {
    (invokeMock as unknown as { mockReset: () => void }).mockReset();
  });

  describe("requestNonce", () => {
    it("returns ok with nonce+message on success", async () => {
      invokeMock.mockResolvedValue({
        data: {
          success: true,
          nonce: "abc123",
          message: "Sign this",
          expiresAt: "2026-05-18T01:00:00Z",
          chainId: 1287,
        },
        error: null,
      });

      const result = await requestNonce("cp-1", "0xabc");
      expect(result).toEqual({
        ok: true,
        data: {
          nonce: "abc123",
          message: "Sign this",
          expiresAt: "2026-05-18T01:00:00Z",
          chainId: 1287,
        },
      });
    });

    it("returns error when edge function reports !success", async () => {
      invokeMock.mockResolvedValue({
        data: { success: false, error: "Forbidden" },
        error: null,
      });
      const result = await requestNonce("cp-1", "0xabc");
      expect(result).toEqual({ ok: false, error: "Forbidden" });
    });

    it("returns error when supabase.invoke fails", async () => {
      invokeMock.mockResolvedValue({
        data: null,
        error: { message: "Network down" },
      });
      const result = await requestNonce("cp-1", "0xabc");
      expect(result).toEqual({ ok: false, error: "Network down" });
    });
  });

  describe("submitSignature", () => {
    it("returns pending_email_confirmation status with email", async () => {
      invokeMock.mockResolvedValue({
        data: {
          success: true,
          status: "pending_email_confirmation",
          sentToEmail: "signer@example.org",
          candidateAddress: "0xabc",
        },
        error: null,
      });
      const result = await submitSignature("nonce", "0xsig");
      expect(result).toEqual({
        ok: true,
        data: {
          status: "pending_email_confirmation",
          candidateAddress: "0xabc",
          sentToEmail: "signer@example.org",
          expiresAt: undefined,
        },
      });
    });

    it("returns pending_signature_verification status for Safe", async () => {
      invokeMock.mockResolvedValue({
        data: {
          success: true,
          status: "pending_signature_verification",
          candidateAddress: "0xsafe",
          expiresAt: "2026-05-25T00:00:00Z",
        },
        error: null,
      });
      const result = await submitSignature("nonce", "0xsig");
      expect(result).toEqual({
        ok: true,
        data: {
          status: "pending_signature_verification",
          candidateAddress: "0xsafe",
          sentToEmail: undefined,
          expiresAt: "2026-05-25T00:00:00Z",
        },
      });
    });

    it("returns error when signature verification fails", async () => {
      invokeMock.mockResolvedValue({
        data: { success: false, error: "Signature verification failed" },
        error: null,
      });
      const result = await submitSignature("nonce", "0xbad");
      expect(result).toEqual({
        ok: false,
        error: "Signature verification failed",
      });
    });
  });

  describe("recheckPending", () => {
    it("returns results array on success", async () => {
      invokeMock.mockResolvedValue({
        data: {
          success: true,
          results: [{ pendingId: "p1", outcome: "verified" }],
        },
        error: null,
      });
      const result = await recheckPending("cp-1");
      expect(result).toEqual({
        ok: true,
        data: {
          results: [{ pendingId: "p1", outcome: "verified" }],
        },
      });
    });
  });

  describe("confirmWalletByToken", () => {
    it("returns wallet address on successful confirmation", async () => {
      invokeMock.mockResolvedValue({
        data: {
          success: true,
          walletAddress: "0xfeed",
          activatedAt: "2026-05-18T02:00:00Z",
        },
        error: null,
      });
      const result = await confirmWalletByToken("tok");
      expect(result).toEqual({
        ok: true,
        data: {
          walletAddress: "0xfeed",
          activatedAt: "2026-05-18T02:00:00Z",
        },
      });
    });

    it("returns error when token is invalid/expired", async () => {
      invokeMock.mockResolvedValue({
        data: { success: false, error: "Invalid, expired, or already-used token" },
        error: null,
      });
      const result = await confirmWalletByToken("expired");
      expect(result.ok).toBe(false);
    });
  });

  describe("getDesignationState", () => {
    it("returns mapped state on success", async () => {
      const maybeSingle = jest.fn(() =>
        Promise.resolve({
          data: {
            wallet_designation_status: "active",
            wallet_address: "0xfeed",
            wallet_kind: "eoa",
            wallet_designated_at: "2026-05-18T00:00:00Z",
          },
          error: null,
        }),
      );
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      (sb.from as unknown as jest.Mock).mockReturnValueOnce({ select });

      const result = await getDesignationState("cp-1");
      expect(result).toEqual({
        status: "active",
        walletAddress: "0xfeed",
        walletKind: "eoa",
        designatedAt: "2026-05-18T00:00:00Z",
      });
    });

    it("returns null when no row exists", async () => {
      const maybeSingle = jest.fn(() =>
        Promise.resolve({ data: null, error: null }),
      );
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      (sb.from as unknown as jest.Mock).mockReturnValueOnce({ select });

      const result = await getDesignationState("cp-1");
      expect(result).toBeNull();
    });

    it("defaults status to 'unset' when field is absent", async () => {
      const maybeSingle = jest.fn(() =>
        Promise.resolve({
          data: {
            wallet_designation_status: null,
            wallet_address: null,
            wallet_kind: null,
            wallet_designated_at: null,
          },
          error: null,
        }),
      );
      const eq = jest.fn(() => ({ maybeSingle }));
      const select = jest.fn(() => ({ eq }));
      (sb.from as unknown as jest.Mock).mockReturnValueOnce({ select });

      const result = await getDesignationState("cp-1");
      expect(result?.status).toBe("unset");
    });
  });
});
