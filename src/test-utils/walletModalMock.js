// Mock for WalletModal — satisfies ConnectButton and Auth test assertions.
// Tests can import __walletModalRef to access the most recent onConnect callback
// and invoke it directly with custom wallet objects and chain types.

/** Ref object holding the most recent onConnect callback for test access */
export const __walletModalRef = { onConnect: null };

export const WalletModal = ({ isOpen, onClose, wallets, onConnect }) => {
  // Store onConnect so tests can invoke it directly
  __walletModalRef.onConnect = onConnect || null;

  if (!isOpen) return null;

  return (
    <div data-testid="wallet-modal">
      <h3>Connect Wallet</h3>
      <button type="button" onClick={onClose} aria-label="Close modal">
        &times;
      </button>
      {wallets?.map((w) => (
        <button
          key={w.name}
          type="button"
          data-testid={`wallet-option-${w.name}`}
          onClick={() => onConnect?.(w, w.supportedChainTypes[0])}
        >
          {w.name}
        </button>
      ))}
      <button type="button" data-chaintype="evm">
        EVM
      </button>
      <button type="button" data-chaintype="solana">
        Solana
      </button>
    </div>
  );
};
