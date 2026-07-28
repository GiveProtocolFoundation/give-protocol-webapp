import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  TokenNetworkSettings,
  NETWORK_OPTIONS,
  TOKEN_OPTIONS,
  parseEnabledChainIds,
  parseEnabledTokens,
  serializeEnabledNetworks,
} from "./TokenNetworkSettings";
import type { PlatformConfigEntry } from "@/types/adminPlatformConfig";

const networksEntry: PlatformConfigEntry = {
  key: "supported_networks",
  value: [{ chainId: 8453, name: "Base" }],
  description: "Blockchain networks supported for donations",
  updatedAt: "2026-07-01T00:00:00Z",
  updatedBy: "admin-1",
};

const tokensEntry: PlatformConfigEntry = {
  key: "supported_tokens",
  value: ["ETH", "USDC"],
  description: "Token symbols accepted for on-chain donations",
  updatedAt: "2026-07-01T00:00:00Z",
  updatedBy: "admin-1",
};

const mockOnSave = jest.fn();
const mockOnEditRaw = jest.fn();

const renderComponent = (
  configs: PlatformConfigEntry[] = [networksEntry, tokensEntry],
  overrides: { loading?: boolean; saving?: boolean } = {},
) =>
  render(
    <TokenNetworkSettings
      configs={configs}
      loading={overrides.loading ?? false}
      saving={overrides.saving ?? false}
      onSave={mockOnSave}
      onEditRaw={mockOnEditRaw}
    />,
  );

/**
 * Finds a row checkbox by the leading label text (network name or token
 * symbol). Anchored to the start of the accessible name so e.g. "Solana"
 * matches only the network row, not the "SOL Solana" token row.
 * @param label - Leading label text of the row
 * @returns The matching checkbox element
 */
function rowCheckbox(label: string): HTMLElement {
  const escaped = label.replaceAll(".", "\\.");
  return screen.getByRole("checkbox", {
    name: new RegExp(`^${escaped} `),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("parseEnabledChainIds", () => {
  it("parses canonical {chainId, name} entries", () => {
    const ids = parseEnabledChainIds([
      { chainId: 8453, name: "Base" },
      { chainId: 10, name: "Optimism" },
    ]);
    expect(ids).toEqual(new Set([8453, 10]));
  });

  it("parses legacy string entries by network name", () => {
    const ids = parseEnabledChainIds(["base", "Ethereum"]);
    expect(ids).toEqual(new Set([8453, 1]));
  });

  it("parses numeric entries directly", () => {
    expect(parseEnabledChainIds([1284])).toEqual(new Set([1284]));
  });

  it("returns empty set for non-array values", () => {
    expect(parseEnabledChainIds("base")).toEqual(new Set());
    expect(parseEnabledChainIds(undefined)).toEqual(new Set());
    expect(parseEnabledChainIds(42)).toEqual(new Set());
  });

  it("ignores unknown string names and malformed objects", () => {
    const ids = parseEnabledChainIds(["not-a-chain", { name: "Base" }]);
    expect(ids.size).toBe(0);
  });
});

describe("parseEnabledTokens", () => {
  it("parses and uppercases string symbols", () => {
    expect(parseEnabledTokens(["eth", "USDC"])).toEqual(
      new Set(["ETH", "USDC"]),
    );
  });

  it("returns empty set for non-array values and skips non-strings", () => {
    expect(parseEnabledTokens("ETH")).toEqual(new Set());
    expect(parseEnabledTokens([1, "", "DAI"])).toEqual(new Set(["DAI"]));
  });
});

describe("serializeEnabledNetworks", () => {
  it("serialises enabled chains in registry order with names", () => {
    const result = serializeEnabledNetworks(new Set([10, 8453]));
    expect(result).toEqual([
      { chainId: 8453, name: "Base" },
      { chainId: 10, name: "Optimism" },
    ]);
  });

  it("drops chain IDs not present in the registry", () => {
    expect(serializeEnabledNetworks(new Set([999999]))).toEqual([]);
  });
});

describe("TokenNetworkSettings", () => {
  it("renders all registry networks with availability status", () => {
    renderComponent();

    expect(screen.getByText("Donation Networks")).toBeInTheDocument();
    for (const option of NETWORK_OPTIONS) {
      expect(screen.getAllByText(option.name).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByText("Available")).toHaveLength(6);
    expect(screen.getAllByText("Not yet integrated")).toHaveLength(2);
    expect(screen.getAllByText("Donation contracts not deployed")).toHaveLength(
      2,
    );
  });

  it("checks enabled networks and disables roadmap network checkboxes", () => {
    renderComponent();

    const base = rowCheckbox("Base");
    expect(base).toBeChecked();
    expect(base).toBeEnabled();

    const solana = rowCheckbox("Solana");
    expect(solana).not.toBeChecked();
    expect(solana).toBeEnabled();

    expect(rowCheckbox("Arbitrum")).toBeDisabled();
    expect(rowCheckbox("Polygon")).toBeDisabled();
    expect(rowCheckbox("Ethereum")).toBeDisabled();
    expect(rowCheckbox("Avalanche")).toBeDisabled();
  });

  it("saves toggled networks in the canonical shape", () => {
    renderComponent();

    const saveButton = screen.getByText("Save Networks");
    expect(saveButton).toBeDisabled();

    fireEvent.click(rowCheckbox("Optimism"));
    expect(saveButton).toBeEnabled();

    fireEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledWith("supported_networks", [
      { chainId: 8453, name: "Base" },
      { chainId: 10, name: "Optimism" },
    ]);
  });

  it("renders all token options and saves toggled tokens", () => {
    renderComponent();

    expect(screen.getByText("Accepted Tokens")).toBeInTheDocument();
    for (const option of TOKEN_OPTIONS) {
      expect(rowCheckbox(option.symbol)).toBeInTheDocument();
    }

    const saveButton = screen.getByText("Save Tokens");
    expect(saveButton).toBeDisabled();

    fireEvent.click(rowCheckbox("DAI"));
    fireEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledWith("supported_tokens", [
      "ETH",
      "USDC",
      "DAI",
    ]);
  });

  it("re-disables save when toggles return to the stored state", () => {
    renderComponent();

    fireEvent.click(rowCheckbox("Optimism"));
    expect(screen.getByText("Save Networks")).toBeEnabled();
    fireEvent.click(rowCheckbox("Optimism"));
    expect(screen.getByText("Save Networks")).toBeDisabled();
  });

  it("preserves unknown token symbols from stored config on save", () => {
    renderComponent([
      networksEntry,
      { ...tokensEntry, value: ["ETH", "USDC.E"] },
    ]);

    // Unknown symbol is rendered as an extra checked row
    expect(rowCheckbox("USDC.E")).toBeChecked();

    fireEvent.click(rowCheckbox("DAI"));
    fireEvent.click(screen.getByText("Save Tokens"));
    expect(mockOnSave).toHaveBeenCalledWith("supported_tokens", [
      "ETH",
      "DAI",
      "USDC.E",
    ]);
  });

  it("opens the raw JSON editor for each section", () => {
    renderComponent();

    const editButtons = screen.getAllByText("Edit JSON");
    expect(editButtons).toHaveLength(2);
    fireEvent.click(editButtons[0]);
    expect(mockOnEditRaw).toHaveBeenCalledWith(networksEntry);
    fireEvent.click(editButtons[1]);
    expect(mockOnEditRaw).toHaveBeenCalledWith(
      expect.objectContaining({ key: "supported_tokens" }),
    );
  });

  it("shows loading spinner while config loads", () => {
    renderComponent([], { loading: true });
    expect(screen.queryByText("Donation Networks")).not.toBeInTheDocument();
  });

  it("shows empty state when neither config entry exists", () => {
    renderComponent([]);
    expect(
      screen.getByText("No token or network configuration found."),
    ).toBeInTheDocument();
  });

  it("disables controls while saving", () => {
    renderComponent([networksEntry, tokensEntry], { saving: true });
    expect(rowCheckbox("Base")).toBeDisabled();
    expect(screen.getAllByText("Saving…")).toHaveLength(2);
  });
});
