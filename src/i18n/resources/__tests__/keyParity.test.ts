import { resources } from "../index";

/**
 * Cross-language key parity CI test.
 *
 * Ensures every non-English language file contains the same translation keys
 * as the authoritative English source (`en.ts`). Prevents silent translation
 * coverage regressions when new keys are added to `en.ts`.
 *
 * @see GIV-265
 */

const LANGUAGE_CODES = [
  "es",
  "de",
  "fr",
  "ja",
  "zh-CN",
  "zh-TW",
  "th",
  "vi",
  "ko",
  "ar",
  "hi",
] as const;

/**
 * Keys in en.ts that have not yet been translated to non-English languages.
 * GIV-279: Platform News admin CRUD keys — translations pending.
 * GIV-286: Charity wallet tier keys — translations pending.
 * GIV-415: Admin audit trail view_pii keys — translations pending.
 * GIV-495: Volunteer consent legal paragraphs — intentionally English-only per board
 *   decision 2026-06-20. GDPR Art. 6(1)(b) citations and erasure/objection rights
 *   require precise legal language; English is the operative legal text for all locales.
 *   Governing-language notice added to ConsentForm.tsx and VolunteerApplicationForm.tsx.
 *   If professional legal translations are commissioned, remove from this allowlist and
 *   add translated strings to each locale file.
 */
const KNOWN_UNTRANSLATED_KEYS = new Set<string>([
  // GIV-495: volunteer consent legal paragraphs — English-only operative text (board-approved 2026-06-20)
  "volunteer.understanding.item1",
  "volunteer.understanding.item2",
  "volunteer.understanding.item3",
  "volunteer.understanding.item4",
  "volunteer.understanding.item5",
  "volunteer.understanding.item6Before",
  "volunteer.understanding.item6After",
  // GIV-841: admin error panel titles — translations pending
  "admin.error.charities",
  "admin.error.donations",
]);

type ResourceMap = Record<string, { translation: Record<string, string> }>;

describe("Cross-language key parity", () => {
  const typedResources = resources as unknown as ResourceMap;
  const enKeys = Object.keys(typedResources.en.translation).sort();

  it("en.ts has translation keys", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it("all 11 non-English languages exist in resources", () => {
    for (const lang of LANGUAGE_CODES) {
      expect(typedResources[lang]).toBeDefined();
      expect(typedResources[lang].translation).toBeDefined();
    }
  });

  it.each(LANGUAGE_CODES)(
    "%s contains all en.ts keys (excluding known untranslated)",
    (lang) => {
      const langKeys = new Set(Object.keys(typedResources[lang].translation));
      const unexpectedMissing = enKeys.filter(
        (key) => !langKeys.has(key) && !KNOWN_UNTRANSLATED_KEYS.has(key),
      );

      if (unexpectedMissing.length > 0) {
        // eslint-disable-next-line no-console -- diagnostic output for CI
        console.error(
          `${lang} is missing ${unexpectedMissing.length} key(s) not in the known-untranslated allowlist.\nAdd translations to ${lang}.ts, or add to KNOWN_UNTRANSLATED_KEYS if tracked by GIV-260:\n${unexpectedMissing.map((k) => `  "${k}"`).join("\n")}`,
        );
      }
      expect(unexpectedMissing).toHaveLength(0);
    },
  );

  it.each(LANGUAGE_CODES)(
    "%s has no orphaned keys absent from en.ts",
    (lang) => {
      const enKeySet = new Set(enKeys);
      const langKeys = Object.keys(typedResources[lang].translation);
      const orphaned = langKeys.filter((key) => !enKeySet.has(key));

      if (orphaned.length > 0) {
        // eslint-disable-next-line no-console -- diagnostic output for CI
        console.error(
          `${lang} has ${orphaned.length} orphaned key(s) not in en.ts — remove or add to en.ts:\n${orphaned.map((k) => `  "${k}"`).join("\n")}`,
        );
      }
      expect(orphaned).toHaveLength(0);
    },
  );

  it("known-untranslated allowlist has no stale entries", () => {
    const enKeySet = new Set(enKeys);
    const stale = [...KNOWN_UNTRANSLATED_KEYS].filter(
      (key) => !enKeySet.has(key),
    );

    if (stale.length > 0) {
      // eslint-disable-next-line no-console -- diagnostic output for CI
      console.error(
        `${stale.length} key(s) in KNOWN_UNTRANSLATED_KEYS no longer exist in en.ts — remove them:\n${stale.map((k) => `  "${k}"`).join("\n")}`,
      );
    }
    expect(stale).toHaveLength(0);
  });

  it("known-untranslated allowlist shrinks as translations are added", () => {
    const firstLangKeys = new Set(
      Object.keys(typedResources[LANGUAGE_CODES[0]].translation),
    );
    const nowTranslated = [...KNOWN_UNTRANSLATED_KEYS].filter((key) =>
      firstLangKeys.has(key),
    );

    if (nowTranslated.length > 0) {
      // eslint-disable-next-line no-console -- diagnostic output for CI
      console.error(
        `${nowTranslated.length} key(s) in KNOWN_UNTRANSLATED_KEYS are now translated — remove them from the allowlist:\n${nowTranslated.map((k) => `  "${k}"`).join("\n")}`,
      );
    }
    expect(nowTranslated).toHaveLength(0);
  });

  it("reports summary of translation coverage", () => {
    const summary: Array<{
      language: string;
      total: number;
      missing: number;
      coverage: string;
    }> = [];

    for (const lang of LANGUAGE_CODES) {
      const langKeys = new Set(Object.keys(typedResources[lang].translation));
      const missing = enKeys.filter((key) => !langKeys.has(key));
      summary.push({
        language: lang,
        total: langKeys.size,
        missing: missing.length,
        coverage: `${(((enKeys.length - missing.length) / enKeys.length) * 100).toFixed(1)}%`,
      });
    }

    // eslint-disable-next-line no-console -- diagnostic output for CI
    console.table(summary);
    expect(summary.length).toBe(LANGUAGE_CODES.length);
  });
});
