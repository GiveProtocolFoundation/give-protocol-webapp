import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { renderHook, waitFor, act } from "@testing-library/react";
import { supabase, resetMockState, setMockResult } from "@/lib/supabase";
import { Logger } from "@/utils/logger";
import { useCharityWallets } from "./useCharityWallets";

const mockFunctionsInvoke = supabase.functions.invoke as jest.Mock;
const mockStorageFrom = supabase.storage.from as jest.Mock;

const CHARITY_ID = "charity-profile-001";
const CHAIN_ID = 8453;

const mockWallet = {
  id: "wallet-001",
  charity_profile_id: CHARITY_ID,
  wallet_address: "0xABCDEF1234567890abcdef1234567890ABCDEF12",
  chain_id: CHAIN_ID,
  wallet_type: "eoa",
  signer_count: null,
  signer_threshold: null,
  custodian_name: null,
  custodian_attestation_doc_url: null,
  proof_of_control_signature: "0xsig",
  proof_of_control_message: "Verify wallet",
  proof_of_control_verified_at: "2026-05-27T00:00:00Z",
  risk_acknowledgment_at: "2026-05-27T00:00:00Z",
  risk_acknowledgment_user_id: "user-001",
  is_primary: true,
  created_at: "2026-05-27T00:00:00Z",
  updated_at: "2026-05-27T00:00:00Z",
};

const mockWalletSecondary = {
  ...mockWallet,
  id: "wallet-002",
  wallet_address: "0x9876543210fedcba9876543210FEDCBA98765432",
  is_primary: false,
};

describe("useCharityWallets", () => {
  beforeEach(() => {
    resetMockState();
    (Logger.error as jest.Mock).mockClear();
    mockFunctionsInvoke.mockReset();
    mockStorageFrom.mockClear();
  });

  // ---------- Return shape ----------

  it("exposes all CRUD operations and state", () => {
    const { result } = renderHook(() => useCharityWallets());

    expect(result.current).toHaveProperty("wallets");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("fetchWallets");
    expect(result.current).toHaveProperty("fetchPrimaryWallet");
    expect(result.current).toHaveProperty("addVerifiedWallet");
    expect(result.current).toHaveProperty("addInstitutionalWallet");
    expect(result.current).toHaveProperty("setPrimary");
    expect(result.current).toHaveProperty("deleteWallet");
    expect(result.current.wallets).toEqual([]);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  // ---------- fetchWallets ----------

  describe("fetchWallets", () => {
    it("fetches wallets for a charity and updates state", async () => {
      setMockResult("charity_wallets", {
        data: [mockWallet, mockWalletSecondary],
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallets = await result.current.fetchWallets(CHARITY_ID);
        expect(wallets).toHaveLength(2);
      });

      expect(result.current.wallets).toHaveLength(2);
      expect(result.current.error).toBeNull();
      expect(result.current.loading).toBe(false);
    });

    it("returns empty array and sets error on fetch failure", async () => {
      setMockResult("charity_wallets", {
        data: null,
        error: { message: "relation does not exist" },
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallets = await result.current.fetchWallets(CHARITY_ID);
        expect(wallets).toEqual([]);
      });

      expect(result.current.error).toBe("Failed to load wallets.");
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  // ---------- fetchPrimaryWallet ----------

  describe("fetchPrimaryWallet", () => {
    it("returns the primary wallet for a charity+chain", async () => {
      setMockResult("charity_wallets", { data: mockWallet, error: null });

      const { result } = renderHook(() => useCharityWallets());

      let wallet;
      await act(async () => {
        wallet = await result.current.fetchPrimaryWallet(CHARITY_ID, CHAIN_ID);
      });

      expect(wallet).toEqual(mockWallet);
      expect(result.current.error).toBeNull();
    });

    it("returns null when no primary wallet exists (PGRST116)", async () => {
      setMockResult("charity_wallets", {
        data: null,
        error: { message: "No rows found", code: "PGRST116" },
      });

      const { result } = renderHook(() => useCharityWallets());

      let wallet;
      await act(async () => {
        wallet = await result.current.fetchPrimaryWallet(CHARITY_ID, CHAIN_ID);
      });

      expect(wallet).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it("sets error on non-PGRST116 failure", async () => {
      setMockResult("charity_wallets", {
        data: null,
        error: { message: "connection error", code: "PGRST500" },
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        await result.current.fetchPrimaryWallet(CHARITY_ID, CHAIN_ID);
      });

      expect(result.current.error).toBe("Failed to load primary wallet.");
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  // ---------- addVerifiedWallet ----------

  describe("addVerifiedWallet", () => {
    const verifiedParams = {
      charity_profile_id: CHARITY_ID,
      wallet_address: "0xNewWallet1234567890abcdef1234567890abcdef",
      chain_id: CHAIN_ID,
      wallet_type: "eoa" as const,
      signature: "0xsignature",
      message: "I control this wallet",
    };

    it("calls verify-wallet-control and returns the wallet", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: true, wallet: mockWallet },
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      let wallet;
      await act(async () => {
        wallet = await result.current.addVerifiedWallet(verifiedParams);
      });

      expect(wallet).toEqual(mockWallet);
      expect(mockFunctionsInvoke).toHaveBeenCalledWith(
        "verify-wallet-control",
        { body: verifiedParams },
      );
      expect(result.current.wallets).toContainEqual(mockWallet);
      expect(result.current.error).toBeNull();
    });

    it("sets user-friendly error for known edge function error codes", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "signature mismatch", code: "INVALID_SIGNATURE" },
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallet = await result.current.addVerifiedWallet(verifiedParams);
        expect(wallet).toBeNull();
      });

      expect(result.current.error).toBe(
        "Wallet signature verification failed. Please sign again.",
      );
    });

    it("sets user-friendly error for DUPLICATE_WALLET", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: null,
        error: { message: "already exists", code: "DUPLICATE_WALLET" },
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallet = await result.current.addVerifiedWallet(verifiedParams);
        expect(wallet).toBeNull();
      });

      expect(result.current.error).toBe(
        "This wallet is already registered for your charity.",
      );
    });

    it("handles invalid response (no wallet in data)", async () => {
      mockFunctionsInvoke.mockResolvedValueOnce({
        data: { success: false },
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallet = await result.current.addVerifiedWallet(verifiedParams);
        expect(wallet).toBeNull();
      });

      expect(result.current.error).toBe(
        "Wallet verification returned an invalid response.",
      );
    });

    it("handles unexpected exceptions", async () => {
      mockFunctionsInvoke.mockRejectedValueOnce(new Error("network failure"));

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallet = await result.current.addVerifiedWallet(verifiedParams);
        expect(wallet).toBeNull();
      });

      expect(result.current.error).toBe("Failed to verify and add wallet.");
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  // ---------- addInstitutionalWallet ----------

  describe("addInstitutionalWallet", () => {
    const mockFile = new File(["attestation-content"], "attestation.pdf", {
      type: "application/pdf",
    });

    const institutionalParams = {
      charity_profile_id: CHARITY_ID,
      wallet_address: "0xCustodianWallet1234567890abcdef1234567890",
      chain_id: CHAIN_ID,
      custodian_name: "Fireblocks",
      attestation_file: mockFile,
    };

    it("uploads file, inserts wallet, and returns it", async () => {
      const mockUpload = jest
        .fn()
        .mockResolvedValue({ data: { path: "test" }, error: null });
      const mockGetPublicUrl = jest.fn().mockReturnValue({
        data: { publicUrl: "https://storage.example.com/attestation.pdf" },
      });
      mockStorageFrom.mockReturnValue({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      });

      const institutionalWallet = {
        ...mockWallet,
        id: "wallet-003",
        wallet_type: "institutional",
        custodian_name: "Fireblocks",
        custodian_attestation_doc_url:
          "https://storage.example.com/attestation.pdf",
        risk_acknowledgment_at: null,
        risk_acknowledgment_user_id: null,
      };

      setMockResult("charity_wallets", {
        data: institutionalWallet,
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      let wallet;
      await act(async () => {
        wallet =
          await result.current.addInstitutionalWallet(institutionalParams);
      });

      expect(wallet).toEqual(institutionalWallet);
      expect(mockUpload).toHaveBeenCalled();
      expect(result.current.wallets).toContainEqual(institutionalWallet);
      expect(result.current.error).toBeNull();
    });

    it("sets error when file upload fails", async () => {
      mockStorageFrom.mockReturnValue({
        upload: jest.fn().mockResolvedValue({
          data: null,
          error: { message: "upload failed" },
        }),
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallet =
          await result.current.addInstitutionalWallet(institutionalParams);
        expect(wallet).toBeNull();
      });

      expect(result.current.error).toBe(
        "Failed to upload attestation document.",
      );
      expect(Logger.error).toHaveBeenCalled();
    });

    it("sets error when DB insert fails after upload", async () => {
      mockStorageFrom.mockReturnValue({
        upload: jest
          .fn()
          .mockResolvedValue({ data: { path: "test" }, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://storage.example.com/attestation.pdf" },
        }),
      });

      setMockResult("charity_wallets", {
        data: null,
        error: { message: "insert failed" },
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const wallet =
          await result.current.addInstitutionalWallet(institutionalParams);
        expect(wallet).toBeNull();
      });

      expect(result.current.error).toBe("Failed to add institutional wallet.");
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  // ---------- setPrimary ----------

  describe("setPrimary", () => {
    it("swaps primary designation between wallets", async () => {
      setMockResult("charity_wallets", {
        data: [mockWallet, mockWalletSecondary],
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      // First load wallets
      await act(async () => {
        await result.current.fetchWallets(CHARITY_ID);
      });

      expect(result.current.wallets).toHaveLength(2);

      // Now swap primary
      await act(async () => {
        const success = await result.current.setPrimary("wallet-002");
        expect(success).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const primary = result.current.wallets.find((w) => w.id === "wallet-002");
      const former = result.current.wallets.find((w) => w.id === "wallet-001");
      expect(primary?.is_primary).toBe(true);
      expect(former?.is_primary).toBe(false);
    });

    it("returns false when wallet not found in state", async () => {
      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        const success = await result.current.setPrimary("nonexistent");
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe("Wallet not found.");
    });

    it("shows 24h rate limit error for rate-limited swaps", async () => {
      setMockResult("charity_wallets", {
        data: [mockWallet, mockWalletSecondary],
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        await result.current.fetchWallets(CHARITY_ID);
      });

      // Make the update call throw a 24h error
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        update: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.reject(new Error("violates 24-hour rate limit")),
          ),
        })),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn(() =>
          Promise.resolve({
            data: [mockWallet, mockWalletSecondary],
            error: null,
          }),
        ),
      }));

      await act(async () => {
        const success = await result.current.setPrimary("wallet-002");
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe(
        "Primary wallet was changed recently. Please wait 24 hours.",
      );
    });
  });

  // ---------- deleteWallet ----------

  describe("deleteWallet", () => {
    it("deletes a non-primary wallet and removes from state", async () => {
      setMockResult("charity_wallets", {
        data: [mockWallet, mockWalletSecondary],
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        await result.current.fetchWallets(CHARITY_ID);
      });

      expect(result.current.wallets).toHaveLength(2);

      await act(async () => {
        const success = await result.current.deleteWallet("wallet-002");
        expect(success).toBe(true);
      });

      expect(result.current.wallets).toHaveLength(1);
      expect(result.current.wallets[0].id).toBe("wallet-001");
    });

    it("prevents deletion of primary wallet", async () => {
      setMockResult("charity_wallets", {
        data: [mockWallet],
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        await result.current.fetchWallets(CHARITY_ID);
      });

      await act(async () => {
        const success = await result.current.deleteWallet("wallet-001");
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe("Cannot delete the primary wallet.");
      expect(result.current.wallets).toHaveLength(1);
    });

    it("sets error on delete failure", async () => {
      setMockResult("charity_wallets", {
        data: [mockWallet, mockWalletSecondary],
        error: null,
      });

      const { result } = renderHook(() => useCharityWallets());

      await act(async () => {
        await result.current.fetchWallets(CHARITY_ID);
      });

      // Override to make delete fail
      (supabase.from as jest.Mock).mockImplementationOnce(() => ({
        delete: jest.fn(() => ({
          eq: jest.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: "delete failed" },
            }),
          ),
        })),
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn(() =>
          Promise.resolve({
            data: [mockWallet, mockWalletSecondary],
            error: null,
          }),
        ),
      }));

      await act(async () => {
        const success = await result.current.deleteWallet("wallet-002");
        expect(success).toBe(false);
      });

      expect(result.current.error).toBe("Failed to delete wallet.");
      expect(Logger.error).toHaveBeenCalled();
    });
  });
});
