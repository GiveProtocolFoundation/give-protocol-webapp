# Pre-Launch Checklist — GDPR Art. 3(2) Targeting-Trigger Monitor

**Purpose:** A standing, hard-and-evident governance control that monitors for events triggering the GDPR / UK GDPR **Art. 27 representative** obligation. This is not a one-time check — it is enforced at PR review (see [`.github/PULL_REQUEST_TEMPLATE.md`](../.github/PULL_REQUEST_TEMPLATE.md)), at the pre-launch gate for each property, and at quarterly compliance review.

## Why this exists (legal basis)

GDPR **Art. 3(2)(a)** turns on **targeting** — whether the Foundation _envisages directing_ its service at EU data subjects — **not** on the number of EU users or the mere accessibility of the website. The targeting criterion derives from CJEU _Pammer / Hotel Alpenhof_ (C-585/08 & C-144/09) as imported into **EDPB Guidelines 3/2018 on territorial scope, §2.1**. (A separate limb, Art. 3(2)(b), covers **monitoring the behaviour** of EU data subjects.)

**No single factor is dispositive.** Targeting is assessed on the **totality of factors evidencing an intention to direct services at the EU**. Critically, a factor that is **equally explained by a worldwide audience is not probative of EU-specific targeting** — e.g., offering a globally-spoken language that happens to be an EU official language (Spanish → Latin America; French → francophone Africa/Canada; German → Switzerland/Namibia), or listing EUR as one option within a broad multi-currency picker, does **not** by itself indicate EU targeting. EDPB §2.1 is explicit that mere site accessibility, and use of a language/currency generally usable outside the EU, are insufficient.

A **strong (EU-specific) signal** below means: **STOP — escalate for an Art. 3(2) / Art. 27 reassessment** before the feature goes live. It does **not** automatically mean Art. 3(2) applies — it means the question must be re-evaluated by the Head of Data / counsel on the full facts.

## Properties covered by the pre-launch gate

Run the checklist below before any public launch of:

- `giveprotocol.io`
- `pacioli.io`
- `commonry.app`

## STRONG signals — EU-specific (any one = STOP + escalate for reassessment)

**These point specifically at the EU and are not readily explained by a global audience.** Any one fires a mandatory Art. 3(2)/Art. 27 reassessment before launch.

- [ ] **1. EU-specific / minority official language** — UI, app, or emails offered in an official language of an EU member state with **no large non-EU speaker base** (e.g., Dutch, Polish, Greek, Czech, Hungarian, Finnish, Swedish, Croatian, Slovak, Slovenian, Estonian, Latvian, Lithuanian, Maltese, Bulgarian, Romanian, Danish, …). _(Globally-spoken EU-official languages — ES, DE, FR, PT, EN — are weak/equivocal; see Tier 2.)_
- [ ] **2. EU payment rail or EU-default currency** — enabling an **EU-specific payment method** (SEPA, iDEAL, Bancontact, Giropay) **or** setting **EUR as the default/primary currency for EU-geolocated users**. _(EUR offered as one option in a worldwide multi-currency list is weak/equivocal; see Tier 2.)_
- [ ] **3. EU domain** — acquisition/use of an **EU ccTLD** (`.eu`, `.de`, `.fr`, …) or EU-geotargeted domains.
- [ ] **4. EU-geotargeted marketing** — paid ads, SEO, social, or email outreach **geo-targeted to EU member states**; EU influencer/partner campaigns.
- [ ] **5. EU charity scope** — onboarding/verifying **EU-established charities** or enabling EU beneficiary organizations.
- [ ] **6. EU-referencing copy / positioning** — marketing or product copy that **references EU users/markets** ("available in Europe", EU testimonials, EU compliance used as a selling point).
- [ ] **7. EU operational presence** — EU-specific **contact details** (EU phone/mailing address), or active **solicitation of EU donors** at events.

## WEAK / equivocal indicators — assess in aggregate, do NOT auto-trigger

These are consistent with a global audience and are **not** probative on their own. Monitor them; weigh them only in combination with strong signals or evidence of EU-directed intent.

- [ ] **8. Globally-spoken EU-official language** — offering ES, DE, FR, PT (or EN) in the UI/emails. Equivocal: these languages have large non-EU populations. _(This is the current state of the platform and, by itself, is **not** a targeting trigger.)_
- [ ] **9. EUR within a worldwide multi-currency offering** — EUR available as one of many global currencies (alongside, e.g., GBP, CHF, USD, JPY, INR, NGN). Equivocal: a global donation posture, not EU-directed.
- [ ] **10. Sustained EU inflow the org chooses to cultivate** — non-trivial EU traffic/donations that the Foundation _becomes aware of and decides to serve/court_ (vs. organic, unsolicited, unanticipated). Cultivation tips toward targeting.
- [ ] **11. EU data residency framed as a user-facing feature** — EU hosting alone is NOT targeting (it is a processing/security choice), but pairing it with EU-facing features is corroborative.

## Action when a STRONG signal fires

1. **STOP** — do not ship/launch the triggering change until assessed.
2. Reassess Art. 3(2)(a) targeting / Art. 3(2)(b) monitoring and UK GDPR applicability on the full facts (Head of Data + counsel).
3. If the reassessment concludes Art. 3(2) applies: **procure EU (and UK) Art. 27 representatives before the triggering feature goes live.**
4. Re-activate the Data Breach Response Procedure §5 multi-supervisory-authority + representative routing.
5. Populate the representative disclosure in `Privacy.tsx` (§13/§8) and the RoPA representative field.

## Enforcement points

- **PR-template checkbox** — any PR touching i18n/locales, currency/payments, domains, or charity-onboarding scope must answer the targeting-trigger question (see PR template).
- **Pre-launch gate** — run this checklist before public launch of each property above.
- **Marketing-approval gate** — every campaign approval confirms no EU geo-targeting (or escalates).
- **Quarterly compliance review** — standing re-run of strong + weak indicators in aggregate.

---

_Standing control owned by the Head of Data. The authoritative trigger list and legal rationale live in the `targeting-trigger-monitor` governance document; this file is the engineering-facing mirror enforced in the repo._
