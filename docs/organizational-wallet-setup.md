# Organizational Treasury Wallet Setup

This guide is for **charity administrators** setting up a wallet to receive cryptocurrency donations on Give Protocol.

> **Personal donors** looking to connect a wallet for giving should see [Personal Wallet Setup](./personal-wallet-setup.md) instead.

## Why Charities Need a Different Wallet Posture

A personal wallet is controlled by a single private key held by one person. For a charity, that creates serious operational and legal risk:

- If the key-holder leaves the organization, funds can be locked or inaccessible.
- A single compromised device can drain the entire treasury.
- Most jurisdictions require charitable funds to be subject to organizational oversight and multi-party authorization, not individual control.

Give Protocol supports three tiers of organizational wallet configuration. Most charities should start with the **Recommended** option (Safe Multisig).

---

## Recommended: Safe Multisig

A [Safe](https://safe.global) multisig wallet requires M-of-N approvals before any transaction executes — for example, 2-of-3 board signers must approve a withdrawal. This matches standard governance requirements for nonprofits and is the approach recommended by Give Protocol for all registered charities.

### Why Safe

- Open-source, audited smart contract wallet
- Battle-tested by DAOs and foundations managing hundreds of millions of dollars
- Supports all three Give Protocol mainnet chains (Base, Optimism, Moonbeam)
- Free to deploy; only gas costs apply

### Step-by-Step Setup

#### Base

1. Go to [app.safe.global](https://app.safe.global) and connect your personal wallet.
2. Click **Create new Safe** and select **Base** as the network.

   ![placeholder: safe-deploy-step-1]

3. Enter a name for the Safe (e.g., "Greenwood Foundation Treasury").
4. Add **Owner Addresses** — paste in the wallet addresses of each authorized signer. We recommend at least three owners.

   ![placeholder: safe-deploy-step-2]

5. Set the **Threshold** — the minimum number of owners required to approve a transaction. A 2-of-3 threshold is a good starting point.
6. Review the setup and click **Create**. Sign the deployment transaction in your personal wallet.
7. Once deployed, copy the Safe address (starts with `0x…`).

   ![placeholder: safe-deploy-step-3]

8. In the Give Protocol Charity Portal, go to **Organization Settings → Wallet Address** and paste the Safe address.

#### Optimism

Follow the same steps above but select **Optimism** as the network in step 2.

> The Safe UI at app.safe.global supports Optimism natively. Use the same signer addresses you used on Base if your signers hold wallets on multiple chains.

#### Moonbeam

1. Go to [app.safe.global](https://app.safe.global) and connect your personal wallet.
2. Click **Create new Safe** and select **Moonbeam** as the network.

   ![placeholder: safe-moonbeam-deploy-step-1]

3. Follow the same owner and threshold configuration steps as above.
4. After deployment, paste the Moonbeam Safe address into the Give Protocol Charity Portal under **Organization Settings → Wallet Address (Moonbeam)**.

> **Moonbeam note:** Ensure your signer wallets have a small amount of GLMR to cover deployment gas. You can bridge GLMR via [Moonbeam's official bridge](https://apps.moonbeam.network/moonbeam/xcm).

### After Deployment

- Store the Safe address in your organization's records.
- Confirm all owners can access their wallets and understand how to approve transactions in the Safe UI.
- Test with a small transaction (e.g., send 1 USDC to the Safe from a personal wallet, then execute a withdrawal back) before going live.

---

## Alternative: Institutional Custody

If your organization already uses a regulated custodian (such as Anchorage Digital, BitGo, Coinbase Prime, or Fireblocks), you can register a custodian-managed wallet address with Give Protocol.

### Supported Custodians

| Custodian         | Supported Chains          | Notes                                                   |
| ----------------- | ------------------------- | ------------------------------------------------------- |
| Anchorage Digital | Base, Optimism            | Requires Business account                               |
| BitGo             | Base, Optimism, Moonbeam  | Multi-user policies supported                           |
| Coinbase Prime    | Base, Optimism            | Institutional account required                          |
| Fireblocks        | Base, Optimism, Moonbeam  | Policy Engine recommended for governance                |

### Attestation Requirements

Because custodians manage keys on your behalf, Give Protocol requires an **on-chain attestation** to link the custodian address to your verified charity profile:

1. Contact [support@giveprotocol.io](mailto:support@giveprotocol.io) with your custodian name and the wallet address to register.
2. Give Protocol will send a small test transaction to that address and ask you to confirm receipt via your custodian dashboard.
3. Once confirmed, your charity profile will be updated to mark the wallet as custodian-managed.

Attestation typically takes 1–2 business days.

---

## Advanced: Single-Signer Wallet

> **Risk notice:** A single-signer wallet (e.g., a personal MetaMask or hardware wallet) is **not recommended** for organizations with more than one person responsible for funds. It creates key-person risk and may not meet your fiduciary obligations.

This option exists for very small organizations — for example, a newly formed charity with a single founder managing all operations before formal governance structures are in place.

### When a Single-Signer Wallet May Be Acceptable

- Fewer than 5 total donations expected in the first 90 days
- Founding team is a single person with no other board members yet
- Organization plans to migrate to a Safe multisig within 90 days

### How to Register

Follow the standard wallet connection steps in [Personal Wallet Setup](./personal-wallet-setup.md), then paste your wallet address into the Give Protocol Charity Portal under **Organization Settings → Wallet Address**.

### Migration Path

When you are ready to upgrade to a multisig, follow the Safe Multisig setup steps above, then update your **Organization Settings → Wallet Address** to the new Safe address. Any donations sent to your old address before the update will not be affected — they are already yours — but future donations will be directed to the new address.

---

## Related Guides

- [Personal Wallet Setup](./personal-wallet-setup.md) — For individual donors connecting a personal wallet
- [Dashboard](./dashboard.md) — Managing your charity's donation analytics and fund utilization
- [First Steps](./first-steps.md) — Completing your charity profile after registration
