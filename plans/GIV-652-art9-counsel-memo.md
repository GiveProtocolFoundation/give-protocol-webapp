# Counsel Decision Memorandum — Art. 9 Framing for Donor→Charity Affiliation (GIV-652)

**Parent:** GIV-651 (RoPA v1.6 delta, Item 3) → grandparent GIV-123 (DPO determination).
**Prepared by:** CEO (outside-counsel liaison; no dedicated counsel agent — pattern per GIV-374/GIV-430).
**Date:** 2026-07-12
**Decision required:** Select the Art. 9 framing for donation records that may indirectly reveal religious/political/philosophical affiliation (Recital 51) via the donor's chosen beneficiary charity. RoPA v1.6 sign-off is gated on this.

---

## 1. The question

A donation record links an identified donor to a named charity. Where the charity is religious, political, or philosophical in character, the record is *liable indirectly to reveal* a Recital 51 special category. Two framings were tabled by Head of Data (plans/GIV-651-ropa-v1.6-delta.md, Item 3):

- **Option A — purpose-based non-Art.9:** processing purpose is transaction facilitation; no inference, segmentation, targeting, or profiling keyed on affiliation; therefore Art. 9 is not engaged.
- **Option B — Art. 9 engaged; rely on Art. 9(2)(a) explicit consent**, given the deliberate affirmative donation act.

## 2. Controlling authority — why pure Option A is doctrinally exposed

1. **CJEU C-184/20, *OT v Vyriausioji tarnybinės etikos komisija* (1 Aug 2022):** the Court held that data *liable indirectly to disclose* a special category (there, sexual orientation via a spouse's name in a public declaration) **constitutes Art. 9 processing**, expressly rejecting a narrow reading confined to intrinsically sensitive data. The test is **content-based** ("liable to reveal"), not purpose-based.
2. **CJEU C-252/21, *Meta Platforms v Bundeskartellamt* (4 July 2023):** collection of data about visits to websites/apps relating to sensitive topics was held capable of constituting Art. 9 processing even absent any controller intent to infer the sensitive attribute.
3. **Recital 51 + EDPB posture:** the EDPB has consistently tracked the CJEU's broad reading post-2022. The pre-2022 "inference-purpose" approach (still visible in some legacy ICO guidance) is the weaker position in the EU; and we owe compliance in both EU and UK (DataRep EU + UK reps appointed, GIV-543).

**Consequence:** Option A as drafted ("we do not process this as Art. 9 data because our purpose is transaction facilitation") is contrary to the current CJEU line. A supervisory authority applying C-184/20 would likely find Art. 9 *engaged* for donations to affiliation-revealing charities, at which point a controller with no Art. 9(2) condition on file has a gap in its Art. 30 record and its lawfulness analysis.

Purpose still matters — but as **mitigation and safeguard evidence**, not as the gateway test.

## 3. Art. 9(2) condition analysis

| Condition | Fit | Notes |
|---|---|---|
| **9(2)(a) explicit consent** | **Best fit** | The donation is a deliberate, affirmative, specific act by the data subject directed at the named charity. Explicitness can be satisfied by an express statement presented at donation confirmation (EDPB Guidelines 05/2020 §§93–94: explicit = express statement; a clear confirmation of a written statement suffices; a separate checkbox is one method, not the only one). |
| 9(2)(d) nonprofit body, members/contacts | Poor fit | Applies to the *foundation/charity's own* processing of its members; Give Protocol is an intermediary platform, and the condition bars disclosure outside the body without consent. |
| 9(2)(e) manifestly made public | Poor fit / rejected | On-chain visibility of a wallet-level donation does not make the *identified donor's* affiliation "manifestly public"; EDPB reads (e) narrowly and pseudonymous chain data ≠ deliberate public self-disclosure of affiliation. Do not rely on it. |
| 9(2)(f) legal claims | N/A for routine processing | Retain as ancillary basis for dispute/defence retention only. |

**Freely-given concern (Art. 7(4) bundling):** conditioning the donation on consent to process the donation record is acceptable because processing the donor→charity record is **objectively necessary to execute the very transaction the data subject requests**. This is not tying consent to unrelated processing; EDPB 05/2020 §§26–31 tolerates conditionality where processing is strictly necessary to deliver the requested service. Withdrawal maps to the existing erasure/objection pathway (with Art. 17(3) carve-outs for legal-obligation retention, e.g., receipts/accounting).

## 4. Recommended disposition — **Option B, layered**

Adopt for RoPA v1.6:

1. **Operative condition: Art. 9(2)(a) explicit consent**, captured at donation confirmation.
2. **Record the layered position** in the Art. 9 handling note: (i) primary analysis — Art. 9 is engaged only insofar as a donation record is liable indirectly to reveal affiliation (C-184/20 standard); (ii) condition relied on — Art. 9(2)(a); (iii) **Option A's substance is retained verbatim as safeguards**: purpose limited to transaction facilitation; no segmentation, targeting, or analytics keyed on inferred affiliation; access-controlled records; `privacy-export` decrypts PII only for the requesting subject; no profiling pipeline consumes charity-choice as a sensitivity signal.
3. **Fallback defence noted:** should a forum apply the older inference-purpose approach (e.g., legacy UK analysis), the Option A rationale stands as an independent alternative position. Recording both is standard belt-and-braces and costs nothing in the RoPA.

## 5. Consent-capture mechanics (engineering scope, per issue ask #2)

Minimum viable, to be scoped by engineering once confirmed:

1. **Express statement at donation confirmation** (i18n key, all 12 locales — Art. 13 language pattern per GIV-495/497 board decision applies; note board previously chose English-only consent text for the volunteer flow — flag whether that decision extends here):
   > "I understand my donation record links me to [Charity]. Where that could indicate a religious, political, or philosophical affiliation, I explicitly consent to Give Protocol processing this record to complete and administer my donation."
2. **Affirmative act:** proceed-button confirmation of the displayed statement is sufficient for explicitness (EDPB 05/2020 §93); a pre-donation unticked checkbox is the more conservative variant — engineering may choose either, counsel accepts both.
3. **Consent record:** log `{user_id, timestamp, consent_text_version, locale}` server-side at donation write time. Versioned consent text.
4. **Separability:** distinct from marketing/analytics consents (no bundling with the CMP categories).
5. **Withdrawal path:** existing privacy-export / erasure request flow; document Art. 17(3)(b) retention carve-out for tax/accounting records.
6. **No retro-fit requirement:** apply prospectively from deployment; historical records remain covered by the layered position §4(2)–(3) plus safeguards (proportionality rationale to be recorded in RoPA note).

## 6. RoPA v1.6 effect

- Item 3 handling note = §4 layered position above (replaces the "purpose-based non-Art.9" controller position as primary framing).
- Items 1, 2, 4 already signed off (Head of Data) — fold in unchanged.
- Version bumps v1.5 → v1.6 on board confirmation of this memorandum.
- Engineering consent-capture work = new child issue after confirmation (owner: CTO/engineering; not gating the RoPA bump itself — the RoPA records the condition and its implementation plan).

## 7. Confirmation sought

Board (as human counsel relay) to confirm:
1. **Framing = Option B layered** (§4), or direct otherwise.
2. Consent-capture mechanics (§5) acceptable as the engineering scope baseline.
