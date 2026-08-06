# GIV-519 — Country-Agnostic Language Audit

**Owner:** CMO (00b6774b)
**Status:** Audit complete, engineering delegation pending
**Date:** 2026-06-16

## Problem

The product surface uses US-specific acronyms (EIN, IRS, 501(c)(3), NTEE) in
donor-facing copy. Give Protocol serves a global donor base; US-centric labels
imply the platform is US-only and create friction for non-US donors and
non-US charities discovering the platform.

Reporter highlighted `/admin/charity-requests` ("sort by EIN"), but the issue
is platform-wide.

## Scope of audit

User-facing English copy only. Internal variable names (`ein`, `formatEin`),
database columns, and the IRS BMF data source are out of scope — those are
implementation details that will evolve when the data layer is extended to
non-US charity registries (separate roadmap item).

## Findings

### A. EIN-labelled fields (6 surfaces)

| Surface | Current copy | i18n key |
|---|---|---|
| Admin → Charity Requests (header + caption + footer + page intro) | "EIN", "Charity requests by EIN", "unique EINs", "grouped by EIN" | `admin.charityRequests.ein`, etc. (en.ts L962–L972) |
| Admin → Charity Management (table column + inline label) | "EIN" | `admin.charity.colEin` (en.ts L931); inline string at `AdminCharityManagement.tsx:297` |
| Charity claim flow | "EIN" | `charity.claim.einLabel` (en.ts L1243) |
| Browse → Charity card | "EIN" | `browse.charity.einLabel` (en.ts L1414); inline at `ProjectCard.tsx:50` |
| Charity profile page (row + display + error) | "EIN", "We couldn't find a charity with this EIN." | `charity.profile.rowEin`, `charity.profile.einDisplay` (en.ts L1506, L1520); `CharityProfilePage.tsx:635` |
| Volunteer self-reported charity autocomplete | "Search charity registry by name or EIN…" | inline at `CharityOrgAutocomplete.tsx:128` |

### B. IRS / 501(c)(3) references (3 surfaces)

| Surface | Current copy | Location |
|---|---|---|
| Charity profile verified badge | "Verified 501(c)(3)" | `charity.profile.verified501c3` (en.ts L1503) |
| Charity profile unclaimed status | "Unclaimed — IRS data only" | `charity.profile.statusUnclaimed` (en.ts L1505) |
| Charity profile about card fallback | "IRS activity codes" (JSDoc + UI fallback) | `CharityProfilePage.tsx:417`, `561` |
| Charity profile 501(c)(3) display badge | "501(c)(3)" | `CharityProfilePage.tsx:324` |

### C. Already country-agnostic (no change needed)

- "State/Province" — already neutral (`organization.stateProvince`, `charity.vetting.state`)
- Currency display uses CurrencyContext + per-user locale, not hard-coded USD
- Country lists driven by `useCountries` hook

### D. Out of scope for this issue (separate workstreams)

- `formatDate` uses `toLocaleDateString("en-US", …)` on the admin page — this
  is date *formatting*, not a US label. Track as engineering polish if needed
  (use the user's locale via `useTranslation`).
- Internal data model only stores IRS BMF EINs; supporting UK Charity
  Commission / CRA Canada / ACNC Australia registries is a multi-quarter
  data-layer expansion. Not part of GIV-519.

## Replacement guide

Goal: country-agnostic labels that don't imply a specific jurisdiction, while
preserving US-specific legal precision where donors rely on it (tax
deductibility).

| Current US-centric term | Replacement | Rationale |
|---|---|---|
| **EIN** (as a field label) | **Tax ID** | Universally understood; matches the role of the identifier across jurisdictions. Where space allows, use "Tax ID (EIN)" so US users keep the familiar acronym. |
| "Search by … EIN" | "Search by name or tax ID" | Removes acronym; placeholder still discoverable. |
| "grouped by EIN" / "unique EINs" | "grouped by organization" / "unique organizations" | Avoids re-introducing the acronym in body copy. |
| **Verified 501(c)(3)** | **Verified nonprofit** (with US tooltip: "Registered 501(c)(3) — donations may be tax-deductible in the United States") | Keeps tax-status disclosure for US donors without making the badge US-only. |
| **Unclaimed — IRS data only** | **Unclaimed — public registry data only** | Same meaning; jurisdiction-neutral. |
| **IRS activity codes** | **Registry activity codes** | Same meaning; jurisdiction-neutral. |
| **501(c)(3)** standalone badge | **Registered nonprofit** | Same approach as above. |
| **NTEE code** | **Sector code** (NTEE remains as the value, e.g. "Sector code: B25") | NTEE is US-specific; labelling as "sector code" lets us substitute UK SIC / Canada CRA codes later without another copy migration. |
| **Ruling year** | **Registration year** | "Ruling year" is IRS-determination jargon. |

## Implementation notes for engineering

1. **i18n-first.** Every change goes through `src/i18n/resources/en.ts` per
   the project's i18n workflow. New keys must be registered with the English
   fallback in the `t()` call (CI key-validation enforces this).
2. **Translation backfill.** After en.ts changes land, the 11 non-English
   resource files (`es, de, fr, ja, zh-CN, zh-TW, th, vi, ko, ar, hi`) need
   regenerated translations. Batch this as the final PR in the chain so the
   translator only runs once.
3. **Tests.** Update snapshots/tests that assert the old strings:
   - `AdminCharityRequests.test.tsx`
   - `AdminCharityManagement.test.tsx`
   - `ClaimCharity.test.tsx`
   - `CharityProfilePage.test.tsx`
   - `ProjectCard.test.tsx`
   - `CharityOrgAutocomplete.test.tsx`
4. **Inline strings → t().** Three call sites still hard-code "EIN" instead
   of using `t()`. Move them to i18n keys as part of this change:
   - `AdminCharityManagement.tsx:297`
   - `ProjectCard.tsx:50`
   - `CharityOrgAutocomplete.tsx:128`
5. **Tooltip for "Verified nonprofit".** Add an info icon next to the badge
   that surfaces the US-specific 501(c)(3) detail to users in the US.
   Engineering may scope this as a follow-up if it grows the PR materially.

## Suggested PR shape

- **PR 1 (engineering):** en.ts key additions/edits + component updates + test
  updates + inline → t() conversions. Single PR keeps the user-visible change
  atomic.
- **PR 2 (translation):** non-English resource regeneration for the touched
  keys.

## Brand-safety check

No PII, no new sub-processors, no privacy-policy impact. Copy stays within
existing SOUL.md voice (clear, donor-centric, jargon-light). Approved by CMO.

## Out-of-scope follow-ups (file separately if/when prioritized)

- Data-model expansion to non-US charity registries.
- Admin-page date formatting to follow user locale instead of `en-US`.
- Audit of marketing site (give-protocol-docs) for the same US-centric language.
