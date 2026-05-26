import React from "react";
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { render, act, renderHook, waitFor } from "@testing-library/react";
import { ethers } from "ethers";
import {
  Web3Provider,
  useWeb3,
  useWeb3MultiChain,
} from "@/contexts/Web3Context.real";
import { useMultiChainContext } from "@/contexts/MultiChainContext";

const mockedUseMultiChainContext = useMultiChainContext as jest.MockedFunction<
  typeof useMultiChainContext
>;
const mockedBrowserProvider = ethers.BrowserProvider as unknown as jest.Mock;

interface EthereumLike {
  request: jest.Mock;
  on: jest.Mock;
  removeListener: jest.Mock;
  disconnect?: jest.Mock;
  isMetaMask?: boolean;
  isPhantom?: boolean;
  providers?: EthereumLike[];
}

function setEthereum(value?: EthereumLike): void {
  Object.defineProperty(window, "ethereum", {
    value,
    configurable: true,
    writable: true,
  });
}

function makeEthereum(overrides: Partial<EthereumLike> = {}): EthereumLike {
  return {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
    isMetaMask: true,
    ...overrides,
  };
}

/** Look up the listener registered for a given event on a mocked provider. */
function findHandler<T extends (..._args: never[]) => unknown>(
  ethereum: EthereumLike,
  eventName: string,
): T {
  const call = ethereum.on.mock.calls.find((c) => c[0] === eventName);
  if (!call) {
    throw new Error(`No handler registered for event "${eventName}"`);
  }
  return call[1] as T;
}

function setupBrowserProvider({
  chainId = 8453,
  signer = {},
}: {
  chainId?: number;
  signer?: object;
} = {}) {
  mockedBrowserProvider.mockImplementation(() => ({
    getSigner: jest.fn().mockResolvedValue(signer),
    getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(chainId) }),
  }));
}

function wrapper({ children }: { children: React.ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}

describe("Web3Context", () => {
  beforeEach(() => {
    localStorage.clear();
    mockedBrowserProvider.mockClear();
    setupBrowserProvider();
    mockedUseMultiChainContext.mockReturnValue({
      wallet: null,
      accounts: [],
      activeAccount: null,
      activeChainType: "evm",
      isConnected: false,
      isConnecting: false,
      error: null,
      connect: jest.fn(),
      disconnect: jest.fn(),
      switchAccount: jest.fn(),
      switchChainType: jest.fn(),
      switchChain: jest.fn(),
      clearError: jest.fn(),
    });
    setEthereum();
    // Auto-restore checks the pathname; reset to a non-/auth route.
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("useWeb3", () => {
    it("throws when used outside the provider", () => {
      const consoleError = jest
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      try {
        expect(() => renderHook(() => useWeb3())).toThrow(
          /useWeb3 must be used within a Web3Provider/,
        );
      } finally {
        consoleError.mockRestore();
      }
    });

    it("starts with sensible defaults", () => {
      const { result } = renderHook(() => useWeb3(), { wrapper });
      expect(result.current.provider).toBeNull();
      expect(result.current.signer).toBeNull();
      expect(result.current.address).toBeNull();
      expect(result.current.chainId).toBeNull();
      expect(result.current.isConnected).toBe(false);
      expect(result.current.isConnecting).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("renders children inside the provider", () => {
      const { getByText } = render(
        <Web3Provider>
          <span>web3 child</span>
        </Web3Provider>,
      );
      expect(getByText("web3 child")).toBeInTheDocument();
    });
  });

  describe("connect", () => {
    it("rejects when no wallet provider is available", async () => {
      const { result } = renderHook(() => useWeb3(), { wrapper });
      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.connect();
        } catch (err) {
          caught = err as Error;
        }
      });
      expect(caught?.message).toMatch(/No wallet provider found/);
      expect(result.current.error?.message).toMatch(/No wallet provider found/);
    });

    it("rejects when the provider isn't EIP-1193 compliant", async () => {
      const { result } = renderHook(() => useWeb3(), { wrapper });
      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.connect({ notAProvider: true });
        } catch (err) {
          caught = err as Error;
        }
      });
      expect(caught?.message).toMatch(/EIP-1193/);
    });

    it("ignores synthetic event objects passed by onClick handlers", async () => {
      const { result } = renderHook(() => useWeb3(), { wrapper });
      let caught: Error | null = null;
      await act(async () => {
        try {
          // Mimics React calling connect(event) from <button onClick={connect}>.
          await result.current.connect({ nativeEvent: {}, target: null });
        } catch (err) {
          caught = err as Error;
        }
      });
      // No window.ethereum and event was discarded → "No wallet provider found".
      expect(caught?.message).toMatch(/No wallet provider found/);
    });

    it("connects, fetches the network, and populates state", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        if (method === "eth_accounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);
      setupBrowserProvider({ chainId: 8453 });

      const { result } = renderHook(() => useWeb3(), { wrapper });

      await act(async () => {
        await result.current.connect(ethereum);
      });

      expect(ethereum.request).toHaveBeenCalledWith({
        method: "eth_requestAccounts",
      });
      expect(result.current.address).toBe("0xabc");
      expect(result.current.chainId).toBe(8453);
      expect(result.current.isConnected).toBe(true);
      expect(
        localStorage.getItem("giveprotocol_wallet_disconnected"),
      ).toBeNull();
    });

    it("rejects when no accounts are returned", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockResolvedValue([]);
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.connect(ethereum);
        } catch (err) {
          caught = err as Error;
        }
      });
      expect(caught?.message).toMatch(/No accounts found/);
    });

    it("translates user-rejection (4001) into a friendly message", async () => {
      const ethereum = makeEthereum();
      const rejection = Object.assign(new Error("user denied"), { code: 4001 });
      ethereum.request.mockRejectedValue(rejection);
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.connect(ethereum);
        } catch (err) {
          caught = err as Error;
        }
      });
      expect(caught?.message).toMatch(/User rejected wallet connection/);
      expect(result.current.error?.message).toMatch(
        /User rejected wallet connection/,
      );
    });

    it("falls back to a generic error message for unknown failures", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockRejectedValue("string error");
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.connect(ethereum);
        } catch (err) {
          caught = err as Error;
        }
      });
      expect(caught?.message).toMatch(/Failed to connect wallet/);
    });

    it("issues wallet_switchEthereumChain when on the wrong network", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      // First BrowserProvider (initial): wrong chain. Second (post-switch): selectedChainId.
      mockedBrowserProvider
        .mockImplementationOnce(() => ({
          getSigner: jest.fn().mockResolvedValue({}),
          getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(1) }),
        }))
        .mockImplementationOnce(() => ({
          getSigner: jest.fn().mockResolvedValue({}),
          getNetwork: jest.fn().mockResolvedValue({ chainId: BigInt(8453) }),
        }));

      const { result } = renderHook(() => useWeb3(), { wrapper });

      await act(async () => {
        await result.current.connect(ethereum);
      });

      expect(ethereum.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2105" }],
        }),
      );
      expect(result.current.chainId).toBe(8453);
    });
  });

  describe("disconnect", () => {
    it("clears state and sets the disconnect flag", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.connect(ethereum);
      });

      await act(async () => {
        await result.current.disconnect();
      });

      expect(result.current.address).toBeNull();
      expect(result.current.provider).toBeNull();
      expect(localStorage.getItem("giveprotocol_wallet_disconnected")).toBe(
        "true",
      );
    });

    it("invokes wallet.disconnect when the wallet exposes one", async () => {
      const disconnectFn = jest.fn().mockResolvedValue();
      const ethereum = makeEthereum({ disconnect: disconnectFn });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.disconnect();
      });

      expect(disconnectFn).toHaveBeenCalled();
    });

    it("falls back to wallet_revokePermissions when no disconnect method exists", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockResolvedValue();
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.disconnect();
      });

      expect(ethereum.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: "wallet_revokePermissions" }),
      );
    });

    it("swallows revokePermissions errors", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockRejectedValue(new Error("not supported"));
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.disconnect();
      });

      // No throw → state still cleared.
      expect(result.current.address).toBeNull();
    });
  });

  describe("switchChain", () => {
    it("throws when no wallet provider is configured", async () => {
      const { result } = renderHook(() => useWeb3(), { wrapper });
      await expect(
        act(async () => {
          await result.current.switchChain(1);
        }),
      ).rejects.toThrow(/No wallet provider found/);
    });

    it("delegates to wallet_switchEthereumChain on the active provider", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.connect(ethereum);
      });

      await act(async () => {
        await result.current.switchChain(10);
      });

      expect(ethereum.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xa" }],
        }),
      );
    });

    it("rejects when the bound wallet provider isn't EIP-1193", async () => {
      // Wallet stored from a previous connect happens to lose its `request`.
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.connect(ethereum);
      });

      // Mutate the stored provider so it fails the EIP-1193 check.
      delete (ethereum as { request?: unknown }).request;

      await expect(
        act(async () => {
          await result.current.switchChain(10);
        }),
      ).rejects.toThrow(/Invalid wallet provider/);
    });
  });

  describe("event listeners", () => {
    it("does NOT subscribe to window.ethereum events for first-time visitors (no previously_connected flag)", async () => {
      const ethereum = makeEthereum();
      setEthereum(ethereum);
      // No localStorage flag — simulates a brand-new visitor in Comet browser.

      renderHook(() => useWeb3(), { wrapper });

      // Give effects time to run
      await act(async () => {
        await new Promise((r) => setTimeout(r, 50));
      });

      // window.ethereum.on must NOT have been called; subscribing to events in
      // Comet browser triggers the wallet popup even without requesting accounts.
      expect(ethereum.on).not.toHaveBeenCalled();
    });

    it("registers and removes accountsChanged / chainChanged / disconnect handlers for returning users", async () => {
      localStorage.setItem(
        "giveprotocol_wallet_previously_connected",
        "true",
      );
      const ethereum = makeEthereum();
      setEthereum(ethereum);

      const { unmount } = renderHook(() => useWeb3(), { wrapper });

      await waitFor(() => expect(ethereum.on).toHaveBeenCalled());
      const events = ethereum.on.mock.calls.map((c) => c[0]);
      expect(events).toEqual(
        expect.arrayContaining([
          "accountsChanged",
          "chainChanged",
          "disconnect",
        ]),
      );

      unmount();
      const removed = ethereum.removeListener.mock.calls.map((c) => c[0]);
      expect(removed).toEqual(
        expect.arrayContaining([
          "accountsChanged",
          "chainChanged",
          "disconnect",
        ]),
      );
    });

    it("clears state when the provider fires disconnect", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.connect(ethereum);
      });
      expect(result.current.address).toBe("0xabc");

      // Trigger the disconnect handler that Web3Context registered on mount.
      const handler = findHandler<() => void>(ethereum, "disconnect");
      act(() => handler());

      expect(result.current.address).toBeNull();
      expect(result.current.provider).toBeNull();
    });

    it("clears state when accountsChanged fires with an empty array", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.connect(ethereum);
      });

      const handler = findHandler<(_accounts: string[]) => void>(
        ethereum,
        "accountsChanged",
      );
      act(() => handler([]));

      expect(result.current.address).toBeNull();
    });

    it("updates the address when accountsChanged fires with a new account", async () => {
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.connect(ethereum);
      });

      const handler = findHandler<(_accounts: string[]) => void>(
        ethereum,
        "accountsChanged",
      );
      act(() => handler(["0xnew"]));

      expect(result.current.address).toBe("0xnew");
    });

    it("debounces chainChanged and rebuilds the provider", async () => {
      jest.useFakeTimers();
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await act(async () => {
        await result.current.connect(ethereum);
      });

      const callsBefore = mockedBrowserProvider.mock.calls.length;

      const handler = findHandler<(_chainIdHex: string) => void>(
        ethereum,
        "chainChanged",
      );
      act(() => handler("0xa"));
      expect(result.current.chainId).toBe(10);

      // Advance past the 500 ms debounce so the rebuild runs, then flush
      // the microtask queue so the async provider rebuild settles.
      await act(() => {
        jest.advanceTimersByTime(500);
      });
      await act(async () => {
        await Promise.resolve();
      });

      expect(mockedBrowserProvider.mock.calls.length).toBeGreaterThan(
        callsBefore,
      );
    });
  });

  describe("auto-restore on mount", () => {
    it("skips auto-restore when the user previously disconnected", async () => {
      localStorage.setItem("giveprotocol_wallet_disconnected", "true");
      const ethereum = makeEthereum();
      setEthereum(ethereum);

      renderHook(() => useWeb3(), { wrapper });
      await waitFor(() =>
        expect(ethereum.request).not.toHaveBeenCalledWith(
          expect.objectContaining({ method: "eth_accounts" }),
        ),
      );
    });

    it("skips auto-restore on /auth pages to avoid Phantom popups", async () => {
      window.history.replaceState({}, "", "/auth/login");
      const ethereum = makeEthereum();
      setEthereum(ethereum);

      renderHook(() => useWeb3(), { wrapper });
      await waitFor(() => expect(ethereum.request).not.toHaveBeenCalled());
    });

    it("skips auto-restore when the user has never connected before", async () => {
      // No giveprotocol_wallet_previously_connected flag set
      const ethereum = makeEthereum();
      setEthereum(ethereum);

      renderHook(() => useWeb3(), { wrapper });
      await waitFor(() =>
        expect(ethereum.request).not.toHaveBeenCalledWith(
          expect.objectContaining({ method: "eth_accounts" }),
        ),
      );
    });

    it("restores state when eth_accounts returns a connected address", async () => {
      localStorage.setItem("giveprotocol_wallet_previously_connected", "true");
      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_accounts") return ["0xrestored"];
        return undefined;
      });
      setEthereum(ethereum);
      setupBrowserProvider({ chainId: 1 });

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await waitFor(() => expect(result.current.address).toBe("0xrestored"));
      expect(result.current.chainId).toBe(1);
    });

    it("skips restore when only Phantom is available with no MetaMask sub-provider", async () => {
      const ethereum = makeEthereum({ isPhantom: true, isMetaMask: false });
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await waitFor(() => expect(result.current.address).toBeNull());
      expect(ethereum.request).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: "eth_accounts" }),
      );
    });

    it("prefers a MetaMask entry inside providers[] when multiple are present", async () => {
      localStorage.setItem("giveprotocol_wallet_previously_connected", "true");
      const phantom = makeEthereum({ isPhantom: true, isMetaMask: false });
      const metamask = makeEthereum({ isMetaMask: true, isPhantom: false });
      metamask.request.mockImplementation(({ method }) => {
        if (method === "eth_accounts") return ["0xmm"];
        return undefined;
      });
      const ethereum = makeEthereum({
        isPhantom: true,
        providers: [phantom, metamask],
      });
      setEthereum(ethereum);
      setupBrowserProvider({ chainId: 8453 });

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await waitFor(() => expect(result.current.address).toBe("0xmm"));
    });

    it("surfaces the not-authorized error during restore", async () => {
      localStorage.setItem("giveprotocol_wallet_previously_connected", "true");
      const ethereum = makeEthereum();
      ethereum.request.mockRejectedValue(
        new Error("The provider has not been authorized"),
      );
      setEthereum(ethereum);

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await waitFor(() =>
        expect(result.current.error?.message).toMatch(/needs authorization/),
      );
    });
  });

  describe("MultiChainContext sync", () => {
    it("syncs provider state when MultiChainContext reports an EVM connection", async () => {
      const evmProvider = makeEthereum();
      mockedUseMultiChainContext.mockReturnValue({
        wallet: {
          name: "Test",
          icon: "",
          category: "browser",
          supportedChainTypes: ["evm"],
          providers: { evm: evmProvider },
          isInstalled: () => true,
          connect: jest.fn(),
          disconnect: jest.fn(),
          getAccounts: jest.fn(),
          switchChain: jest.fn(),
          signTransaction: jest.fn(),
          signMessage: jest.fn(),
        },
        accounts: [
          {
            id: "evm-1",
            address: "0xsynced",
            chainType: "evm",
            chainId: 8453,
            chainName: "Base",
            source: "Test",
          },
        ],
        activeAccount: null,
        activeChainType: "evm",
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchAccount: jest.fn(),
        switchChainType: jest.fn(),
        switchChain: jest.fn(),
        clearError: jest.fn(),
      });
      setupBrowserProvider({ chainId: 8453 });

      const { result } = renderHook(() => useWeb3(), { wrapper });
      await waitFor(() => expect(result.current.address).toBe("0xsynced"));
      expect(result.current.chainId).toBe(8453);
      expect(result.current.isConnected).toBe(true);
    });

    it("clears state when MultiChainContext disconnects after syncing", async () => {
      const evmProvider = makeEthereum();
      mockedUseMultiChainContext.mockReturnValue({
        wallet: {
          name: "Test",
          icon: "",
          category: "browser",
          supportedChainTypes: ["evm"],
          providers: { evm: evmProvider },
          isInstalled: () => true,
          connect: jest.fn(),
          disconnect: jest.fn(),
          getAccounts: jest.fn(),
          switchChain: jest.fn(),
          signTransaction: jest.fn(),
          signMessage: jest.fn(),
        },
        accounts: [
          {
            id: "evm-1",
            address: "0xsynced",
            chainType: "evm",
            chainId: 8453,
            chainName: "Base",
            source: "Test",
          },
        ],
        activeAccount: null,
        activeChainType: "evm",
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchAccount: jest.fn(),
        switchChainType: jest.fn(),
        switchChain: jest.fn(),
        clearError: jest.fn(),
      });
      setupBrowserProvider({ chainId: 8453 });

      const { result, rerender } = renderHook(() => useWeb3(), { wrapper });
      await waitFor(() => expect(result.current.address).toBe("0xsynced"));

      mockedUseMultiChainContext.mockReturnValue({
        wallet: null,
        accounts: [],
        activeAccount: null,
        activeChainType: "evm",
        isConnected: false,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchAccount: jest.fn(),
        switchChainType: jest.fn(),
        switchChain: jest.fn(),
        clearError: jest.fn(),
      });
      rerender();

      await waitFor(() => expect(result.current.address).toBeNull());
    });
  });

  describe("useWeb3MultiChain", () => {
    it("returns null address when MultiChainContext has no wallet", () => {
      const { result } = renderHook(() => useWeb3MultiChain());
      expect(result.current.address).toBeNull();
      expect(result.current.chainId).toBeNull();
    });

    it("derives address and chainId from the active EVM account", () => {
      mockedUseMultiChainContext.mockReturnValue({
        wallet: {
          name: "Test",
          icon: "",
          category: "browser",
          supportedChainTypes: ["evm"],
          providers: { evm: makeEthereum() },
          isInstalled: () => true,
          connect: jest.fn(),
          disconnect: jest.fn(),
          getAccounts: jest.fn(),
          switchChain: jest.fn(),
          signTransaction: jest.fn(),
          signMessage: jest.fn(),
        },
        accounts: [
          {
            id: "evm-1",
            address: "0xabc",
            chainType: "evm",
            chainId: 1,
            chainName: "Ethereum",
            source: "Test",
          },
        ],
        activeAccount: null,
        activeChainType: "evm",
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchAccount: jest.fn(),
        switchChainType: jest.fn(),
        switchChain: jest.fn(),
        clearError: jest.fn(),
      });

      const { result } = renderHook(() => useWeb3MultiChain());
      expect(result.current.address).toBe("0xabc");
      expect(result.current.chainId).toBe(1);
      expect(result.current.isConnected).toBe(true);
    });

    it("delegates connect to MultiChainContext via a wrapper provider", async () => {
      const multiConnect = jest.fn<MultiChainContextType["connect"]>();
      mockedUseMultiChainContext.mockReturnValue({
        wallet: null,
        accounts: [],
        activeAccount: null,
        activeChainType: "evm",
        isConnected: false,
        isConnecting: false,
        error: null,
        connect: multiConnect,
        disconnect: jest.fn(),
        switchAccount: jest.fn(),
        switchChainType: jest.fn(),
        switchChain: jest.fn(),
        clearError: jest.fn(),
      });

      const ethereum = makeEthereum();
      ethereum.request.mockImplementation(({ method }) => {
        if (method === "eth_requestAccounts") return ["0xabc"];
        return undefined;
      });

      const { result } = renderHook(() => useWeb3MultiChain());

      await act(async () => {
        await result.current.connect(ethereum);
      });

      expect(multiConnect).toHaveBeenCalledTimes(1);
      const [unifiedProvider, chainType] = multiConnect.mock.calls[0];
      expect(chainType).toBe("evm");
      const wrapper = unifiedProvider as {
        name: string;
        isInstalled: () => boolean;
        connect: () => Promise<{ address: string }[]>;
        disconnect: () => Promise<void>;
        getAccounts: () => Promise<unknown[]>;
        switchChain: (_id: number) => Promise<void>;
        signTransaction: () => Promise<string>;
        signMessage: () => Promise<string>;
      };
      expect(wrapper.name).toBe("Legacy EVM Wallet");
      expect(wrapper.isInstalled()).toBe(true);

      // Exercise the wrapper's lazy callbacks so they aren't dead code.
      const accounts = await wrapper.connect();
      expect(accounts[0].address).toBe("0xabc");
      await wrapper.disconnect();
      expect(await wrapper.getAccounts()).toEqual([]);
      await wrapper.switchChain(8453);
      expect(ethereum.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x2105" }],
        }),
      );
      expect(await wrapper.signTransaction()).toBe("");
      expect(await wrapper.signMessage()).toBe("");
    });

    it("clears provider/signer when the EVM provider is removed", async () => {
      const evmProvider = makeEthereum();
      mockedBrowserProvider.mockImplementation(() => {
        throw new Error("setup failed");
      });
      mockedUseMultiChainContext.mockReturnValue({
        wallet: {
          name: "Test",
          icon: "",
          category: "browser",
          supportedChainTypes: ["evm"],
          providers: { evm: evmProvider },
          isInstalled: () => true,
          connect: jest.fn(),
          disconnect: jest.fn(),
          getAccounts: jest.fn(),
          switchChain: jest.fn(),
          signTransaction: jest.fn(),
          signMessage: jest.fn(),
        },
        accounts: [
          {
            id: "evm-1",
            address: "0xabc",
            chainType: "evm",
            chainId: 1,
            chainName: "Ethereum",
            source: "Test",
          },
        ],
        activeAccount: null,
        activeChainType: "evm",
        isConnected: true,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchAccount: jest.fn(),
        switchChainType: jest.fn(),
        switchChain: jest.fn(),
        clearError: jest.fn(),
      });

      const { result } = renderHook(() => useWeb3MultiChain());
      await waitFor(() => expect(result.current.provider).toBeNull());
      expect(result.current.signer).toBeNull();
    });

    it("throws when connect is called without an EIP-1193 provider", async () => {
      const { result } = renderHook(() => useWeb3MultiChain());
      let caught: Error | null = null;
      await act(async () => {
        try {
          await result.current.connect();
        } catch (err) {
          caught = err as Error;
        }
      });
      expect(caught?.message).toMatch(/No wallet provider specified/);
    });

    it("delegates switchChain to MultiChainContext for the EVM chain type", async () => {
      const multiSwitch = jest
        .fn<MultiChainContextType["switchChain"]>()
        .mockResolvedValue();
      mockedUseMultiChainContext.mockReturnValue({
        wallet: null,
        accounts: [],
        activeAccount: null,
        activeChainType: "evm",
        isConnected: false,
        isConnecting: false,
        error: null,
        connect: jest.fn(),
        disconnect: jest.fn(),
        switchAccount: jest.fn(),
        switchChainType: jest.fn(),
        switchChain: multiSwitch,
        clearError: jest.fn(),
      });

      const { result } = renderHook(() => useWeb3MultiChain());
      await act(async () => {
        await result.current.switchChain(137);
      });

      expect(multiSwitch).toHaveBeenCalledWith(137, "evm");
    });
  });
});

// Re-import the type used in jest.fn generics above. Importing here keeps the
// test's top imports small for readability.
import type { MultiChainContextType } from "@/types/wallet";
