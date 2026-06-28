import React from "react";
import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import { render, act, renderHook, waitFor } from "@testing-library/react";
import {
  MultiChainProvider,
  useMultiChainContext,
  useMultiChainEVM,
  useMultiChainSigner,
} from "@/contexts/MultiChainContext.real";
import type { UnifiedAccount, UnifiedWalletProvider } from "@/types/wallet";

const STORAGE_KEY = "giveprotocol_multichain_state";

function makeAccount(overrides: Partial<UnifiedAccount> = {}): UnifiedAccount {
  return {
    id: "acct-1",
    address: "0xabc",
    chainType: "evm",
    chainId: 1,
    chainName: "Ethereum",
    source: "TestWallet",
    ...overrides,
  };
}

function makeWallet(
  overrides: Partial<UnifiedWalletProvider> = {},
): UnifiedWalletProvider {
  return {
    name: "TestWallet",
    icon: "test-icon",
    category: "browser",
    supportedChainTypes: ["evm"],
    providers: {},
    isInstalled: () => true,
    connect: jest
      .fn<UnifiedWalletProvider["connect"]>()
      .mockResolvedValue([makeAccount()]),
    disconnect: jest
      .fn<UnifiedWalletProvider["disconnect"]>()
      .mockResolvedValue(),
    getAccounts: jest
      .fn<UnifiedWalletProvider["getAccounts"]>()
      .mockResolvedValue([makeAccount()]),
    switchChain: jest
      .fn<UnifiedWalletProvider["switchChain"]>()
      .mockResolvedValue(),
    signTransaction: jest
      .fn<UnifiedWalletProvider["signTransaction"]>()
      .mockResolvedValue("0xsig"),
    signMessage: jest
      .fn<UnifiedWalletProvider["signMessage"]>()
      .mockResolvedValue("0xmsg"),
    ...overrides,
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <MultiChainProvider>{children}</MultiChainProvider>;
}

describe("MultiChainContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("useMultiChainContext", () => {
    it("throws when used outside the provider", () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      try {
        expect(() => renderHook(() => useMultiChainContext())).toThrow(
          /useMultiChainContext must be used within a MultiChainProvider/,
        );
      } finally {
        consoleError.mockRestore();
      }
    });

    it("starts with sensible defaults", () => {
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });
      expect(result.current.wallet).toBeNull();
      expect(result.current.accounts).toEqual([]);
      expect(result.current.activeAccount).toBeNull();
      expect(result.current.activeChainType).toBe("evm");
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("hydrates the active chain type from localStorage", async () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          activeChainType: "solana",
          lastWalletName: null,
          lastAccountId: null,
        }),
      );
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });
      await waitFor(() =>
        expect(result.current.activeChainType).toBe("solana"),
      );
    });

    it("ignores corrupt localStorage state and falls back to defaults", () => {
      localStorage.setItem(STORAGE_KEY, "{not-json");
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });
      expect(result.current.activeChainType).toBe("evm");
    });
  });

  describe("connect", () => {
    it("connects, populates accounts, and persists state", async () => {
      const wallet = makeWallet();
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      expect(wallet.connect).toHaveBeenCalledWith("evm");
      expect(result.current.wallet).toBe(wallet);
      expect(result.current.accounts).toHaveLength(1);
      expect(result.current.activeAccount?.id).toBe("acct-1");
      expect(result.current.isConnected).toBe(true);
      expect(result.current.isConnecting).toBe(false);

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
      expect(stored.lastWalletName).toBe("TestWallet");
      expect(stored.lastAccountId).toBe("acct-1");
    });

    it("rejects wallets that don't support the requested chain type", async () => {
      const wallet = makeWallet({ supportedChainTypes: ["evm"] });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.connect(wallet, "solana");
        } catch (err) {
          caught = err as Error;
        }
      });

      expect(caught?.message).toMatch(/does not support solana/);
      expect(result.current.error?.message).toMatch(/does not support solana/);
      expect(result.current.wallet).toBeNull();
    });

    it("rejects when the wallet returns no accounts", async () => {
      const wallet = makeWallet({
        connect: jest
          .fn<UnifiedWalletProvider["connect"]>()
          .mockResolvedValue([]),
      });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await expect(
        act(async () => {
          await result.current.connect(wallet);
        }),
      ).rejects.toThrow(/No accounts found/);
    });

    it("clears the disconnect flag on successful connect", async () => {
      localStorage.setItem("giveprotocol_wallet_disconnected", "true");
      const wallet = makeWallet();
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      expect(
        localStorage.getItem("giveprotocol_wallet_disconnected"),
      ).toBeNull();
    });
  });

  describe("disconnect", () => {
    it("clears state, calls wallet.disconnect, and sets the disconnect flag", async () => {
      const wallet = makeWallet();
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      await act(async () => {
        await result.current.disconnect();
      });

      expect(wallet.disconnect).toHaveBeenCalled();
      expect(result.current.wallet).toBeNull();
      expect(result.current.accounts).toEqual([]);
      expect(result.current.activeAccount).toBeNull();
      expect(localStorage.getItem("giveprotocol_wallet_disconnected")).toBe(
        "true",
      );
    });

    it("clears state even when wallet.disconnect throws", async () => {
      const wallet = makeWallet({
        disconnect: jest
          .fn<UnifiedWalletProvider["disconnect"]>()
          .mockRejectedValue(new Error("boom")),
      });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.wallet).toBeNull();
      expect(result.current.activeAccount).toBeNull();
    });
  });

  describe("switchAccount", () => {
    it("updates the active account when it belongs to the connected list", async () => {
      const second = makeAccount({ id: "acct-2", address: "0xdef" });
      const wallet = makeWallet({
        connect: jest
          .fn<UnifiedWalletProvider["connect"]>()
          .mockResolvedValue([makeAccount(), second]),
      });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      act(() => {
        result.current.switchAccount(second);
      });

      expect(result.current.activeAccount?.id).toBe("acct-2");
    });

    it("ignores unknown accounts", async () => {
      const wallet = makeWallet();
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });
      await act(async () => {
        await result.current.connect(wallet);
      });

      act(() => {
        result.current.switchAccount(makeAccount({ id: "missing" }));
      });

      expect(result.current.activeAccount?.id).toBe("acct-1");
    });
  });

  describe("switchChainType", () => {
    it("switches when the active wallet supports the new type", async () => {
      const solanaAcct = makeAccount({
        id: "sol-1",
        chainType: "solana",
        chainId: "mainnet",
      });
      const wallet = makeWallet({
        supportedChainTypes: ["evm", "solana"],
        connect: jest
          .fn<UnifiedWalletProvider["connect"]>()
          .mockResolvedValue([makeAccount(), solanaAcct]),
      });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      act(() => {
        result.current.switchChainType("solana");
      });

      expect(result.current.activeChainType).toBe("solana");
      expect(result.current.activeAccount?.id).toBe("sol-1");
    });

    it("refuses to switch when the wallet does not support the new type", async () => {
      const wallet = makeWallet({ supportedChainTypes: ["evm"] });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      act(() => {
        result.current.switchChainType("solana");
      });

      expect(result.current.activeChainType).toBe("evm");
    });
  });

  describe("switchChain", () => {
    it("calls wallet.switchChain and refreshes accounts", async () => {
      const updated = makeAccount({ id: "acct-1", chainId: 137 });
      const wallet = makeWallet({
        getAccounts: jest
          .fn<UnifiedWalletProvider["getAccounts"]>()
          .mockResolvedValue([updated]),
      });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        await result.current.connect(wallet);
      });

      await act(async () => {
        await result.current.switchChain(137, "evm");
      });

      expect(wallet.switchChain).toHaveBeenCalledWith(137, "evm");
      expect(result.current.activeAccount?.chainId).toBe(137);
    });

    it("throws when no wallet is connected", async () => {
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });
      await expect(
        act(async () => {
          await result.current.switchChain(1, "evm");
        }),
      ).rejects.toThrow(/No wallet connected/);
    });

    it("propagates wallet.switchChain errors", async () => {
      const wallet = makeWallet({
        switchChain: jest
          .fn<UnifiedWalletProvider["switchChain"]>()
          .mockRejectedValue(new Error("rpc")),
      });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });
      await act(async () => {
        await result.current.connect(wallet);
      });
      await expect(
        act(async () => {
          await result.current.switchChain(1, "evm");
        }),
      ).rejects.toThrow(/rpc/);
    });
  });

  describe("clearError", () => {
    it("resets the error state", async () => {
      const wallet = makeWallet({ supportedChainTypes: ["evm"] });
      const { result } = renderHook(() => useMultiChainContext(), { wrapper });

      await act(async () => {
        try {
          await result.current.connect(wallet, "solana");
        } catch {
          // expected — drives the error state.
        }
      });
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.clearError();
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe("useMultiChainEVM", () => {
    it("derives EVM-specific state from the active account", async () => {
      const wallet = makeWallet();
      const { result } = renderHook(
        () => ({
          ctx: useMultiChainContext(),
          evm: useMultiChainEVM(),
        }),
        { wrapper },
      );

      await act(async () => {
        await result.current.ctx.connect(wallet);
      });

      expect(result.current.evm.address).toBe("0xabc");
      expect(result.current.evm.chainId).toBe(1);
      expect(result.current.evm.isConnected).toBe(true);
    });

    it("returns null address when the active account is non-EVM", async () => {
      const solana = makeAccount({
        id: "sol",
        chainType: "solana",
        chainId: "mainnet",
      });
      const wallet = makeWallet({
        supportedChainTypes: ["evm", "solana"],
        connect: jest
          .fn<UnifiedWalletProvider["connect"]>()
          .mockResolvedValue([solana]),
      });
      const { result } = renderHook(
        () => ({
          ctx: useMultiChainContext(),
          evm: useMultiChainEVM(),
        }),
        { wrapper },
      );

      await act(async () => {
        await result.current.ctx.connect(wallet, "solana");
      });

      expect(result.current.evm.address).toBeNull();
      // chainId falls back to DEFAULT_EVM_CHAIN_ID when no EVM account is active.
      expect(typeof result.current.evm.chainId).toBe("number");
      expect(result.current.evm.isConnected).toBe(false);
    });

    it("delegates switchChain through the context", async () => {
      const wallet = makeWallet();
      const { result } = renderHook(
        () => ({
          ctx: useMultiChainContext(),
          evm: useMultiChainEVM(),
        }),
        { wrapper },
      );

      await act(async () => {
        await result.current.ctx.connect(wallet);
      });
      await act(async () => {
        await result.current.evm.switchChain(8453);
      });
      expect(wallet.switchChain).toHaveBeenCalledWith(8453, "evm");
    });
  });

  describe("useMultiChainSigner", () => {
    it("signs transactions and messages via the connected wallet", async () => {
      const wallet = makeWallet();
      const { result } = renderHook(
        () => ({
          ctx: useMultiChainContext(),
          signer: useMultiChainSigner(),
        }),
        { wrapper },
      );

      await act(async () => {
        await result.current.ctx.connect(wallet);
      });

      await result.current.signer.signTransaction({
        chainType: "evm",
        chainId: 1,
        to: "0x000",
      });
      await result.current.signer.signMessage("hello");

      expect(wallet.signTransaction).toHaveBeenCalled();
      expect(wallet.signMessage).toHaveBeenCalledWith("hello", "evm");
    });

    it("throws when no wallet is connected", () => {
      const { result } = renderHook(() => useMultiChainSigner(), { wrapper });
      expect(() =>
        result.current.signTransaction({
          chainType: "evm",
          chainId: 1,
          to: "0x000",
        }),
      ).toThrow(/No wallet connected/);
      expect(() => result.current.signMessage("hi")).toThrow(
        /No wallet connected/,
      );
    });
  });

  it("renders children inside the provider", () => {
    const { getByText } = render(
      <MultiChainProvider>
        <span>child content</span>
      </MultiChainProvider>,
    );
    expect(getByText("child content")).toBeInTheDocument();
  });
});
