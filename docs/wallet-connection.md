# Wallet Connection

A cryptocurrency wallet is required to make crypto donations on Give Protocol. This guide explains how to connect a wallet and which wallets are supported.

## Supported Wallets

| Wallet              | Type              | Notes                                           |
| ------------------- | ----------------- | ----------------------------------------------- |
| **MetaMask**        | Browser extension | Most widely used; auto-detected                 |
| **WalletConnect**   | Protocol          | Connects mobile and desktop wallets via QR code |
| **Coinbase Wallet** | Browser / mobile  | Native integration                              |
| **Ledger**          | Hardware          | Secure cold-wallet option                       |
| **Safe (Gnosis)**   | Multisig          | For organizations using multi-signature wallets |
| **Phantom**         | Browser extension | EVM mode required                               |
| **Rabby**           | Browser extension | Multi-chain support                             |
| **Talisman**        | Browser extension | Polkadot and EVM                                |
| **SubWallet**       | Browser extension | Polkadot and EVM                                |

> **Don't have a wallet?** We recommend [MetaMask](https://metamask.io) for first-time users. It's free, takes a few minutes to set up, and works in any desktop browser.

## How to Connect Your Wallet

### Method 1 — From the Navigation Bar

1. Click **Connect Wallet** in the top-right corner of any page.
2. A modal will appear listing available wallet options.
3. Click your wallet provider.
4. Your wallet extension will prompt you to approve the connection — click **Connect** or **Approve**.
5. Once connected, your wallet address and balance will appear in the navigation bar.

### Method 2 — During Donation

If you haven't connected a wallet yet and try to donate, you'll be prompted to connect one before the donation can proceed.

## Supported Networks

Give Protocol operates on the following EVM-compatible blockchains:

| Network          | Chain ID | Status  |
| ---------------- | -------- | ------- |
| **Base**         | 8453     | Mainnet |
| **Optimism**     | 10       | Mainnet |
| **Moonbeam**     | 1284     | Mainnet |
| Base Sepolia     | 84532    | Testnet |
| Optimism Sepolia | 11155420 | Testnet |
| Moonbase Alpha   | 1287     | Testnet |

When you connect a wallet, Give Protocol will detect your current network. If you are on an unsupported network, a prompt will ask you to switch to a supported one.

## Switching Networks

1. Click your connected wallet address in the navigation bar.
2. Select **Switch Network** from the dropdown.
3. Choose the desired network.
4. Your wallet will prompt you to approve the network switch.

Alternatively, switch networks directly in your wallet application — Give Protocol will detect the change automatically.

## Accepted Tokens

On each supported network, you can donate using:

| Token | Base | Optimism | Moonbeam |
| ----- | ---- | -------- | -------- |
| USDC  | ✓    | ✓        | ✓        |
| USDT  | ✓    | ✓        | ✓        |
| DAI   | ✓    | ✓        | —        |
| WETH  | ✓    | ✓        | —        |
| OP    | —    | ✓        | —        |
| xcDOT | —    | —        | ✓        |
| WGLMR | —    | —        | ✓        |

## Disconnecting Your Wallet

1. Click your wallet address in the navigation bar.
2. Select **Disconnect**.

Disconnecting your wallet also logs you out of your Give Protocol session.

## Fiat Payments (No Wallet Required)

Prefer to donate with a credit or debit card? Give Protocol supports fiat payments via **Helcim** on select charities. No crypto wallet is needed. Look for the **Pay with Card** option on the donation form.

## Troubleshooting

| Problem              | Solution                                                                |
| -------------------- | ----------------------------------------------------------------------- |
| Wallet not detected  | Ensure the browser extension is installed and enabled; refresh the page |
| Wrong network        | Click Switch Network and select a supported chain                       |
| Transaction pending  | Check your wallet for a pending approval or speed up the transaction    |
| Insufficient funds   | Ensure you have enough tokens plus gas fees on the selected network     |
| MetaMask not showing | Disable other wallet extensions that may conflict                       |

## Related Guides

- [First Steps](./first-steps.md) — Make your first donation
- [Dashboard](./dashboard.md) — View your donation history
