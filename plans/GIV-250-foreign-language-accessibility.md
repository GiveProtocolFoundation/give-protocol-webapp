# PRD: GIV-250 Foreign Language Accessibility

**Author:** CPO Agent
**Date:** 2026-05-23
**Status:** Draft — Awaiting Board Approval
**Priority:** Medium

---

## Problem Statement

The Give Protocol webapp has i18n infrastructure in place (i18next, 12 languages, language selector) but only ~30 of ~200+ components actually use the translation system. Most UI text remains hardcoded in English, making the site effectively English-only despite having translation files for 12 languages.

## Current State

| Aspect                | Status                                                    |
| --------------------- | --------------------------------------------------------- |
| i18n framework        | i18next + react-i18next (fully configured)                |
| Languages supported   | 12 (en, es, de, fr, ja, zh-CN, zh-TW, th, vi, ko, ar, hi) |
| Translation keys      | ~184 across all 12 language files                         |
| Components using i18n | ~30 out of ~200+                                          |
| Language selector     | SettingsMenu in navbar (working)                          |
| Language detection    | Browser language via i18next-browser-languagedetector     |
| RTL support           | Not implemented (needed for Arabic)                       |
| Geolocation detection | Not implemented                                           |

## Goals

1. **Full UI translation coverage** — every user-facing string wrapped in `t()` calls
2. **Quality translations** — AI-generated with human review for key languages
3. **Automatic language detection** — browser language detection (already in place) + optional geolocation
4. **RTL layout support** — Arabic renders correctly right-to-left
5. **Maintainable** — new features naturally add translation keys going forward

## Non-Goals

- Database-driven content translation (charity descriptions, user-generated text) — future phase
- Server-side rendering for SEO in multiple languages — current SPA architecture doesn't require this
- Professional human translation for all 12 languages in v1 — AI-generated is acceptable for launch

## Language Selection Strategy

### Automatic Detection (Already Implemented)

The existing `i18next-browser-languagedetector` detects language from:

1. `localStorage` (user's explicit choice — highest priority)
2. Browser `navigator.language` setting

**Recommendation:** This is sufficient. Browser language detection covers the vast majority of use cases. IP-based geolocation adds complexity, latency, and privacy concerns (GDPR) for marginal benefit. Users whose browser language differs from their location can use the manual selector.

### Manual Selection (Already Implemented)

The SettingsMenu in the navbar provides a 12-language grid selector. This is accessible and functional.

**Enhancement:** Add language selector to the DashboardSettings page for discoverability (currently only in navbar dropdown).

## Implementation Plan

### Phase 1: String Extraction & Key Organization (Engineering)

**Scope:** Audit all ~200+ components, extract hardcoded English strings into translation keys.

**Approach:**

- Organize keys by feature domain (auth._, charity._, donor._, volunteer._, admin._, browse._, home._, common._)
- Add keys to `en.ts` first as the source of truth
- Wrap all JSX text in `t()` calls using the existing `useTranslation` hook
- Handle interpolation for dynamic values: `t('key', { count, name })`
- Handle pluralization where needed: `t('key', { count })` with `_one`/`_other` suffixes

**Estimated new keys:** ~400-600 (bringing total from ~184 to ~600-800)

**Priority order for extraction:**

1. **P0 — Landing & Auth pages** (Home, Auth, Login, Register, ForgotCredentials) — first impression for new users
2. **P1 — Browse & Charity pages** (BrowseCharities, CharityProfile, DonateWidget) — donor-facing
3. **P2 — Dashboard pages** (GiveDashboard, DonorDashboard, CharityPortal tabs) — logged-in users
4. **P3 — Volunteer pages** (Opportunities, Applications) — partially done already
5. **P4 — Admin & Settings pages** (AdminDashboard, DashboardSettings) — internal, lower priority
6. **P5 — Modals, Toasts, Error messages** — scattered throughout

### Phase 2: AI Translation Generation (Engineering)

**Scope:** Generate translations for all new keys across 11 non-English languages.

**Approach:**

- Use Claude API (same approach as docs translation GIV-131–134, proven successful)
- Translate `en.ts` keys → all 11 language files
- Batch by domain for context accuracy
- Include Give Protocol domain glossary (blockchain terms, charity sector terms)
- Output formatted TypeScript files matching existing structure

**Quality tiers:**

- **Tier 1 (human review recommended):** es, zh-CN — largest user bases, docs already translated
- **Tier 2 (AI-generated, spot-check):** fr, de, ja, ko — significant user populations
- **Tier 3 (AI-generated, best effort):** zh-TW, th, vi, ar, hi — smaller user bases initially

### Phase 3: RTL Support (Engineering)

**Scope:** Arabic language requires right-to-left text direction and mirrored layouts.

**Approach:**

- Add `dir="rtl"` to `<html>` element when Arabic is selected (in SettingsContext)
- Use CSS logical properties (`margin-inline-start` instead of `margin-left`) where layout is direction-dependent
- Audit Tailwind classes for RTL compatibility — most flexbox/grid layouts work automatically
- Test critical flows: auth, browse, donate, dashboard

**Scope limit:** Only Arabic needs RTL among the 12 supported languages. Hindi uses LTR.

### Phase 4: QA & Polish (QA)

**Scope:** Verify translations render correctly across all pages and languages.

- Visual regression testing for each language (text overflow, truncation, layout breaks)
- RTL layout verification for Arabic
- Verify interpolation/pluralization works in all languages
- Test language persistence across sessions
- Test language switching mid-session
- Verify all form labels, placeholders, validation messages, and error states are translated

## Subtask Breakdown

| #   | Task                                         | Agent      | Dependencies | Est. Keys |
| --- | -------------------------------------------- | ---------- | ------------ | --------- |
| 1   | P0: Landing & Auth string extraction         | Engineer   | None         | ~80       |
| 2   | P1: Browse & Charity string extraction       | Engineer   | None         | ~120      |
| 3   | P2: Dashboard string extraction              | Engineer-2 | None         | ~100      |
| 4   | P3: Volunteer string extraction (fill gaps)  | Engineer-2 | None         | ~40       |
| 5   | P4: Admin & Settings string extraction       | Engineer   | None         | ~60       |
| 6   | P5: Modals, Toasts, Errors string extraction | Engineer-2 | None         | ~80       |
| 7   | AI translation generation (all 11 languages) | Engineer   | 1-6 complete | —         |
| 8   | RTL support for Arabic                       | Engineer   | 7 complete   | —         |
| 9   | DashboardSettings language selector          | Engineer-2 | None         | ~10       |
| 10  | QA: Full i18n verification                   | QA         | 7-9 complete | —         |

**Parallelization:** Tasks 1-6 can run in parallel (2 engineers). Task 9 is independent. Tasks 7-8 are sequential after extraction. Task 10 is the final gate.

## Technical Decisions

### Translation file format

**Keep current approach:** TypeScript files (`en.ts`, `es.ts`, etc.) with flat key-value objects. These are type-safe, tree-shakeable, and match the existing pattern. No migration to JSON needed.

### Key naming convention

**Use dot-notation by domain:** `{domain}.{page}.{element}` — e.g., `auth.login.emailLabel`, `browse.search.placeholder`, `charity.profile.donateButton`. This matches the existing pattern and scales well.

### Component integration pattern

**Use existing `useTranslation` hook** from `src/hooks/useTranslation.ts`. No new abstractions needed. For components that don't currently import it, add:

```tsx
const { t } = useTranslation();
// Then replace: <h1>Browse Charities</h1>
// With: <h1>{t('browse.title')}</h1>
```

### Geolocation

**Not recommended for v1.** Browser language detection (already implemented) covers the primary use case. Adding geolocation would require:

- Third-party API dependency (ip-api, MaxMind, etc.)
- GDPR consent for location data
- Edge cases where IP location ≠ user language preference
- Added latency on first page load

If the board wants geolocation, it can be added later as a detection source in the i18next configuration without touching any components.

## Success Metrics

- **Coverage:** 100% of user-facing strings use `t()` calls
- **Languages:** All 12 language files have complete key coverage
- **RTL:** Arabic renders correctly on all pages
- **No regressions:** English UI unchanged; all existing tests pass
- **Discoverability:** Language selector accessible from both navbar and settings page

## Risks

| Risk                                                                       | Mitigation                                                                     |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| AI translations may be inaccurate                                          | Tier 1 languages (es, zh-CN) get human review; community corrections over time |
| Large PR scope (~200 files touched)                                        | Split into 6 parallel extraction PRs by domain                                 |
| Text overflow in some languages (e.g., German is ~30% longer than English) | QA visual regression testing; use flexible layouts                             |
| RTL layout breaks                                                          | Scoped to Arabic only; CSS logical properties minimize impact                  |
| New features added without i18n                                            | Add lint rule or PR checklist reminder                                         |

## Open Questions for Board

1. **Language priority:** Should we ship all 12 languages at once, or start with a subset (e.g., en + es + zh-CN + fr) and add others incrementally?
2. **Human review budget:** Do we want professional translation review for Tier 1 languages (es, zh-CN), or is AI-only acceptable for v1?
3. **Geolocation:** Confirm that browser language detection is sufficient, or do we need IP-based geolocation?
