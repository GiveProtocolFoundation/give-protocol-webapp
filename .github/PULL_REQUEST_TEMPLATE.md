<!--
Thanks for contributing! Keep PRs focused: one logical change each.
See CONTRIBUTING.md for branch/PR expectations and the pre-commit checklist.
-->

## What & why

<!-- Summarize what this PR changes and why. Link the related issue. -->

Closes #

## Checklist

- [ ] `npm run lint` passes (no ESLint errors)
- [ ] `npm test -- --coverage` passes and new code is covered
- [ ] PR is focused on one logical change

## GDPR Art. 3(2) targeting-trigger gate

> **Required for any PR touching i18n/locales, currency/payments, domains, or charity-onboarding scope.**
> Reference: the **Art. 3(2) Targeting-Trigger Monitor** (governance control behind the GDPR/UK Art. 27 representative obligation). Tier-1 trigger list and rationale: [`docs/PRE_LAUNCH_CHECKLIST.md`](../docs/PRE_LAUNCH_CHECKLIST.md).

- [ ] **Not applicable** — this PR does not touch i18n/locales, currency/payments, domains, or charity-onboarding scope.
- [ ] **Reviewed** — this PR touches one of those areas and I have checked the Tier-1 targeting triggers below.

**Does this PR introduce a Tier-1 Art. 3(2) targeting trigger?** (any one = the service is being *directed* at EU data subjects)

- [ ] **Language** — adds/enables an EU-member-state official language other than English (DE, FR, ES, IT, NL, PL, PT, …) in UI or emails.
- [ ] **Currency / payments** — accepts or displays donations in EUR (or another EU currency), or enables an EU payment rail (SEPA, iDEAL, Bancontact, Giropay).
- [ ] **Domain** — adds/uses an EU ccTLD (`.eu`, `.de`, `.fr`, …) or EU-geotargeted domain.
- [ ] **Charity scope** — onboards/verifies EU-established charities or EU beneficiary organizations.
- [ ] **None of the above** — no Tier-1 targeting trigger introduced.

> ⚠️ **If you checked ANY trigger above (other than "None"): STOP — do not merge.** Escalate for Art. 3(2)/UK Art. 3(2) reassessment and EU + UK Art. 27 representative appointment **before** the feature goes live. Tag the Head of Data and CTO and open/link a compliance issue.
