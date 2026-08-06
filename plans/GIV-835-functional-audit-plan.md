# GIV-835 — End-to-End Functional Audit Plan

**Owner:** CPO · **Executor:** QA · **Audience:** Board / CTO / Engineers
**Date:** 2026-08-04 · **Status:** Plan — awaiting QA execution

---

## 1. Purpose

The board asked: "run through all functionality that is still not functional and
determine next steps for the CTO and the developers." This is a fresh end-to-end
validation pass after a heavy shipping quarter (GIV-786 admin panels, GIV-790
multi-chain, GIV-799 Ethereum gas UX, GIV-654/655 Art. 9 consent, GIV-782 token
settings, Volo Index prod launch).

Deliverable: a triage table classifying every listed surface as **WORKS /
PARTIAL / BROKEN / BLOCKED**, with repro steps for anything not WORKS, so the
CTO can slot fixes into the current sprint without further discovery.

## 2. Scope & Non-Goals

**In scope:** live prod behavior (giveprotocol.io) across the surfaces listed
in §4, with staging fallback where prod cannot be exercised (empty data,
missing test accounts).

**Out of scope:**

- Performance / load testing (separate workstream).
- Security testing (owned by ISO — GIV-538 series).
- Docs QA of `give-protocol-docs` Jekyll site (delegated separately).
- Volo Index (`voloindex.org`) — separate repo, tracked under GIV-796.

## 3. Method

For each item:

1. **Execute** the flow as a fresh user (real prod account preferred).
2. **Record** verdict: WORKS / PARTIAL / BROKEN / BLOCKED (+ 1-sentence why).
3. If **BROKEN or PARTIAL**: capture repro (steps, expected vs actual,
   console/network error, screenshot path).
4. If **BLOCKED**: state the blocker (needs seed data, needs admin creds,
   needs specific wallet, etc.) — do NOT call the item BROKEN.
5. Note the last-known-shipping issue for context (GIV-###).

Post findings back on this issue (GIV-835) as a single comment using the
template in §5. Do not open per-bug tickets yourself — the CPO will triage
into child issues so the CTO gets a single dispatch surface.

## 4. Surfaces to Exercise

Priority reflects launch impact × recent code churn. Aim for P0 + P1
completion this heartbeat; P2 next round if time permits.

### P0 — Core Giving Loop (must-work for v1)

| # | Surface | Recent change / risk |
|---|---|---|
| 1 | Email signup + email verification link | Auth callback (GIV-246) |
| 2 | Google OAuth signup + login | — |
| 3 | Passkey signup + login | GIV-180, GIV-185, GIV-187 |
| 4 | Consent modal appears + Art. 9 donation-consent checkbox blocks submit until checked | GIV-654 / GIV-655 |
| 5 | Browse charities → filter → charity detail | Country-agnostic copy GIV-520/581 |
| 6 | Fiat donation via Helcim → receipt email arrives | GIV-162, GIV-638 |
| 7 | Crypto donation on Base mainnet → tx confirms → receipt | Baseline |
| 8 | Crypto donation on Ethereum mainnet — gas estimate displays, high-gas warning fires under floor | GIV-799 |
| 9 | Chain selector shows Arbitrum / Polygon / Avalanche, wallet switches network | GIV-790 |
| 10 | Post-donation: donation appears in donor history | GIV-111 |

### P1 — Portal & Admin (revenue + operations)

| # | Surface | Recent change / risk |
|---|---|---|
| 11 | Charity onboarding checklist auto-completes as steps done (logo, wallet, etc.) | GIV-114, GIV-211 |
| 12 | Charity logo + banner upload → renders in browse + portal header | GIV-201/202/210 |
| 13 | Charity wallet setup — all 3 paths (self, delegate, Safe) | GIV-286/287/288/289 |
| 14 | Volunteer application submit — applicant PII NOT readable by other users | GIV-407 (must remain fixed) |
| 15 | Volunteer hours entry + leaderboard behavior | GIV-121 policy |
| 16 | Admin: charity list loads (17 rows), approve/reject/suspend actions fire | GIV-86, GIV-721 |
| 17 | Admin: donation monitoring page + volume chart | GIV-88, GIV-762 |
| 18 | Admin: reports page all tabs render | GIV-94 |
| 19 | Admin: system settings + audit log viewer + token & network settings | GIV-96, GIV-782 |
| 20 | Admin: content moderation queue actions | GIV-95 |
| 21 | Admin: RPC error surfaces as visible error panel (not silent empty) — force an error to confirm | GIV-786 |

### P2 — Rights, i18n, Marketing

| # | Surface | Recent change / risk |
|---|---|---|
| 22 | GDPR data export (Art. 20) covers legacy donations + volunteer + charity_wallets | GIV-61, GIV-314, GIV-419 (crypto donations may still be gapped) |
| 23 | GDPR erasure (nightly cron) — verify last run succeeded | GIV-63 |
| 24 | Language switcher toggles all 12 locales, persists across reload | GIV-258 |
| 25 | Help center — spot-check 6 links, none 404 | Prior fix docs#4 |
| 26 | Contact-us page shipped + form submits to info@ | GIV-512 (may not be shipped yet — confirm) |
| 27 | Landing / About / Team pages render, no console errors | — |

## 5. Report Template (post as one comment on GIV-835)

```
## GIV-835 QA Audit — Findings (Round 1)

Env tested: prod (giveprotocol.io) — staging where noted
Accounts used: <donor email>, <charity email>, <admin email>

### Verdict Summary
- WORKS: N/27
- PARTIAL: N
- BROKEN: N
- BLOCKED (test data/creds): N

### Detail
| # | Surface | Verdict | Notes / repro |
|---|---|---|---|
| 1 | Email signup | WORKS |  |
| 2 | Google OAuth | BROKEN | Click "Sign in with Google" → redirect loops back to /auth. Console: `nonce mismatch`. Ref GIV-XXX. |
| 3 | ... | ... | ... |

### Environmental Blockers
List anything QA could not exercise without help (e.g., no Avalanche testnet wallet, admin creds not shared, Helcim sandbox declined).

### Recommended Next Steps
QA's raw suggestion — CPO/CTO make the final call.
```

## 6. Turnaround

- QA: single comment on GIV-835 within this or next heartbeat.
- CPO: triage findings into per-item child issues within 1 heartbeat of QA
  comment; each child scoped to a single owner (CTO / Engineer / Engineer 2)
  with an unblock action.
- CTO: receives the triage batch as a single dispatch on GIV-835.

## 7. Explicitly NOT Being Retested

Already accepted-closed within the last 4 weeks; no evidence they regressed.
Re-open only if surfaced by QA during Round 1:

- Silktide removal / single CMP (GIV-375 series — DONE 2026-07-xx)
- Admin RPC dedup + PGRST203 (GIV-766/767/768 — QA PASSED 2026-07-29)
- Admin dashboard e2e (GIV-756 — DONE)
- Charity wallets GDPR erasure (GIV-314/315 — DONE)
- ASV/PCI compliance surfaces (owned by ISO — GIV-538 series)

---

**End of plan.** QA to execute; report to GIV-835 comments.
