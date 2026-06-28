import { describe, it, expect, beforeEach, jest } from "@jest/globals";
import {
  switchEvmNetwork,
  switchSolanaNetwork,
  switchPolkadotNetwork,
  type MultiChainHandle,
  type NetworkSwitchDeps,
} from "../appNavbarHelpers";
import type { NetworkType } from "../Wallet";

function buildMultiChain(
  overrides: Partial<MultiChainHandle> = {},
): MultiChainHandle {
  return {
    switchChainType: jest.fn(),
    switchChain: jest.fn().mockResolvedValue(),
    activeChainType: "evm",
    wallet: null,
    ...overrides,
  };
}

function buildDeps(
  overrides: Partial<NetworkSwitchDeps> = {},
): NetworkSwitchDeps {
  return {
    evmChainIds: { base: 8453, moonbase: 1287 } as Partial<
      Record<NetworkType, number>
    >,
    isConnected: true,
    setNetwork: jest.fn(),
    switchChain: jest.fn().mockResolvedValue(),
    multiChain: buildMultiChain(),
    ...overrides,
  };
}

let consoleErrorSpy: ReturnType<typeof jest.spyOn>;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {
    // suppress expected error logs
  });
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  jest.clearAllMocks();
});

describe("switchEvmNetwork", () => {
  it("switches the chain and updates network state on success", async () => {
    const deps = buildDeps();
    await switchEvmNetwork("base" as NetworkType, deps);
    expect(deps.switchChain).toHaveBeenCalledWith(8453);
    expect(deps.setNetwork).toHaveBeenCalledWith("base");
  });

  it("flips multiChain to evm chain type when previously on another chain", async () => {
    const multiChain = buildMultiChain({ activeChainType: "solana" });
    const deps = buildDeps({ multiChain });
    await switchEvmNetwork("base" as NetworkType, deps);
    expect(multiChain.switchChainType).toHaveBeenCalledWith("evm");
  });

  it("skips multiChain.switchChainType when already on evm", async () => {
    const multiChain = buildMultiChain({ activeChainType: "evm" });
    const deps = buildDeps({ multiChain });
    await switchEvmNetwork("base" as NetworkType, deps);
    expect(multiChain.switchChainType).not.toHaveBeenCalled();
  });

  it("falls back to local-only state when the network has no chain id", async () => {
    const deps = buildDeps({ evmChainIds: {} });
    await switchEvmNetwork("base" as NetworkType, deps);
    expect(deps.setNetwork).toHaveBeenCalledWith("base");
    expect(deps.switchChain).not.toHaveBeenCalled();
  });

  it("falls back to local-only state when the wallet is not connected", async () => {
    const deps = buildDeps({ isConnected: false });
    await switchEvmNetwork("base" as NetworkType, deps);
    expect(deps.setNetwork).toHaveBeenCalledWith("base");
    expect(deps.switchChain).not.toHaveBeenCalled();
  });

  it("logs and swallows when switchChain rejects", async () => {
    const deps = buildDeps({
      switchChain: jest.fn().mockRejectedValue(new Error("rpc")),
    });
    await switchEvmNetwork("base" as NetworkType, deps);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to switch network:",
      expect.any(Error),
    );
    // setNetwork is NOT called when the chain switch fails.
    expect(deps.setNetwork).not.toHaveBeenCalled();
  });
});

describe("switchSolanaNetwork", () => {
  it("flips multiChain to solana and updates network state", () => {
    const deps = buildDeps();
    switchSolanaNetwork("solana" as NetworkType, deps);
    expect(deps.multiChain.switchChainType).toHaveBeenCalledWith("solana");
    expect(deps.setNetwork).toHaveBeenCalledWith("solana");
  });

  it("logs and swallows when switchChainType throws", () => {
    const multiChain = buildMultiChain({
      switchChainType: jest.fn(() => {
        throw new Error("boom");
      }),
    });
    const deps = buildDeps({ multiChain });
    switchSolanaNetwork("solana" as NetworkType, deps);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to switch to Solana:",
      expect.any(Error),
    );
    expect(deps.setNetwork).not.toHaveBeenCalled();
  });
});

describe("switchPolkadotNetwork", () => {
  it("flips multiChain to polkadot and forwards the chain id when a wallet is connected", async () => {
    const multiChain = buildMultiChain({ wallet: { name: "Talisman" } });
    const deps = buildDeps({ multiChain });
    await switchPolkadotNetwork("polkadot" as NetworkType, deps);
    expect(multiChain.switchChainType).toHaveBeenCalledWith("polkadot");
    expect(multiChain.switchChain).toHaveBeenCalledWith("polkadot", "polkadot");
    expect(deps.setNetwork).toHaveBeenCalledWith("polkadot");
  });

  it("skips multiChain.switchChain when no wallet is connected", async () => {
    const multiChain = buildMultiChain({ wallet: null });
    const deps = buildDeps({ multiChain });
    await switchPolkadotNetwork("polkadot" as NetworkType, deps);
    expect(multiChain.switchChainType).toHaveBeenCalledWith("polkadot");
    expect(multiChain.switchChain).not.toHaveBeenCalled();
    expect(deps.setNetwork).toHaveBeenCalledWith("polkadot");
  });

  it("logs and swallows when switchChain rejects", async () => {
    const multiChain = buildMultiChain({
      wallet: { name: "Talisman" },
      switchChain: jest.fn().mockRejectedValue(new Error("polkadot boom")),
    });
    const deps = buildDeps({ multiChain });
    await switchPolkadotNetwork("polkadot" as NetworkType, deps);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to switch to Polkadot network:",
      expect.any(Error),
    );
    expect(deps.setNetwork).not.toHaveBeenCalled();
  });
});
