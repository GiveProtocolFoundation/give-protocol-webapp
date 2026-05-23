# What Is Give Protocol?

Give Protocol is a Delaware-based 501(c)(3) nonprofit that leverages blockchain technology to remove barriers to sustainable charitable action.

## Mission

Give Protocol exists to make charitable giving more transparent, accessible, and impactful. By putting donation records on-chain, every transaction is independently verifiable—donors can trust their funds reached the intended charity, and charities can prove receipts without relying on centralized intermediaries.

## How It Works

### For Donors

Donors connect a cryptocurrency wallet or use a standard fiat payment method. They can:

- Make one-time or recurring donations in stablecoins (USDC, DAI, USDT), ETH, or other ERC-20 tokens
- Contribute to **Portfolio Funds** — pooled vehicles that spread giving across multiple causes
- Track every donation and tax receipt in a personal dashboard
- Set up automatic monthly or quarterly contributions

### For Charities

Verified 501(c)(3) organizations receive donations directly to their designated wallet addresses. They can:

- Manage a public-facing profile and list specific causes
- Post volunteer opportunities and verify hour contributions
- Access real-time analytics on donations received

### For Volunteers

Volunteers log service hours through the platform. Organizations verify those hours on-chain, creating a portable, tamper-resistant record of community service.

## The Technology

Give Protocol is built on top of several EVM-compatible blockchains:

| Network      | Purpose                                                 |
| ------------ | ------------------------------------------------------- |
| **Base**     | Primary donation network (low fees, Coinbase ecosystem) |
| **Optimism** | Secondary network with OP rewards                       |
| **Moonbeam** | Polkadot ecosystem support                              |

Smart contracts handle:

- **Donation processing** with an automatic 0.5% platform fee (the rest goes directly to the charity)
- **Volunteer verification** with on-chain proof of service
- **Portfolio fund distribution** across multiple charity addresses
- **Multi-signature treasury** operations for fund security

All contracts are open source and available in the [`give-protocol-contracts`](https://github.com/GiveProtocolFoundation/give-protocol-contracts) repository.

## Platform Fee

Give Protocol collects a **0.5% platform fee** on each donation to sustain operations. The fee is deducted automatically by the smart contract—there are no hidden charges or optional tip prompts.

| Donation | Charity Receives | Platform Fee |
| -------- | ---------------- | ------------ |
| $100     | $99.50           | $0.50        |
| $1,000   | $995.00          | $5.00        |
| $10,000  | $9,950.00        | $50.00       |

## Open Source

Give Protocol is fully open source under the MIT License. The codebase, smart contracts, and documentation are publicly available on [GitHub](https://github.com/GiveProtocolFoundation). Contributions from the community are welcome.

## Learn More

- [Getting Started](./getting-started.md) — Create your account and make your first donation
- [Wallet Connection](./wallet-connection.md) — Supported wallets and how to connect
- [Dashboard](./dashboard.md) — Track your giving history and impact
