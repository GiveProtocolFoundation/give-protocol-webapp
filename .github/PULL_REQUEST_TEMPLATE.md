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
> Reference: the **Art. 3(2) Targeting-Trigger Monitor** (governance control behind the GDPR/UK Art. 27 representative obligation). Full signal list, weak-vs-strong distinction, and legal rationale: [`docs/PRE_LAUNCH_CHECKLIST.md`](../docs/PRE_LAUNCH_CHECKLIST.md). No single factor is dispositive — targeting is assessed on the totality of factors; a factor equally explained by a worldwide audience is not probative of EU targeting.

- [ ] **Not applicable** — this PR does not touch i18n/locales, currency/payments, domains, or charity-onboarding scope.
- [ ] **Reviewed** — this PR touches one of those areas and I have checked the strong (EU-specific) signals below.

**Does this PR introduce a STRONG, EU-specific targeting signal?** (these point specifically at the EU and are not explained by a global audience)

- [ ] **EU-specific / minority language** — adds an official language of an EU member state with no large non-EU speaker base (Dutch, Polish, Greek, Czech, Hungarian, Finnish, Swedish, …). _(Adding a globally-spoken EU-official language — ES, DE, FR, PT — is weak/equivocal, not a strong signal; note it but it does not by itself trigger.)_
- [ ] **EU payment rail / EU-default currency** — enables an EU-specific rail (SEPA, iDEAL, Bancontact, Giropay) or sets EUR as the default for EU-geolocated users. _(Adding EUR as one option in a worldwide multi-currency list is weak/equivocal.)_
- [ ] **EU domain** — adds/uses an EU ccTLD (`.eu`, `.de`, `.fr`, …) or EU-geotargeted domain.
- [ ] **EU charity scope** — onboards/verifies EU-established charities or EU beneficiary organizations.
- [ ] **None of the above** — no strong EU-specific signal introduced (any equivocal factors noted in the description).

> ⚠️ **If you checked ANY strong signal above (other than "None"): STOP — do not merge.** Escalate for an Art. 3(2)/UK GDPR reassessment (Head of Data + counsel) before the feature goes live; if it concludes Art. 3(2) applies, EU + UK Art. 27 representatives must be appointed first. Tag the Head of Data and CTO and open/link a compliance issue.
