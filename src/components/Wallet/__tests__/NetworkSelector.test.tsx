import { jest } from "@jest/globals";
import { render, screen, fireEvent } from "@testing-library/react";
import { NetworkSelector } from "../NetworkSelector";
import type { NetworkConfig, NetworkType } from "../types";

const mockNetworks: NetworkConfig[] = [
  {
    id: "base",
    name: "Base",
    token: "ETH",
    color: "#0052FF",
    chainType: "evm",
  },
  {
    id: "optimism",
    name: "Optimism",
    token: "ETH",
    color: "#FF0420",
    chainType: "evm",
  },
  {
    id: "solana-mainnet",
    name: "Solana",
    token: "SOL",
    color: "#9945FF",
    chainType: "solana",
  },
  {
    id: "polkadot",
    name: "Polkadot",
    token: "DOT",
    color: "#E6007A",
    chainType: "polkadot",
  },
];

const defaultProps = {
  currentNetwork: "base" as NetworkType,
  onNetworkChange: jest.fn<(_network: NetworkType) => void>(),
  networks: mockNetworks,
};

const renderSelector = (overrides: Partial<typeof defaultProps> = {}) =>
  render(<NetworkSelector {...defaultProps} {...overrides} />);

describe("NetworkSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Trigger button", () => {
    it("renders trigger button with current network name", () => {
      renderSelector();
      expect(
        screen.getByRole("button", { name: /Current network: Base/i }),
      ).toBeInTheDocument();
      expect(screen.getByText("Base")).toBeInTheDocument();
    });

    it("sets aria-expanded to false when dropdown is closed", () => {
      renderSelector();
      const trigger = screen.getByRole("button", {
        name: /Current network/i,
      });
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  describe("Dropdown open", () => {
    it("opens dropdown on click", () => {
      renderSelector();
      const trigger = screen.getByRole("button", {
        name: /Current network/i,
      });
      fireEvent.click(trigger);
      expect(trigger).toHaveAttribute("aria-expanded", "true");
      expect(screen.getByRole("menu")).toBeInTheDocument();
    });

    it("shows network options grouped by chain type", () => {
      renderSelector();
      fireEvent.click(screen.getByRole("button", { name: /Current network/i }));

      expect(screen.getByText("EVM Networks")).toBeInTheDocument();
      // "Solana" and "Polkadot" appear as both section headers and network names
      expect(screen.getAllByText("Solana")).toHaveLength(2);
      expect(screen.getAllByText("Polkadot")).toHaveLength(2);
    });

    it("shows all network names in dropdown", () => {
      renderSelector();
      fireEvent.click(screen.getByRole("button", { name: /Current network/i }));

      const menuItems = screen.getAllByRole("menuitemradio");
      expect(menuItems).toHaveLength(4);
    });

    it("marks current network as checked", () => {
      renderSelector();
      fireEvent.click(screen.getByRole("button", { name: /Current network/i }));

      const baseOption = screen.getByRole("menuitemradio", {
        name: /Base/i,
      });
      expect(baseOption).toHaveAttribute("aria-checked", "true");

      const optimismOption = screen.getByRole("menuitemradio", {
        name: /Optimism/i,
      });
      expect(optimismOption).toHaveAttribute("aria-checked", "false");
    });
  });

  describe("Network selection", () => {
    it("calls onNetworkChange when a network is selected", () => {
      const onNetworkChange = jest.fn<(_network: NetworkType) => void>();
      renderSelector({ onNetworkChange });

      fireEvent.click(screen.getByRole("button", { name: /Current network/i }));
      const optimismOption = screen.getByRole("menuitemradio", {
        name: /Optimism/i,
      });
      fireEvent.click(optimismOption);

      expect(onNetworkChange).toHaveBeenCalledTimes(1);
      expect(onNetworkChange).toHaveBeenCalledWith("optimism");
    });

    it("closes dropdown after selecting a network", () => {
      renderSelector();

      const trigger = screen.getByRole("button", {
        name: /Current network/i,
      });
      fireEvent.click(trigger);
      expect(screen.getByRole("menu")).toBeInTheDocument();

      const solanaOption = screen.getByRole("menuitemradio", {
        name: /Solana/i,
      });
      fireEvent.click(solanaOption);

      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("Keyboard interaction", () => {
    it("closes dropdown on Escape key", () => {
      renderSelector();

      fireEvent.click(screen.getByRole("button", { name: /Current network/i }));
      expect(screen.getByRole("menu")).toBeInTheDocument();

      fireEvent.keyDown(document, { key: "Escape" });
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });

  describe("Disabled state", () => {
    it("renders trigger button as disabled", () => {
      renderSelector({ disabled: true });
      const trigger = screen.getByRole("button", {
        name: /Current network/i,
      });
      expect(trigger).toBeDisabled();
    });

    it("does not open dropdown when disabled", () => {
      renderSelector({ disabled: true });
      const trigger = screen.getByRole("button", {
        name: /Current network/i,
      });
      fireEvent.click(trigger);
      expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    });
  });
});
