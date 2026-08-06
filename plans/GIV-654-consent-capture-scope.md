# GIV-654 — Art. 9(2)(a) Explicit-Consent Capture at Donation Confirmation

**CTO scoping doc — counsel-accepted baseline per GIV-652 memo §5 (board confirmation c7fcdc8d, 2026-07-13T02:40Z).**
Implementation delegated to Engineering via child issue (see GIV-654 thread).

## 1. Legal contract (fixed — do not renegotiate in the PR)

- Basis: GDPR Art. 9(2)(a) explicit consent, captured at donation confirmation.
- Consent statement (v1, English):
  > "I understand my donation record links me to {{charity}}. Where that could indicate a religious, political, or philosophical affiliation, I explicitly consent to Give Protocol processing this record to complete and administer my donation."
- Separability: distinct from marketing/analytics CMP categories. Do NOT route through the consent CMP (`useGA4Loader` / consent categories). This lives inline in the donation flow only.
- Prospective-only: no backfill of historical donation records. No migration touches existing rows.
- Withdrawal: handled by the existing privacy-export / erasure flow; Art. 17(3)(b) tax/accounting retention carve-out is a documentation item (Privacy.tsx cross-check with HoD), not new code.

## 2. CTO engineering decisions

### 2.1 Affirmative act: **unticked checkbox** (conservative variant)

Counsel accepted either proceed-button confirmation (EDPB 05/2020 §93) or a checkbox. We choose the checkbox because:

- `FiatDonationForm.tsx` already has the `ageAffirmed` unticked-checkbox gate — identical UX pattern, minimal marginal friction.
- Checkbox produces the strongest evidentiary record of an affirmative act for special-category data.

Submit button disabled until checked, same as the age-affirmation gate.

### 2.2 Consent record: new `donation_consents` table

Not columns on `fiat_donations`, because crypto donations have **no webapp-side table** (on-chain records only) — a dedicated table covers both rails uniformly.

```sql
CREATE TABLE IF NOT EXISTS donation_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  charity_id uuid,                    -- nullable for crypto (address-keyed)
  charity_wallet_address text,        -- crypto rail
  donation_type text NOT NULL CHECK (donation_type IN ('fiat','crypto')),
  donation_ref text,                  -- fiat: transaction_id; crypto: tx hash
  consent_text_version text NOT NULL, -- 'art9-donation-v1'
  locale text NOT NULL,               -- locale shown at capture time
  consented_at timestamptz NOT NULL DEFAULT now()
);
```

- RLS: `INSERT` … `WITH CHECK (user_id = auth.uid()::uuid)`; `SELECT` own rows only; no UPDATE/DELETE for users. (Remember the `::uuid` cast — 42883 failure mode.)
- **Fiat (authoritative server-side write)**: `helcim-validate/index.ts` `logFiatPayment()` writes the consent row in the same code path as the `fiat_donations` insert. Frontend passes `art9Consent: {version, locale}` in the validate payload; edge function rejects donation logging if absent.
- **Crypto**: authenticated client insert (RLS-guarded) at tx-submission time in `useDonation.ts` flow, before/with the on-chain call; `donation_ref` updated with tx hash on confirmation. Acceptable: RLS + auth.uid() makes the row server-attributed even if client-initiated.
- Versioning: `consent_text_version = 'art9-donation-v1'`. Any future copy change bumps the version string — constant lives in one shared module imported by both forms and the edge function payload builder.

### 2.3 Surfaces (from code scope)

| Surface           | File                                                     | Insertion point                                                |
| ----------------- | -------------------------------------------------------- | -------------------------------------------------------------- |
| Fiat form         | `src/components/web3/donation/FiatDonationForm.tsx`      | after `ageAffirmed` checkbox (~L538–559), before submit (L598) |
| Crypto one-time   | `src/components/web3/donation/DonationForm.tsx`          | before submit button (L230)                                    |
| Crypto monthly    | `src/components/web3/donation/ScheduledDonationForm.tsx` | same pattern                                                   |
| Fiat server write | `supabase/functions/helcim-validate/index.ts`            | `logFiatPayment()` (L216–265)                                  |

Charity name: `FiatDonationForm` already receives `charityName` prop. `DonationForm`/`ScheduledDonationForm` receive only `charityAddress` — parent (`DonationModal.tsx`) must pass `charityName` down (it has it at L316).

### 2.4 Locale: English-only default, board flag OPEN

Board precedent GIV-495/497 chose English-only consent text for the volunteer flow (PRs #479/#482 merged). Default here follows that precedent. A board interaction on GIV-654 asks whether the precedent extends to donation consent or whether all 12 locales are required.

- Implement with an i18n key + `{{charity}}` interpolation and English fallback regardless (`donation.art9Consent.statement` registered in `en.ts`) — this makes the outcome a translation-regen follow-up, not a rework, if the board picks 12 locales.
- `locale` column records what the user actually saw either way.

## 3. Out of scope

- RoPA v1.6 bump — sibling GIV-653 (HoD); explicitly not gated on this.
- Privacy.tsx §-level disclosure line — coordinate with HoD; add only if HoD confirms it's warranted.
- Any retro-fit of historical donations.
- CMP/consent-category integration.

## 4. Acceptance criteria (for QA)

1. Fiat + both crypto forms show the v1 statement with charity name interpolated; submit disabled until checkbox ticked.
2. `donation_consents` row written for every new donation: fiat row created by edge function server-side; crypto row present with tx hash ref.
3. RLS verified: user A cannot read/insert user B's consent rows.
4. i18n key registered in `en.ts` with fallback (keyValidation CI green).
5. No changes to existing donation rows; migration uses `IF NOT EXISTS`.
6. Tests: unit tests for the new gate logic + edge-function payload validation.
