# Pre-Launch Checklist — GDPR Art. 3(2) Targeting-Trigger Monitor

**Purpose:** A standing, hard-and-evident governance control that monitors for events triggering the GDPR / UK GDPR **Art. 27 representative** obligation. This is not a one-time check — it is enforced at PR review (see [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md)), at the pre-launch gate for each property, and at quarterly compliance review.

## Why this exists (legal basis)

GDPR **Art. 3(2)** turns on **targeting** — whether the Foundation *directs* its service at EU data subjects — **not** on the number of EU users or the mere accessibility of the website. The targeting criterion derives from CJEU *Pammer / Hotel Alpenhof* (C-585/08 & C-144/09) as imported into **EDPB Guidelines 3/2018 on territorial scope, §2.1**. Indicative factors: language, currency, EU TLD, EU marketing/outreach, mention of EU users, EU-directed delivery/payment.

If a Tier-1 trigger is met, the service is being directed at EU data subjects → Art. 3(2) applies → an **EU Art. 27 representative** (and a **UK Art. 27 representative** for UK GDPR) must be appointed **before the triggering feature goes live**.

## Properties covered by the pre-launch gate

Run the Tier-1 checklist below before any public launch of:

- `giveprotocol.io`
- `pacioli.io`
- `commonry.app`

## TIER 1 — Affirmative targeting triggers

**ANY one of these = Art. 3(2) reassessment + appoint EU/UK Art. 27 reps BEFORE the feature goes live.** These are bright-line and objectively observable — no judgement call required.

- [ ] **1. Language** — the site/app/emails are offered in any **EU-member-state official language other than English** (e.g., DE, FR, ES, IT, NL, PL, PT, …). *(English alone is ambiguous — also US/UK/IE.)*
- [ ] **2. Currency / payments** — donations accepted or **displayed in EUR** or any other EU currency, or EU payment rails enabled (SEPA, iDEAL, Bancontact, Giropay).
- [ ] **3. Domain** — acquisition/use of an **EU ccTLD** (`.eu`, `.de`, `.fr`, …) or EU-geotargeted domains.
- [ ] **4. Marketing** — any paid ads, SEO, social, or email outreach **geo-targeted to EU member states**; EU influencer/partner campaigns.
- [ ] **5. Charity scope** — onboarding/verifying **EU-established charities** or enabling EU beneficiary organizations.
- [ ] **6. Copy / positioning** — marketing or product copy that **references EU users/markets** ("available in Europe", EU testimonials, EU compliance used as a selling point).
- [ ] **7. Operational presence** — EU-specific **contact details** (EU phone/mailing address), or active **solicitation of EU donors** at events.

## TIER 2 — Behavioral indicators (monitor; assess in aggregate, not auto-trigger)

- [ ] **8. Sustained EU inflow the org chooses to cultivate** — non-trivial EU traffic/donations that the Foundation *becomes aware of and decides to serve/court* (vs. organic, unsolicited, unanticipated). Cultivation tips toward targeting.
- [ ] **9. EU data residency framed as a user-facing feature** — EU hosting alone is NOT targeting (it is a processing/security choice), but pairing it with EU-facing features is corroborative.

## Action when a Tier-1 trigger fires

1. Reassess Art. 3(2) / UK Art. 3(2) applicability.
2. **Procure EU (and UK) Art. 27 representatives before the triggering feature goes live.**
3. Re-activate the Data Breach Response Procedure §5 multi-supervisory-authority + representative routing.
4. Populate the representative disclosure in `Privacy.tsx` (§13/§8) and the RoPA representative field.

## Enforcement points

- **PR-template checkbox** — any PR touching i18n/locales, currency/payments, domains, or charity-onboarding scope must answer the Tier-1 question (see PR template).
- **Pre-launch gate** — run the Tier-1 checklist before public launch of each property above.
- **Marketing-approval gate** — every campaign approval confirms no EU geo-targeting (or accepts the trigger).
- **Quarterly compliance review** — standing re-run of Tier-1 + Tier-2 aggregate.

---
*Standing control owned by the Head of Data. The authoritative trigger list and legal rationale live in the `targeting-trigger-monitor` governance document; this file is the engineering-facing mirror enforced in the repo.*
