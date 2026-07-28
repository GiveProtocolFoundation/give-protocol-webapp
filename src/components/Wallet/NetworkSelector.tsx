import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { ChevronDown, Check, Globe } from "lucide-react";
import type { NetworkSelectorProps, NetworkType, NetworkConfig } from "./types";
import { NETWORKS } from "./types";

/** Chain icon paths keyed by network ID */
const CHAIN_ICONS: Partial<Record<NetworkType, string>> = {
  ethereum: "/chains/ethereum.svg",
  base: "/chains/base.svg",
  optimism: "/chains/optimism.svg",
  moonbeam: "/chains/moonbeam.svg",
  arbitrum: "/chains/arbitrum.svg",
  polygon: "/chains/polygon.svg",
  avalanche: "/chains/avalanche.svg",
  "base-sepolia": "/chains/base.svg",
  "optimism-sepolia": "/chains/optimism.svg",
  moonbase: "/chains/moonbeam.svg",
  "solana-mainnet": "/chains/solana.svg",
  polkadot: "/chains/polkadot.svg",
  kusama: "/chains/kusama.svg",
};

/** Section labels for each chain ecosystem */
const CHAIN_TYPE_LABELS: Record<string, string> = {
  evm: "EVM Networks",
  solana: "Solana",
  polkadot: "Polkadot",
};

/** Display order for chain type sections */
const CHAIN_TYPE_ORDER = ["evm", "solana", "polkadot"] as const;

/**
 * Chain icon component - shows SVG icon with colored dot fallback
 * @param props - NetworkIconProps with network config
 * @returns Chain icon element
 */
const ChainIcon: React.FC<{ network: NetworkConfig; size?: number }> = ({
  network,
  size = 20,
}) => {
  const iconPath = CHAIN_ICONS[network.id];

  if (iconPath) {
    return (
      <img
        src={iconPath}
        alt=""
        aria-hidden="true"
        className="rounded-full flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: network.color }}
      aria-hidden="true"
    />
  );
};

/**
 * NetworkSelector component - Allows switching between blockchain networks
 * Groups networks by chain type (EVM, Solana, Polkadot) with section headers
 * @param props - NetworkSelectorProps
 * @returns Network selector dropdown JSX element
 */
export const NetworkSelector: React.FC<NetworkSelectorProps> = ({
  currentNetwork,
  onNetworkChange,
  networks,
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayNetworks = networks || NETWORKS;

  const currentNetworkConfig = useMemo(
    () => displayNetworks.find((n) => n.id === currentNetwork),
    [currentNetwork, displayNetworks],
  );

  /** Networks grouped by chainType, preserving section order */
  const groupedNetworks = useMemo(() => {
    const groups: Record<string, NetworkConfig[]> = {};
    for (const network of displayNetworks) {
      const key = network.chainType;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(network);
    }
    return groups;
  }, [displayNetworks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    /** Closes the dropdown if the click target is outside the container */
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    /** Closes the dropdown when Escape is pressed */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  const handleNetworkSelect = useCallback(
    (network: NetworkType) => {
      onNetworkChange(network);
      setIsOpen(false);
    },
    [onNetworkChange],
  );

  const handleNetworkClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const networkId = event.currentTarget.dataset.networkId as NetworkType;
      if (networkId) {
        handleNetworkSelect(networkId);
      }
    },
    [handleNetworkSelect],
  );

  const handleNetworkKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        const networkId = event.currentTarget.dataset.networkId as NetworkType;
        if (networkId) {
          handleNetworkSelect(networkId);
        }
      }
    },
    [handleNetworkSelect],
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-3 py-2
          bg-white/90 hover:bg-white dark:bg-[#0E1514]/90 dark:hover:bg-[#0E1514]
          border border-gray-200 dark:border-gray-700
          rounded-xl shadow-sm
          transition-all duration-200
          ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:shadow-md"}
          ${isOpen ? "ring-2 ring-emerald-500 ring-offset-1 dark:ring-offset-gray-900" : ""}
        `}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`Current network: ${currentNetworkConfig?.name || currentNetwork}`}
      >
        <Globe
          aria-hidden="true"
          className="h-4 w-4 text-gray-500 dark:text-gray-400"
        />
        {currentNetworkConfig && (
          <>
            <ChainIcon network={currentNetworkConfig} size={16} />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">
              {currentNetworkConfig.name}
            </span>
          </>
        )}
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-[#0E1514] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
          role="menu"
          aria-label="Select network"
        >
          {CHAIN_TYPE_ORDER.filter((ct) => groupedNetworks[ct]).map(
            (chainType) => (
              <div key={chainType}>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 uppercase tracking-wider">
                  {CHAIN_TYPE_LABELS[chainType]}
                </div>
                <div className="p-1">
                  {groupedNetworks[chainType].map((network) => {
                    const isSelected = network.id === currentNetwork;
                    return (
                      <button
                        key={network.id}
                        type="button"
                        role="menuitemradio"
                        aria-checked={isSelected}
                        data-network-id={network.id}
                        onClick={handleNetworkClick}
                        onKeyDown={handleNetworkKeyDown}
                        className={`
                        w-full flex items-center gap-3 px-3 py-2.5
                        rounded-lg transition-colors
                        ${
                          isSelected
                            ? "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                            : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        }
                      `}
                      >
                        <ChainIcon network={network} size={20} />
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium">{network.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {network.token}
                          </p>
                        </div>
                        {isSelected && (
                          <Check
                            aria-hidden="true"
                            className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default NetworkSelector;
