# GIV-864 — Give Protocol Status Review & MVP Launch Roadmap

**Owner:** CPO · **Audience:** Board / CEO / CTO · **Date:** 2026-08-06
**Status:** Working document — rev 2 (2026-08-06 T13:15Z) incorporates CH5/GIV-870
chain-deployment audit findings; L3 resolved into new critical env-var gate.
Reconciled against live code, board, GIV-835 functional audit (2026-08-04), and
GIV-870 chain audit (2026-08-06).

Board ask (verbatim):
> Review what we've done to date in the Give Protocol repository. Map what's still
> needed for us to have a viable MVP product for launch.
> Also given updates with the Moonbeam network migrating to Base, lets remove
> anything no longer needed to accommodate Moonbeam and fortify the code and setup
> for the chains we're still focusing on. Delegate as appropriate.

This document splits into two decisions:

1. **What blocks a launch-ready MVP** — reconciled from GIV-123 launch readiness plan
   (2026-07-13) and the GIV-835/GIV-837 27-surface functional audit (2026-08-04).
2. **Moonbeam removal + multi-chain fortification** — scoped from a full-repo grep,
   with a delegated cleanup plan.

---

## 1. What We've Shipped (last 6 weeks, live on prod)

Cross-referenced against `git log` and QA-verified issues. All items live on
`giveprotocol.io` unless noted.

**Core giving loop**
- Consent modal + Art. 9(2)(a) donation-consent gate on both fiat and crypto forms
  (GIV-654 / GIV-655, code-verified 2026-08-04).
- Fiat donations via Helcim; receipts via Resend, 12-locale templates (GIV-162 / GIV-638).
- Country-agnostic charity copy (GIV-519 / GIV-520 / GIV-581): "Tax ID", "Verified
  nonprofit", "Sector code"; internal US-EIN preserved.
- Donor history + leaderboards (GIV-111 / GIV-121).
- Passwordless-first auth: Google OAuth, Passkeys (GIV-180 / GIV-182 / GIV-185 / GIV-187),
  email + verification link (GIV-245 / GIV-246).

**Portal & admin**
- Charity onboarding checklist auto-progression (GIV-114 / GIV-211).
- Logo + banner upload → browse + portal header (GIV-201 / GIV-202 / GIV-210).
- Charity wallet setup — self-signer flow complete (GIV-286/287/288/289 for schema +
  RPCs; Safe + Institutional flows are stubs — see §2.2 below).
- Admin dashboard, charity management, reports (6 tabs), moderation, platform config,
  audit-log viewer (GIV-86 / GIV-94 / GIV-96 / GIV-721).
- **AdminErrorPanel parity on all admin pages** (GIV-786 + GIV-841 + PR #536 in QA
  review as GIV-845) — kills the "silent empty" root-cause cycle.
- Admin RPC dedup + PGRST203 fix (GIV-766 / GIV-767 / GIV-768).
- Volunteer application PII **encrypted client-side** before Supabase insert (GIV-407 /
  resolved; verified in audit).
- Token & network settings admin surface (GIV-782).

**Multi-chain expansion (GIV-785 board decision → GIV-790 exec)**
- Ethereum mainnet (1), Arbitrum (42161), Polygon (137), Avalanche (43114) added to
  `SUPPORTED_EVM_CHAIN_IDS` alongside existing Base (8453) and Optimism (10).
- Ethereum mainnet gas UX shipped (GIV-799 → GIV-838): USD + gwei display, high-gas
  warning, L2 hint.
- Selector auto-filters to chains where `DONATION` contract address env var is set — no
  chain shows in the picker until a real contract is deployed (see §2.2 finding #9).

**GDPR / trust / safety**
- Single CMP; Silktide removed; GA4 + Sentry consent-gated (GIV-375 / GIV-377 / GIV-378).
- charity_wallets GDPR erasure RPC + Art. 20 export + storage cleanup (GIV-313/314/315).
- Admin audit logging on 5 admin read RPCs (GIV-413 / GIV-414).
- RoPA v1.5 live; v1.6 delta in flight (GIV-651).
- Data-safety scan cadence (PCI SAQ A-EP ASV; GIV-538 / GIV-316 series).
- 3 unguarded admin routes wrapped with ProtectedRoute (GIV-843 / PR #534).

**Engineering health**
- CI green on main baseline: **292 suites / 3,958 tests / 0 failures** as of 2026-08-04.
- CSP validator script keeps 4 config files in sync.
- Netlify auto-publish; scripted rollback drilled (GIV-329).
- Supabase region = Ireland (EU); intra-EEA, no SCCs.

---

## 2. What Still Blocks a Confident MVP

Merged view of GIV-123's launch gates and the GIV-837 audit's PARTIAL / BROKEN / BLOCKED
findings. Every item below has a named owner and unblock action.

### 2.1 Launch-blocking (🔴 — cannot GA without)

| # | Item | Owner | Unblock action |
|---|---|---|---|
| L1 | **GIV-842 — QA live audit round 2** (8/27 audit surfaces are BLOCKED on credentials: prod donor/charity/admin accounts, funded wallet, Helcim sandbox, backend visibility). | CEO | Deliver creds via secure channel; QA re-runs live surfaces #1, #2, #3, #6, #7, #10, plus #23 backend verification. Currently `in_review` on board. |
| L2 | **Contact page 404** (audit finding #26, plans/GIV-512). No `/contact-us` route in webapp; corresponding docs page not committed to `give-protocol-docs`. Kills the general-audience "get help" comfort gap. | CMO → Education Lead `da0f18af` | Commit `plans/GIV-512-contact-us-page.md` content into docs repo at `_pages/help-center/need-help.md` and update nav. |
| L3 | **Prod bundle has ZERO donation-contract addresses baked in — for ANY chain, including Base** (GIV-870 audit 2026-08-06). Selector filters to chains with `VITE_*_DONATION_ADDRESS`; without env vars set in Netlify prod, crypto donations are dark on every EVM mainnet in the live bundle. Base has the full deployed contract suite on-chain (2026-04-20); Ethereum / Arbitrum / Polygon / Avalanche have **zero** deployments (and no hardhat network entries) — plus CSP blocks their RPC hosts. | CEO (env), CTO (audit) | **NEW GATE — GIV-884 (CEO, critical):** set 5 `VITE_BASE_*` vars in Netlify prod + redeploy so "live on Base" is truthful. Follow-on: GIV-882 (Engineer — explorer verification of Base implementations); GIV-883 (QA — Base Cypress happy-path). |

### 2.2 Fortification needed before scale (🟡)

| # | Item | Owner | Action |
|---|---|---|---|
| F1 | **Safe + Institutional charity wallet flows are stubs** (audit finding #13). Only self-signer path works. Any charity requesting Gnosis Safe or institutional custody hits a stub. | Engineer | Complete `SafeSetupFlow.tsx` and `InstitutionalSetupFlow.tsx`; both have test-file TODOs. |
| F2 | **Admin Donation Monitoring volume chart missing** (audit finding #17). Page renders filter + table but no chart component (no recharts import). | Engineer / CPO decide | Either add chart to `AdminDonationMonitoring.tsx` or explicitly descope the spec. |
| F3 | **Crypto donation Art. 20 export coverage uncertain** (audit finding #22 / GIV-419). Frontend calls `requestDataExport()` opaquely; on-chain tx hashes may not be included. | Backend owner | Confirm backend export includes on-chain donation records; open GIV-419 follow-up if gapped. |
| F4 | **GDPR erasure cron liveness** (audit finding #23). Logic is in `give-protocol-backend` Deno edge function; nightly-run status not visible from webapp. | Backend owner | Publish last-N-run status to admin health surface (Reports / Platform Health tab) or paste last week's logs into GIV-63 issue. |
| F5 | **Help-center `/help-center/*` link audit** (audit finding #25). One 404 known-fixed; other paths not swept. | Docs Lead `da0f18af` | Run a link-checker on the Jekyll docs; open per-link fixes. |
| F6 | **Team page absent** (audit finding #27). No `Team.tsx`, no `/team` route. | CPO | Decide: create Team page, add team section to About, or explicitly accept as-is. Not launch-blocking. |

### 2.3 Explicitly not v1 (guardrails from GIV-123)

- Non-US charity registry ingestion (data model still US-EIN internally).
- Volo Index AI assessment engine (separate product `voloindex.org`).
- Sentry Phase B (session replay + tracing).
- Minors flow beyond 16+ self-attestation (CEO-set policy).

---

## 3. Moonbeam Removal + Multi-Chain Fortification

Board direction: **remove Moonbeam accommodation, fortify Base + the four
GIV-790 chains** (Ethereum, Arbitrum, Polygon, Avalanche) + Optimism.

**Launch scope revision (2026-08-06, per GIV-870 audit):** Base is the only chain with
deployed contracts and the only chain the launch bundle can truthfully claim. External
messaging = **"Live on Base."** The GIV-785 4-chain board commitment survives as a
**post-launch v1.x wave plan**: Optimism first (config is deploy-ready), then Ethereum
/ Arbitrum / Polygon / Avalanche as contract deploys land + CSP allowances open. CPO
recommendation: endorse this pivot in the board confirmation; do not defend a 6-chain
launch claim the code cannot back.

### 3.1 Scope of the Moonbeam surface today

A repo-wide grep for `moonbeam|moonbase|glmr` hits **93 files, 470 lines**. It touches
production code, tests, edge functions, config, and docs. Concentrations:

**Config**
- `src/config/env.ts` (lines 46, 51, 58–65, 91–99, 123–126): `NETWORK` default
  `"moonbase"`; `NETWORK_ENDPOINT` default `wss://wss.api.moonbase.moonbeam.network`;
  `VITE_MOONBASE` and `VITE_MOONBEAM` prefixes; **legacy `VITE_*_CONTRACT_ADDRESS`
  fallback exists only for chainId 1287**.
- `src/config/chains/evm.ts` (lines 16, 22, 64–77, 136–149, 201, 213): MOONBEAM (1284) +
  MOONBASE (1287) chain configs; both listed in `SUPPORTED_EVM_CHAIN_IDS` /
  `TESTNET_EVM_CHAIN_IDS`.
- `src/config/chains/polkadot.ts` (215 lines total): entire Polkadot/Kusama/parachain
  ecosystem file (Polkadot, Kusama, Westend, Rococo, Moonbeam-parachain, Moonriver).
- `src/config/chainlink.ts`, `src/config/tokens.ts`, `src/config/contracts.ts`: GLMR
  price feed + token entries.

**Server + edge functions (critical)**
- `server.js` lines 110–123: `moonbeam` and `moonbase` RPC URL branches.
- `supabase/functions/wallet-designation-recheck/index.ts`: hardcoded
  `MOONBASE_RPC_URL = "https://rpc.api.moonbase.moonbeam.network"`.
- `supabase/functions/wallet-designation-submit/index.ts`: hardcoded
  `MOONBASE_CHAIN_ID = 1287` + `MOONBASE_RPC_URL`, used across 12+ lines including the
  attestation payload. **⚠ This is the charity wallet designation attestation used by
  the GIV-286/287/288/289 flow. Removing the Moonbase hardcode without a Base-mainnet
  replacement will BREAK charity wallet setup.** This is not a mechanical rename —
  the RPC calls, chain ID stored in DB rows, and signature payload chainId all move.

**UI**
- `src/components/Wallet/WalletDropdown.tsx` line 250–259: GLMR balance rendering.
- `src/components/Wallet/NetworkSelector.tsx` lines 17, 23: `moonbeam` / `moonbase`
  icon paths.
- `src/components/volunteer/VolunteerVerificationCard.tsx`, `ApplicationAcceptance.tsx`,
  `VolunteerHoursVerification.tsx`: default network `"moonbase"` for explorer URL
  builders — must default to Base.
- `src/components/admin/*`: several forms reference Moonbeam in copy and defaults.

**Package deps**
- `package.json` has `@polkadot/api`, `@polkadot/extension-dapp`,
  `@polkadot/util-crypto`, `@polkadot/util`. If we drop Polkadot entirely with
  Moonbeam, these come out too (bundle-size win).

**Docs**
- README, SECURITY.md, `docs/dashboard.md`, `docs/wallet-connection.md`,
  `docs/CONTRACT_CHANGES.md`, `docs/setting-up-profile.md`, `docs/what-is-give-protocol.md`,
  `docs/organizational-wallet-setup.md`, `docs/personal-wallet-setup.md` all mention
  Moonbeam.

**Migrations (seed data)**
- `supabase/migrations/20260727000002_giv782_token_network_config_seed.sql` seeds
  `{"chainId":1284,"name":"Moonbeam"}` into admin token network config.

### 3.2 Delegation plan

This is a multi-day, three-repo effort that touches user-facing text and a live
attestation flow. Splitting so each child has a single owner and reviewer:

| Child | Owner | Scope |
|---|---|---|
| **CH1** — Moonbeam config + code strip (webapp) | CTO or Engineer | Remove MOONBEAM (1284) and MOONBASE (1287) from `src/config/chains/evm.ts`, `chainlink.ts`, `tokens.ts`, `contracts.ts`. Remove `moonbeam` + `moonbase` branches from `server.js`. Update `ENV.NETWORK` default and `ENV.NETWORK_ENDPOINT` default to Base. Delete the `useLegacyFallback` for chainId 1287 in `getChainContractAddresses()`. Strip Moonbeam references from admin forms, wallet UI (`WalletDropdown.tsx` GLMR block, `NetworkSelector.tsx` icons), volunteer explorer URL builders (default to Base). Update `.env.example`. |
| **CH2** — Rewrite charity wallet designation to Base (backend + webapp) | CTO | **CRITICAL.** Rewrite `supabase/functions/wallet-designation-submit/index.ts` and `wallet-designation-recheck/index.ts` to Base mainnet (8453) RPC + chainId. Coordinate with the backend team on any DB rows in `charity_wallets` / `wallet_designation_*` still keyed to `chain_id = 1287` — decide: migrate to 8453 or accept as historical. GIV-286/287/288/289 attestation must keep working end-to-end. Do NOT bundle with CH1. |
| **CH3** — Polkadot ecosystem removal (webapp) | Engineer | Delete `src/config/chains/polkadot.ts` and its `.test.ts`. Remove `@polkadot/*` deps from `package.json` after confirming no runtime importers remain (grep `@polkadot`). Adjust `src/config/chains/index.ts` and any type unions. Update tests. |
| **CH4** — Docs sweep (docs repo) | Docs Lead `da0f18af` | Update README, SECURITY.md, and `docs/*.md` to remove Moonbeam messaging; replace with Base + the 4 GIV-790 chains. Update `docs/what-is-give-protocol.md` product one-liner. |
| **CH5** — Non-Base contract deployment audit (contracts repo) | CTO | **DONE 2026-08-06 → GIV-870.** Result: only Base has deployed contracts (full suite, 2026-04-20). Ethereum / Arbitrum / Polygon / Avalanche have zero deployments; the latter four also lack hardhat network entries + CSP blocks their RPCs. Output produced 3 follow-ons: GIV-884 (CEO, critical — env vars in Netlify prod), GIV-882 (Engineer — explorer verification of deployed Base implementations), GIV-883 (QA — Base Cypress happy-path). See §2.1 L3 for the new gate that emerged. |

The 5 children fan out cleanly — CH1/CH3/CH4/CH5 are independent; CH2 is a hard
prerequisite for any prod deploy that touches the charity wallet designation flow.

### 3.3 Guardrails

- **Do not touch DB migrations retroactively.** The `20260727000002_giv782_token_network_config_seed.sql`
  Moonbeam row can be removed via a *new* migration; do not edit the historical file.
- **Test data may still contain chainId 1287.** Prefer allow-list validation over ripping
  values from test fixtures; strip only test files that were Moonbase-only in intent.
- **Coordinate with `give-protocol-contracts`.** Any Moonbeam contract shutdown
  announcement lives there, not in this repo.

---

## 4. Board Decisions Requested (rev 2 — 2026-08-06)

Rev-1 confirmation `226c2dc5` was superseded by the GIV-870 audit comment. Q1 and Q3
are now effectively answered by that comment; Q2, Q4, Q5 remain open + Q6 added.

**Answered by GIV-870 audit (2026-08-06):**
- **Q1 (MVP short list).** L1 + L2 still stand. L3 restructured: substrate = GIV-884
  (CEO, critical — env vars) + GIV-882 (Engineer, Base explorer verification) +
  GIV-883 (QA, Base Cypress). Board's dispatch of these three implicitly approves the
  restructured L3.
- **Q3 (chain launch scope).** Board recommendation adopted: launch = **Base only**;
  GIV-785 4-chain commitment becomes post-launch v1.x waves. CPO endorses.

**Still open — new confirmation to file:**
1. **Q2** — Confirm Moonbeam removal is intended in full, including dropping Polkadot
   ecosystem support (CH3/GIV-868 also drops Kusama / Westend / Rococo / Moonriver +
   `@polkadot/*` deps). Yes / No.
2. **Q4** — CEO to deliver prod donor / charity / admin creds + funded Base wallet +
   Helcim sandbox (GIV-842) **plus** Netlify env vars for GIV-884 (Base contract
   addresses). Confirm CEO owns both deliverables.
3. **Q5** — F6 Team page: build / add-to-About / accept-as-is.
4. **Q6 (new)** — Endorse public messaging **"Live on Base"** at launch; GIV-785
   chains messaged as v1.x waves (Optimism next). This aligns marketing to what the
   code actually supports and preserves the credibility of the 4-chain commitment as
   a *roadmap*, not a claim.

---

## 5. One-Paragraph Summary for the Board (rev 2)

Six weeks of shipping have closed the ground-truth gaps flagged in GIV-123: consent is
compliant, admin surfaces stopped silent-empty-ing, volunteer PII is encrypted,
country-agnostic charity copy is live, and the CI baseline is 3,958 tests / 0 failures.
The GIV-835 27-surface audit found **12 WORKS, 6 PARTIAL, 1 BROKEN, 8 BLOCKED** — with
the 8 BLOCKED items all waiting on live credentials (GIV-842). CH5/GIV-870
chain-deployment audit landed 2026-08-06 with a launch-critical finding: **the prod
Netlify env has NO donation-contract address for any chain — including Base — so crypto
donations are dark on prod today.** Base has the full contract suite deployed on-chain
(2026-04-20); the other GIV-785 chains have zero deployments plus CSP-blocked RPCs.
This resolves L3 into a new critical gate (**GIV-884**, CEO — set 5 `VITE_BASE_*` env
vars + redeploy) and pivots launch messaging to **"Live on Base"** with the four-chain
commitment shifting to a post-launch v1.x wave plan (Optimism first). Three things
still gate MVP: credentialed round-2 QA (**L1/GIV-842**), the contact page 404
(**L2/GIV-869**), and Base env vars + verification (**L3/GIV-884 + GIV-882 + GIV-883**).
On the Moonbeam ask: 93-file / 470-line surface split into 5 children — CH2 (charity
wallet edge-fn retarget) merged 2026-08-06 (`b1d4a0b6`); CH1/CH3/CH4 in progress; CH5
done. Everything else is either polish or explicitly post-v1.

---

**End of GIV-864 status doc.** Delegated children will be created as follow-up issues.
