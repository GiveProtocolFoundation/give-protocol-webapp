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
 */
const KNOWN_UNTRANSLATED_KEYS = new Set<string>([
  "admin.auditTrail.filterByAction",
  "admin.auditTrail.allActions",
  "admin.auditTrail.action.charityStatusChange",
  "admin.auditTrail.action.userStatusChange",
  "admin.auditTrail.action.donationFlag",
  "admin.auditTrail.action.donationFlagResolve",
  "admin.auditTrail.action.validationOverride",
  "admin.auditTrail.action.configChange",
  "admin.auditTrail.action.verificationApprove",
  "admin.auditTrail.action.verificationReject",
  "admin.auditTrail.action.charitySuspend",
  "admin.auditTrail.action.charityReinstate",
  "admin.auditTrail.action.userSuspend",
  "admin.auditTrail.action.userReinstate",
  "admin.auditTrail.action.userBan",
  "admin.auditTrail.action.viewPii",
  "admin.auditTrail.action.viewPiiList",
  "admin.auditTrail.viewedEntity",
  "admin.auditTrail.viewedList",
  "admin.auditTrail.viewedListNoFilters",
  "privacy.security.auditLog",
  "admin.actions.platformNews",
  "admin.actions.platformNewsDesc",
  "admin.news.activate",
  "admin.news.activated",
  "admin.news.activeLabel",
  "admin.news.categoryLabel",
  "admin.news.contentLabel",
  "admin.news.contentPlaceholder",
  "admin.news.createNews",
  "admin.news.createNewsBtn",
  "admin.news.created",
  "admin.news.dateLabel",
  "admin.news.deactivate",
  "admin.news.deactivated",
  "admin.news.deleteItem",
  "admin.news.deleted",
  "admin.news.editItem",
  "admin.news.editNews",
  "admin.news.imageLabel",
  "admin.news.imagePlaceholder",
  "admin.news.inactive",
  "admin.news.newItem",
  "admin.news.noItemsMessage",
  "admin.news.noItemsYet",
  "admin.news.publishedOn",
  "admin.news.saving",
  "admin.news.subtitle",
  "admin.news.title",
  "admin.news.titleLabel",
  "admin.news.titlePlaceholder",
  "admin.news.updateNews",
  "admin.news.updated",
  "admin.news.urlLabel",
  "admin.news.urlPlaceholder",
  "charity.walletBadge.institutionalLabel",
  "charity.walletBadge.institutionalTooltip",
  "charity.walletBadge.safeLabel",
  "charity.walletBadge.safeTooltip",
  "wallet.eoa.chain",
  "wallet.eoa.checkAuthorized",
  "wallet.eoa.checkRisk",
  "wallet.eoa.confirmSubtitle",
  "wallet.eoa.confirmTitle",
  "wallet.eoa.connectFirst",
  "wallet.eoa.connectWallet",
  "wallet.eoa.missingSignature",
  "wallet.eoa.proceedAnyway",
  "wallet.eoa.register",
  "wallet.eoa.registering",
  "wallet.eoa.rejected",
  "wallet.eoa.riskParagraph1",
  "wallet.eoa.riskParagraph2",
  "wallet.eoa.riskParagraph3",
  "wallet.eoa.riskTitle",
  "wallet.eoa.signError",
  "wallet.eoa.signMessage",
  "wallet.eoa.signSubtitle",
  "wallet.eoa.signTitle",
  "wallet.eoa.useMultisig",
  "wallet.eoa.walletConnection",
  "wallet.eoa.walletToRegister",
  "wallet.institutional.address",
  "wallet.institutional.attestation",
  "wallet.institutional.attestationHelp",
  "wallet.institutional.backToWallets",
  "wallet.institutional.chain",
  "wallet.institutional.chooseFile",
  "wallet.institutional.custodian",
  "wallet.institutional.fileTooLarge",
  "wallet.institutional.invalidAddress",
  "wallet.institutional.invalidFileType",
  "wallet.institutional.removeFile",
  "wallet.institutional.selectCustodian",
  "wallet.institutional.selectCustodianOption",
  "wallet.institutional.submit",
  "wallet.institutional.submittedDesc",
  "wallet.institutional.submittedTitle",
  "wallet.institutional.submitting",
  "wallet.institutional.subtitle",
  "wallet.institutional.title",
  "wallet.institutional.uploadFile",
  "wallet.institutional.uploadRequired",
  "wallet.safe.address",
  "wallet.safe.chain",
  "wallet.safe.connectFirst",
  "wallet.safe.connectSigner",
  "wallet.safe.createNew",
  "wallet.safe.createNewDesc",
  "wallet.safe.haveOne",
  "wallet.safe.haveOneDesc",
  "wallet.safe.invalidAddress",
  "wallet.safe.rejected",
  "wallet.safe.signError",
  "wallet.safe.signVerify",
  "wallet.safe.signerWallet",
  "wallet.safe.subtitle",
  "wallet.safe.title",
  "wallet.safe.verifyTitle",
  "wallet.safe.verifying",
  "wallet.setup.addAnother",
  "wallet.setup.custodian",
  "wallet.setup.deleteFailed",
  "wallet.setup.eoaDesc",
  "wallet.setup.eoaTitle",
  "wallet.setup.institutionalDesc",
  "wallet.setup.institutionalTitle",
  "wallet.setup.makePrimary",
  "wallet.setup.primary",
  "wallet.setup.primaryFailed",
  "wallet.setup.primaryUpdated",
  "wallet.setup.recommended",
  "wallet.setup.remove",
  "wallet.setup.safeDesc",
  "wallet.setup.safeSigners",
  "wallet.setup.safeTitle",
  "wallet.setup.subtitle",
  "wallet.setup.title",
  "wallet.setup.viewExplorer",
  "wallet.setup.walletAdded",
  "wallet.setup.walletDeleted",
  "wallet.setup.walletsTitle",
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
