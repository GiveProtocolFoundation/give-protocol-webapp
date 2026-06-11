# Dashboard

The Give Protocol dashboard gives you a real-time view of your charitable activity. This guide covers the Donor Dashboard, the Charity Portal analytics view, and the Volunteer contribution tracker.

## Donor Dashboard (`/give-dashboard`)

The Donor Dashboard is your central hub for managing all giving activity.

### Overview Panel

At the top of the dashboard you'll see summary cards:

- **Total Donated** — Cumulative amount given across all donations (in your preferred display currency)
- **Active Recurring Donations** — Number of scheduled recurring donations currently running
- **Charities Supported** — Count of distinct organizations you've donated to
- **CIF Value** — Current estimated value of your Cause-Specific Impact Fund (CIF) contributions

### Donation History

The **Donation History** table lists every completed donation with:

| Column  | Description                                         |
| ------- | --------------------------------------------------- |
| Date    | Timestamp of the on-chain transaction               |
| Charity | Name and link to the charity profile                |
| Amount  | Token amount and USD equivalent at time of donation |
| Network | Blockchain network used (Base, Optimism, Moonbeam)  |
| Status  | Confirmed, Pending, or Failed                       |
| Receipt | Link to download or view the tax receipt            |

Click any row to see the full transaction details, including the on-chain transaction hash and block explorer link.

### Recurring Donations

The **Scheduled Donations** section (`/scheduled-donations`) shows all active recurring donation schedules:

- **Frequency** — Monthly or quarterly
- **Next Payment** — Date of the next scheduled transaction
- **Token** — The token and amount that will be sent
- **Charity** — The recipient organization

Use the **Pause**, **Edit**, or **Cancel** buttons to manage each schedule.

### Cause-Specific Impact Funds (CIFs)

The **My CIFs** section shows your current positions in any Cause-Specific Impact Funds (CIFs) you've joined. For each fund you can see:

- Current allocation across member charities
- Total contributed
- Performance metrics (fund utilization and impact reports)

### Tax Receipts

All donation receipts are automatically generated and stored. Click **Download Receipt** on any donation row to get a PDF receipt formatted for tax purposes.

---

## Charity Portal Analytics (`/charity-portal`)

Approved charity administrators see an analytics section in their portal:

### Donation Analytics

- **Total Received** — Cumulative donations received across all causes
- **Active Donors** — Number of unique donors who have given in the last 90 days
- **Trend Chart** — Weekly donation volume over the last 12 months
- **Top Causes** — Which causes are receiving the most donations

### Fund Utilization

Track how received funds have been allocated and reported on. Upload spending reports to maintain donor transparency.

### Volunteer Activity

- Open opportunities and applications
- Hours logged and verified on-chain
- Volunteer engagement trends

---

## Volunteer Contribution Tracker (`/contributions`)

Volunteers can view their verified service history:

- **Total Hours** — Cumulative verified volunteer hours
- **Organizations** — All charities you've served with
- **Verification Status** — Each logged session shows whether it's been verified on-chain
- **Skills Earned** — Blockchain-verified skills and endorsements from charities

Click any entry to see the on-chain transaction confirming the verification.

---

## Dashboard Settings (`/settings`)

Customize your dashboard experience:

- **Display currency** — Change how donation amounts are shown (USD, EUR, GBP, etc.)
- **Notification preferences** — Email alerts for confirmations, reminders, and impact reports
- **Privacy settings** — Toggle anonymous giving and public profile visibility

---

## Wallet Setup

Give Protocol supports two wallet tiers depending on whether you are a **donor** or a **charity administrator**:

- **Donors** — Connect a personal wallet (MetaMask, WalletConnect, Coinbase Wallet, Ledger, and others). See [Personal Wallet Setup](./personal-wallet-setup.md).
- **Charity administrators** — Configure a secure treasury wallet appropriate for your organization. Options include a Safe multisig (recommended), institutional custody, or a single-signer wallet for very small orgs. See [Organizational Treasury Wallet Setup](./organizational-wallet-setup.md).

---

## Related Guides

- [First Steps](./first-steps.md) — Making your first donation
- [Personal Wallet Setup](./personal-wallet-setup.md) — Connecting and managing a personal wallet
- [Organizational Treasury Wallet Setup](./organizational-wallet-setup.md) — Secure wallet setup for charity administrators
- [Setting Up Your Profile](./setting-up-profile.md) — Personalizing your account
