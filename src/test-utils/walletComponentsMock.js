// Mock for Wallet barrel export (WalletButton, NetworkSelector, NETWORKS, types)

export const WalletButton = ({ address, onDisconnect }) => (
  <div data-testid="wallet-button">
    {address}
    {onDisconnect && (
      <button
        type="button"
        onClick={onDisconnect}
        data-testid="disconnect-button"
      >
        Disconnect
      </button>
    )}
  </div>
);

/** @returns {React.ReactElement} Mock WalletDropdown */
export const WalletDropdown = () => (
  <div data-testid="wallet-dropdown">Wallet Dropdown</div>
);

/** @returns {React.ReactElement} Mock NetworkSelector */
export const NetworkSelector = () => (
  <div data-testid="network-selector">Network Selector</div>
);

export const NETWORKS = [
  {
    id: "base",
    name: "Base",
    token: "ETH",
    color: "#0052FF",
    chainType: "evm",
  },
];

/** @param {string} addr - Wallet address to format */
export const formatAddress = (addr) =>
  `${addr.slice(0, 6)}...${addr.slice(-4)}`;
/** @returns {string} Mock gradient string */
export const getAddressGradient = () =>
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
/** @returns {string} Mock explorer URL */
export const getExplorerUrl = () => "#";
/** @param {string} bal - Balance to format @returns {string} The balance unchanged */
export const formatBalance = (bal) => bal;
/** @param {string} val - USD value to format @returns {string} Formatted USD string */
export const formatUsdValue = (val) => `$${val}`;
/** @returns {Promise<void>} Resolves immediately (mock) */
export const copyToClipboard = () => Promise.resolve();
export const NETWORK_NAMES = {};
export const NETWORK_TOKENS = {};
export const PROVIDER_NAMES = {};
