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
 * Tracked by GIV-260 (translation regeneration). Remove entries as languages
 * are updated, and delete this set entirely once all languages reach parity.
 */
const KNOWN_UNTRANSLATED_KEYS = new Set([
  "home.hero.title",
  "home.hero.titleAccent",
  "home.hero.description",
  "home.hero.visionTitle",
  "home.hero.visionText",
  "home.comingSoon",
  "home.readDocs",
  "home.features.sectionTitle",
  "home.features.sectionSubtitle",
  "home.features.highEfficiency.title",
  "home.features.highEfficiency.description",
  "home.features.equityFunds.title",
  "home.features.equityFunds.description",
  "home.features.impactFunds.title",
  "home.features.impactFunds.description",
  "home.features.verifiedOrgs.title",
  "home.features.verifiedOrgs.description",
  "home.features.blockchainVerified.title",
  "home.features.blockchainVerified.description",
  "home.features.bridgingModes.title",
  "home.features.bridgingModes.description",
  "home.roles.title",
  "home.roles.donors.title",
  "home.roles.donors.item1",
  "home.roles.donors.item2",
  "home.roles.donors.item3",
  "home.roles.nonprofits.title",
  "home.roles.nonprofits.item1",
  "home.roles.nonprofits.item2",
  "home.roles.nonprofits.item3",
  "home.roles.volunteers.title",
  "home.roles.volunteers.item1",
  "home.roles.volunteers.item2",
  "home.roles.volunteers.item3",
  "home.impact.title",
  "home.impact.environmental.title",
  "home.impact.environmental.description",
  "home.impact.education.title",
  "home.impact.education.description",
  "home.cta.title",
  "home.cta.subtitle",
  "home.nav.features",
  "home.nav.impact",
  "home.nav.charities",
  "home.nav.volunteer",
  "home.footer.brand.tagline",
  "home.footer.product.title",
  "home.footer.product.impactFunds",
  "home.footer.product.charities",
  "home.footer.product.volunteers",
  "home.footer.resources.title",
  "home.footer.resources.whitepaper",
  "home.footer.resources.blog",
  "home.footer.resources.community",
  "home.footer.connect.title",
  "home.footer.connect.contact",
  "home.footer.copyright",
  "auth.signin.welcomeBack",
  "auth.signin.subtitle",
  "auth.signin.emailPlaceholder",
  "auth.signin.passwordPlaceholder",
  "auth.signin.submitting",
  "auth.signin.withPasskey",
  "auth.signin.withGoogle",
  "auth.signin.or",
  "auth.signin.newToProtocol",
  "auth.signin.createAccount",
  "auth.signin.forgotPasswordLink",
  "auth.signin.sslEncrypted",
  "auth.signin.terms",
  "auth.signin.privacy",
  "auth.panel.headline",
  "auth.panel.subheadline",
  "auth.panel.statusLabel",
  "auth.panel.statusDesc",
  "auth.panel.runsOn",
  "auth.wallet.connect",
  "auth.wallet.connecting",
  "auth.wallet.signing",
  "auth.wallet.verifying",
  "auth.wallet.openingSession",
  "auth.validation.emailRequired",
  "auth.validation.invalidEmail",
  "auth.validation.passwordTooShort",
  "auth.validation.passwordMismatch",
  "auth.login.welcomeHeading",
  "auth.login.signInOrConnect",
  "auth.login.skipToContent",
  "auth.login.donorTitle",
  "auth.login.donorSubtitle",
  "auth.login.charityTitle",
  "auth.login.charitySubtitle",
  "auth.login.back",
  "auth.login.continueDonor",
  "auth.login.connecting",
  "auth.login.connectWalletSignIn",
  "auth.login.newToPlatform",
  "auth.login.newDonorSignUp",
  "auth.login.manageNonprofit",
  "auth.login.nonprofitTrayTitle",
  "auth.login.createNonprofitAccount",
  "auth.login.registerOrg",
  "auth.login.needHelp",
  "auth.login.forgotUsernameBtn",
  "auth.login.forgotPasswordBtn",
  "auth.donorLogin.mismatch",
  "auth.donorLogin.signingIn",
  "auth.donorLogin.redirecting",
  "auth.donorReg.pleaseWait",
  "auth.donorReg.signUpPasskey",
  "auth.donorReg.withGoogle",
  "auth.donorReg.connectWallet",
  "auth.donorReg.orSetPassword",
  "auth.donorReg.creating",
  "auth.donorReg.createAccount",
  "auth.charityLogin.mismatch",
  "auth.charityLogin.signingIn",
  "auth.charityLogin.or",
  "auth.charityLogin.connecting",
  "auth.charityLogin.connectWallet",
  "auth.forgot.resetPassword",
  "auth.forgot.forgotUsername",
  "auth.forgot.passwordDesc",
  "auth.forgot.usernameDesc",
  "auth.forgot.passwordSuccess",
  "auth.forgot.usernameSuccess",
  "auth.forgot.checkEmail",
  "auth.forgot.backToSignIn",
  "auth.forgot.emailPlaceholder",
  "auth.forgot.genericError",
  "auth.forgot.sending",
  "auth.forgot.sendResetLink",
  "auth.forgot.sendUsername",
  "auth.orgSearch.orgNameLabel",
  "auth.orgSearch.searchPlaceholder",
  "auth.orgSearch.countryLabel",
  "auth.orgSearch.allCountries",
  "auth.orgSearch.searchPrompt",
  "auth.orgSearch.noResults",
  "auth.orgSearch.loadMore",
  "auth.orgSearch.cantFind",
  "auth.orgSearch.registerManually",
  "charity.claim.orgDetails",
  "charity.claim.orgNameLabel",
  "charity.claim.einLabel",
  "charity.claim.locationLabel",
  "charity.claim.contactInfo",
  "charity.claim.contactName",
  "charity.claim.contactEmail",
  "charity.claim.accountSecurity",
  "charity.claim.password",
  "charity.claim.confirmPassword",
  "charity.claim.backToSearch",
  "charity.claim.creating",
  "charity.claim.submit",
  "charity.claim.validation.name",
  "charity.claim.validation.email",
  "charity.claim.validation.password",
  "charity.claim.validation.confirmPassword",
  "charity.claim.validation.fix",
  "charity.claim.error.creation",
  "charity.claim.error.generic",
  "charity.vetting.orgDetails",
  "charity.vetting.orgName",
  "charity.vetting.description",
  "charity.vetting.taxId",
  "charity.vetting.countryLabel",
  "charity.vetting.selectCountry",
  "charity.vetting.address",
  "charity.vetting.streetAddress",
  "charity.vetting.city",
  "charity.vetting.state",
  "charity.vetting.postalCode",
  "charity.vetting.contactInfo",
  "charity.vetting.contactName",
  "charity.vetting.contactEmail",
  "charity.vetting.accountSecurity",
  "charity.vetting.password",
  "charity.vetting.confirmPassword",
  "charity.vetting.submitting",
  "charity.vetting.submit",
  "charity.vetting.validation.orgName",
  "charity.vetting.validation.contactName",
  "charity.vetting.validation.email",
  "charity.vetting.validation.password",
  "charity.vetting.validation.confirmPassword",
  "charity.vetting.validation.description",
  "charity.vetting.validation.category",
  "charity.vetting.validation.taxId",
  "charity.vetting.validation.streetAddress",
  "charity.vetting.validation.city",
  "charity.vetting.validation.country",
  "charity.vetting.validation.fix",
  "charity.vetting.error.generic",
  "common.email",
  "common.password",
  "common.confirmPassword",
  "footer.brand.tagline",
  "footer.resources.title",
  "footer.resources.faq",
  "footer.resources.about",
  "footer.legal.title",
  "footer.legal.terms",
  "footer.legal.privacy",
  "footer.connect.title",
  "footer.copyright",
  "nav.signIn",
  "nav.signOut",
  "nav.privacy",
  "auth.signup.heading",
  "auth.signup.subtitle",
  "auth.signup.displayName",
  "auth.signup.emailPlaceholder",
  "auth.signup.passwordPlaceholder",
  "auth.signup.confirmPasswordPlaceholder",
  "auth.signup.submit",
  "auth.signup.submitting",
  "auth.signup.withPasskey",
  "auth.signup.withGoogle",
  "auth.signup.connectWallet",
  "auth.signup.orSetPassword",
  "auth.signup.alreadyHaveAccount",
  "auth.signup.signInLink",
  "auth.signup.manageNonprofit",
  "auth.signup.trustText",
  "auth.signup.and",
  "auth.signup.privacyPolicy",
  "auth.signup.panel.headline",
  "browse.hero.title",
  "browse.stats.networks",
  "browse.stats.sectors",
  "browse.stats.verifiedOrgs",
  "browse.stats.onChain",
  "browse.stats.volunteerHours",
  "browse.verified",
  "browse.donate",
  "browse.filter.ariaLabel",
  "browse.filter.searchAria",
  "browse.filter.locationAria",
  "browse.results.ariaLabel",
  "browse.tabs.charities",
  "browse.tabs.causes",
  "browse.tabs.funds",
  "browse.tabs.ariaLabel",
  "browse.featured.heading",
  "browse.featured.ariaLabel",
  "browse.featured.nextAria",
  "browse.causes.heading",
  "browse.causes.ariaLabel",
  "browse.causes.badge",
  "browse.causes.raised",
  "browse.causes.percentOf",
  "browse.causes.by",
  "browse.causes.supportCta",
  "browse.causes.giveCta",
  "browse.causes.nextAria",
  "browse.funds.heading",
  "browse.funds.ariaLabel",
  "browse.funds.badge",
  "browse.funds.charity",
  "browse.funds.charities",
  "browse.funds.donateCta",
  "browse.funds.nextAria",
  "browse.charity.einLabel",
  "browse.charity.nteeLabel",
  "browse.charity.deductibilityLabel",
  "browse.charity.onPlatform",
  "browse.charity.loading",
  "browse.charity.loadMore",
  "cause.causes",
  "cause.createNew",
  "cause.noCausesTitle",
  "cause.name",
  "cause.description",
  "cause.category",
  "cause.targetAmount",
  "cause.headerImage",
  "cause.impact",
  "cause.impactHelp",
  "cause.location",
  "cause.timeline",
  "cause.partners",
  "cause.limitReached",
  "impact.statistics",
  "impact.statLabel",
  "impact.statValue",
  "impact.missionStatement",
  "impact.missionPlaceholder",
  "impact.highlights",
  "impact.highlight",
  "impact.addHighlight",
  "impact.profile",
  "impact.loadError",
  "impact.saveError",
  "impact.saveSuccess",
  "organization.yearFounded",
  "organization.address",
  "organization.street",
  "organization.city",
  "organization.stateProvince",
  "organization.postalCode",
  "organization.country",
  "organization.contactInfo",
  "organization.phone",
  "organization.email",
  "organization.website",
  "organization.socialMedia",
  "organization.publicFeed",
  "organization.communityMedia",
  "organization.profile",
  "organization.loadError",
  "organization.saveError",
  "common.remove",
  "common.saveChanges",
  "dashboard.thisMonth",
  "dashboard.verified",
  "dashboard.hoursLogged",
  "dashboard.endorsements",
  "dashboard.organizationsHelped",
  "dashboard.yourOrganizationsHelped",
  "transactions.createCampaign",
  "contributions.emptyTitle",
  "contributions.browseCharities",
  "charity.profile.verified501c3",
  "charity.profile.statusClaimed",
  "charity.profile.statusUnclaimed",
  "charity.profile.rowEin",
  "charity.profile.rowName",
  "charity.profile.rowLocation",
  "charity.profile.rowRulingYear",
  "charity.profile.rowNteeCode",
  "charity.profile.rowDeductibility",
  "charity.profile.rowAffiliation",
  "charity.profile.rowClassification",
  "charity.profile.rowFoundation",
  "charity.profile.rowActivityCodes",
  "charity.profile.rowOrgType",
  "charity.profile.rowSubsection",
  "charity.profile.rowStatus",
  "charity.profile.registryRecord",
  "charity.profile.einDisplay",
  "charity.profile.registeredYear",
  "charity.profile.shareAria",
  "charity.profile.copied",
  "charity.profile.about",
  "charity.profile.claimProfile",
  "charity.profile.noDescription",
  "charity.profile.toAddOne",
  "charity.profile.contact",
  "charity.profile.donate.support",
  "portfolio.title",
  "settings.theme",
  "settings.light",
  "settings.dark",
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
        (key) => !langKeys.has(key) && !KNOWN_UNTRANSLATED_KEYS.has(key)
      );

      if (unexpectedMissing.length > 0) {
        // eslint-disable-next-line no-console -- diagnostic output for CI
        console.error(
          `${lang} is missing ${unexpectedMissing.length} key(s) not in the known-untranslated allowlist.\n` +
            `Add translations to ${lang}.ts, or add to KNOWN_UNTRANSLATED_KEYS if tracked by GIV-260:\n` +
            unexpectedMissing.map((k) => `  "${k}"`).join("\n")
        );
      }
      expect(unexpectedMissing).toHaveLength(0);
    }
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
          `${lang} has ${orphaned.length} orphaned key(s) not in en.ts — remove or add to en.ts:\n` +
            orphaned.map((k) => `  "${k}"`).join("\n")
        );
      }
      expect(orphaned).toHaveLength(0);
    }
  );

  it("known-untranslated allowlist has no stale entries", () => {
    const enKeySet = new Set(enKeys);
    const stale = [...KNOWN_UNTRANSLATED_KEYS].filter(
      (key) => !enKeySet.has(key)
    );

    if (stale.length > 0) {
      // eslint-disable-next-line no-console -- diagnostic output for CI
      console.error(
        `${stale.length} key(s) in KNOWN_UNTRANSLATED_KEYS no longer exist in en.ts — remove them:\n` +
          stale.map((k) => `  "${k}"`).join("\n")
      );
    }
    expect(stale).toHaveLength(0);
  });

  it("known-untranslated allowlist shrinks as translations are added", () => {
    const firstLangKeys = new Set(
      Object.keys(typedResources[LANGUAGE_CODES[0]].translation)
    );
    const nowTranslated = [...KNOWN_UNTRANSLATED_KEYS].filter((key) =>
      firstLangKeys.has(key)
    );

    if (nowTranslated.length > 0) {
      // eslint-disable-next-line no-console -- diagnostic output for CI
      console.error(
        `${nowTranslated.length} key(s) in KNOWN_UNTRANSLATED_KEYS are now translated — remove them from the allowlist:\n` +
          nowTranslated.map((k) => `  "${k}"`).join("\n")
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
