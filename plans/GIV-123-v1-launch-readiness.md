# GIV-123 — Give Protocol v1 Launch Readiness

**Owner:** Head of Data · **Audience:** Board / CEO · **Date:** 2026-07-13
**Status:** Working document — reconciled against live code and issue board, not memory alone.

---

## 1. Purpose

Answer three board questions:

1. What is **not** done / not functional / not rollout-ready?
2. What needs **help, guidance, or documentation** before a general audience is comfortable?
3. What does a **high-quality v1** look like, and where is the gap from today?

This is a decision document, not a status brag. Every "Done" below is code- or
board-verified. Every "Gap" names an owner and an unblock action.

---

## 2. What a High-Quality v1 Looks Like

A general-audience donor or charity admin should be able to, with no hand-holding:

1. **Create an account** (email or Google), understand consent, and trust their data is safe.
2. **Find and trust a charity** — verification status is clear, legible, and country-neutral.
3. **Give** — fiat (Helcim) or crypto (Base mainnet) — and get a **receipt** they can use.
4. **See their impact** — donation history, tax documentation, exports.
5. **Volunteer** — apply, be managed, without their PII leaking to other users.
6. **Get help** — self-serve docs, a working contact path, no dead 404s.
7. **Exercise their rights** — export, erasure, consent withdrawal — and have the org
   legally able to honor them (GDPR/CCPA posture defensible).

v1 is not "every feature." v1 is **the giving loop working end-to-end, safely, for a
non-technical stranger, in a defensible legal posture.**

---

## 3. Gap Map — Target vs. Today

Legend: 🟢 Done / rollout-ready · 🟡 Functional but needs docs or polish · 🔴 Blocking gap

### 3.1 Core Giving Loop

| Capability                                    | State | Notes / Gap                                                                                                                                                                                                                                                                            |
| --------------------------------------------- | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Account creation (email + Google OAuth)       | 🟢    | Live. PASSWORD_RECOVERY / ResetPassword flow shipped (GIV-338).                                                                                                                                                                                                                        |
| Consent capture (English)                     | 🟢    | Board chose English-only consent (GIV-495, PRs #479/#482 merged). GA4 consent-gated.                                                                                                                                                                                                   |
| Charity discovery + verification badge        | 🟡    | Country-agnostic copy shipped (GIV-520/581): "Tax ID", "Verified nonprofit", "Sector code". US tax-deductibility tooltip preserved. Data model still US-EIN internally — non-US registry ingestion is a **separate workstream**, not v1-blocking but limits non-US charity onboarding. |
| Fiat donations (Helcim)                       | 🟢    | Live. postMessage origin validation in place.                                                                                                                                                                                                                                          |
| Crypto donations (Base mainnet, chain 8453)   | 🟡    | Wallet/Web3 live; **crypto donation data export still blocked (GIV-419)** — Art. 20 portability gap. Not a payment blocker, a data-rights blocker.                                                                                                                                     |
| Transactional email (receipts, notifications) | 🟢    | Resend, 12-locale templates wired (GIV-638, PR #495). US IRS Pub. 1771 receipt block verbatim-English.                                                                                                                                                                                 |
| Tax receipts / documentation                  | 🟡    | Fiat receipts fine. Confirm crypto-donation receipt parity before GA.                                                                                                                                                                                                                  |

### 3.2 Trust, Safety & Data Rights

| Capability                        | State      | Notes / Gap                                                                                                                                                                                                                                                               |
| --------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Volunteer PII isolation (RLS)     | 🔴         | **GIV-407: `volunteer_applications` RLS `USING(true)` exposes all applicant PII to any authenticated user.** PR opened, **awaiting merge**. This is the single most serious open data-safety item. Must ship before GA.                                                   |
| Data export (Art. 20 portability) | 🟡         | Covers volunteer_applications, legacy donations. **Crypto donations still uncovered (GIV-419).**                                                                                                                                                                          |
| Consent withdrawal / CMP          | 🟢         | Silktide removed; single CMP; GA4 + Sentry Phase-B gated.                                                                                                                                                                                                                 |
| Admin audit logging               | 🟢         | 5 admin read RPCs instrumented (GIV-413/414). Privacy.tsx §6 disclosed.                                                                                                                                                                                                   |
| RoPA (Art. 30 register)           | 🟡         | v1.5 live. **v1.6 delta in flight (GIV-651):** add GA4 activity, Sentry Phase-A activity, Art. 9 handling note.                                                                                                                                                           |
| Art. 9 special-category framing   | 🔴→counsel | Charity affiliation can imply religious/political belief (Recital 51). Framing drafted as purpose-based non-Art.9; **Art. 9(2) condition selection is a counsel decision (GIV-652)**, not an engineering one. Blocks a clean "we don't process special categories" claim. |
| Art. 27 EU/UK representative      | 🟢         | DataRep appointed (GIV-543). Complaints route to local SAs; no lead SA (no EU establishment).                                                                                                                                                                             |
| DPO determination                 | 🟢         | No DPO required (fails all 3 Art. 37(1) triggers; ≤1,000 subjects). **Caveat: re-assess at mainnet launch, not on 12-mo calendar** — launch can invalidate the ≤1,000 assumption (GIV-651).                                                                               |
| Privacy policy accuracy           | 🟡         | §5 processor list, §6/§7.1 retention reconciliation ongoing. GA4 retention value ("2 months") must be **set in GA4 console by a human** (CEO/founder — no agent has Google creds; GIV-476). Code asserts it; console must match or it's Art. 5(1)(e) drift.               |

### 3.3 Documentation & Guidance (the "general audience comfort" question)

| Surface                               | State | Gap                                                                                                                                                                                               |
| ------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Help center                           | 🟡    | `/help-center/need-help/` 404 fixed (docs#4). Other `/help-center/*` URLs are an **audit candidate** — dead links erode trust.                                                                    |
| Contact-us path                       | 🟡    | GIV-512 in flight. Single-inbox routing (`info@giveprotocol.io`, subject-tagged). Needs the page live + link-checked.                                                                             |
| Donor onboarding / "how giving works" | 🔴    | No evidence of a first-run donor walkthrough or crypto-giving primer for non-technical users. **This is the biggest general-audience-comfort gap.** A stranger arriving cold needs a guided path. |
| Charity onboarding guide              | 🟡    | Verification flow exists; a step-by-step "get your nonprofit listed" doc would reduce support load.                                                                                               |
| Volunteer manager guidance            | 🟡    | Volo Index is a separate product; core webapp volunteer flow needs a short applicant-facing explainer.                                                                                            |
| Security disclosure                   | 🟢    | `privacy@giveprotocol.io` (security@ never existed; SECURITY.md corrected, GIV-336).                                                                                                              |

### 3.4 Engineering Health / Release Confidence

| Item                 | State | Notes                                                                            |
| -------------------- | ----- | -------------------------------------------------------------------------------- |
| CI green on main     | 🟢    | Green since 2026-07-03 (GIV-405). 288 suites / 3909 tests / 0 failures baseline. |
| CSP config sync      | 🟢    | `scripts/validate-csp.mjs` enforces sync across 4 config files.                  |
| Deployment           | 🟢    | Netlify auto-publish on main; scripted rollback (Netlify CLI) drilled (GIV-329). |
| Supabase region      | 🟢    | Ireland (EU). Intra-EEA — no SCCs needed for core data.                          |
| PR EU-targeting gate | 🟢    | PR template 4-checkbox gate live (GIV-534).                                      |

---

## 4. The Short List — What Actually Blocks a Confident v1

Ranked. If we only fix these, we are launch-defensible:

1. 🔴 **GIV-407 — merge the volunteer PII RLS fix.** Live PII exposure. Non-negotiable.
2. 🔴 **Donor onboarding / crypto-giving guidance doc.** The general-audience comfort gap.
   No stranger should have to guess how to give crypto safely.
3. 🔴→counsel **GIV-652 — Art. 9(2) condition selection.** Counsel decision; unblocks a clean
   special-category posture and the RoPA v1.6 sign-off.
4. 🟡 **GIV-651 — RoPA v1.6 delta** (GA4 + Sentry Phase-A + Art. 9 note). Ties DPO/Art. 27
   re-assessment to mainnet launch. Head of Data owns; in flight.
5. 🟡 **GIV-419 — crypto-donation data export.** Closes the Art. 20 portability hole.
6. 🟡 **GIV-476 — human sets GA4 console retention to 2 months.** CEO/founder action; no agent
   has Google creds. Closes the Art. 5(1)(e) drift risk.
7. 🟡 **Help-center + contact-us link audit** (GIV-512 + `/help-center/*` sweep). Kill dead 404s.

---

## 5. What Is Explicitly NOT v1 (scope guardrails)

- Non-US charity registry ingestion (data model still US-EIN internally) — post-v1.
- Volo Index AI assessment engine — separate product, board decisions D1–D5 pending (GIV-542).
- Sentry Phase B (session replay + tracing + user identification) — consent-gated, post-launch.
- Minors flow beyond 16+ self-attestation gate — CEO-set policy; no parental-consent flow by design.

---

## 6. Recommended Board Decisions

1. **Approve GIV-407 merge as a launch gate** — nothing ships to GA until volunteer PII is isolated.
2. **Authorize a donor-onboarding guidance sprint** — smallest doc set that lets a stranger give
   confidently (fiat + crypto). Owner: CMO + Education/Docs Lead. This is the top comfort gap.
3. **Send GIV-652 to counsel now** — Art. 9(2) condition is legal, not engineering; it gates a
   clean privacy posture and RoPA v1.6.
4. **Confirm mainnet launch date** so DPO/Art. 27/≤1,000 re-assessment can be scheduled against it
   rather than a rolling 12-month calendar.
5. **Assign the GA4-console retention action to a human** (CEO/founder) — the only fix for GIV-476.

---

## 7. One-Paragraph Summary for the Board

The giving loop works end-to-end today: accounts, consent, fiat + crypto donations, receipts,
exports, and a defensible no-DPO/Art. 27-covered GDPR posture. Three things stand between us and a
confident general-audience v1: (1) **one live data-safety bug** — volunteer applicant PII is
readable by any logged-in user (GIV-407, fix awaiting merge); (2) **a documentation gap** — there is
no guided path for a non-technical stranger to give, especially crypto; and (3) **one counsel
decision** — the Art. 9(2) special-category condition (GIV-652), which unblocks a clean privacy
register (RoPA v1.6, GIV-651). Everything else is polish or explicitly post-v1. Fix those three and
we launch defensibly.
