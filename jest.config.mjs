export default {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  // Run tests sequentially to prevent ESM module mocking isolation issues
  maxWorkers: 1,
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
          isolatedModules: true,
          module: "ESNext",
          target: "ESNext",
        },
      },
    ],
    "^.+\\.(js|jsx|mjs)$": [
      "babel-jest",
      {
        configFile: "./babel.config.cjs",
      },
    ],
  },
  moduleNameMapper: {
    // Test escape-hatch: importing "@/contexts/<Name>.real" bypasses the
    // global mock and loads the actual context source. Used by tests in
    // src/contexts/__tests__/ to exercise context logic directly.
    "^@/contexts/ToastContext\\.real$":
      "<rootDir>/src/contexts/ToastContext.tsx",
    "^@/contexts/SettingsContext\\.real$":
      "<rootDir>/src/contexts/SettingsContext.tsx",
    "^@/contexts/MultiChainContext\\.real$":
      "<rootDir>/src/contexts/MultiChainContext.tsx",
    "^@/contexts/Web3Context\\.real$": "<rootDir>/src/contexts/Web3Context.tsx",
    "^@/contexts/CurrencyContext\\.real$":
      "<rootDir>/src/contexts/CurrencyContext.tsx",
    "^@/utils/monitoring\\.real$": "<rootDir>/src/utils/monitoring.ts",
    "^@/utils/leaderboardExport\\.real$":
      "<rootDir>/src/utils/leaderboardExport.ts",
    // Config and library mocks
    "^@/config/env$": "<rootDir>/src/test-utils/envMock.js",
    "^@/config/docs$": "<rootDir>/src/test-utils/docsMock.js",
    "^@/lib/supabase$": "<rootDir>/src/test-utils/supabaseMock.js",
    "^@/lib/sentry$": "<rootDir>/src/test-utils/sentryMock.js",
    "(.*)/config/env(\\.ts)?$": "<rootDir>/src/test-utils/envMock.js",
    "(.*)/config/docs(\\.ts)?$": "<rootDir>/src/test-utils/docsMock.js",
    "(.*)/lib/supabase(\\.ts)?$": "<rootDir>/src/test-utils/supabaseMock.js",
    "(.*)/lib/sentry(\\.ts)?$": "<rootDir>/src/test-utils/sentryMock.js",
    // Library mocks
    "^ethers$": "<rootDir>/src/test-utils/ethersMock.js",
    // Hook mocks
    "^@/hooks/useTranslation$":
      "<rootDir>/src/test-utils/useTranslationMock.js",
    "(.*)/hooks/useTranslation(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useTranslationMock.js",
    "^@/hooks/web3/useDonation$": "<rootDir>/src/test-utils/useDonationMock.js",
    "(.*)/hooks/web3/useDonation(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useDonationMock.js",
    "^@/hooks/web3/useTokenBalance$":
      "<rootDir>/src/test-utils/useTokenBalanceMock.js",
    "(.*)/hooks/web3/useTokenBalance(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useTokenBalanceMock.js",
    "^@/hooks/web3/useScheduledDonation$":
      "<rootDir>/src/test-utils/useScheduledDonationMock.js",
    "(.*)/hooks/web3/useScheduledDonation(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useScheduledDonationMock.js",
    "^@/hooks/useContributionStats$":
      "<rootDir>/src/test-utils/useContributionStatsMock.js",
    "(.*)/hooks/useContributionStats(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useContributionStatsMock.js",
    "^@/hooks/useVolunteerVerification$":
      "<rootDir>/src/test-utils/useVolunteerVerificationMock.js",
    "(.*)/hooks/useVolunteerVerification(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useVolunteerVerificationMock.js",
    "^@/hooks/useWalletAlias$":
      "<rootDir>/src/test-utils/useWalletAliasMock.js",
    "(.*)/hooks/useWalletAlias(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useWalletAliasMock.js",
    "^@/hooks/useProfile$": "<rootDir>/src/test-utils/useProfileMock.js",
    "(.*)/hooks/useProfile(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useProfileMock.js",
    "^@/hooks/useWallet$": "<rootDir>/src/test-utils/useWalletMock.js",
    "(.*)/hooks/useWallet(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useWalletMock.js",
    "^@/hooks/useSafeAutoConnect$":
      "<rootDir>/src/test-utils/safeAutoConnectMock.js",
    "(.*)/hooks/useSafeAutoConnect(\\.tsx?)?$":
      "<rootDir>/src/test-utils/safeAutoConnectMock.js",
    "^@/hooks/useCharityWallets$":
      "<rootDir>/src/test-utils/useCharityWalletsMock.js",
    "(.*)/hooks/useCharityWallets(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useCharityWalletsMock.js",
    "^@/hooks/useWalletAuthSync$":
      "<rootDir>/src/test-utils/walletAuthSyncMock.js",
    "(.*)/hooks/useWalletAuthSync(\\.tsx?)?$":
      "<rootDir>/src/test-utils/walletAuthSyncMock.js",
    // Context mocks
    "^@/contexts/SettingsContext$":
      "<rootDir>/src/test-utils/settingsContextMock.js",
    "(.*)/contexts/SettingsContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/settingsContextMock.js",
    "^@/contexts/ToastContext$": "<rootDir>/src/test-utils/toastContextMock.js",
    "(.*)/contexts/ToastContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/toastContextMock.js",
    "^@/contexts/MultiChainContext$":
      "<rootDir>/src/test-utils/multiChainContextMock.js",
    "(.*)/contexts/MultiChainContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/multiChainContextMock.js",
    // Web3Context.tsx imports MultiChainContext via "./MultiChainContext"
    // (no /contexts/ in the specifier). Catch that form so the real
    // Web3Context source can be tested with a controllable MultiChain mock.
    "^\\./MultiChainContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/multiChainContextMock.js",
    "^@/contexts/Web3Context$": "<rootDir>/src/test-utils/web3ContextMock.js",
    "(.*)/contexts/Web3Context(\\.tsx?)?$":
      "<rootDir>/src/test-utils/web3ContextMock.js",
    "^@/contexts/ChainContext$": "<rootDir>/src/test-utils/chainContextMock.js",
    "(.*)/contexts/ChainContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/chainContextMock.js",
    // Web3Context.tsx imports ChainContext via "./ChainContext"
    // (no /contexts/ in the specifier). Catch that exact form so the real
    // Web3Context source loads the mocked ChainContext during tests.
    "^\\./ChainContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/chainContextMock.js",
    "^@/contexts/CurrencyContext$":
      "<rootDir>/src/test-utils/currencyContextMock.js",
    "(.*)/contexts/CurrencyContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/currencyContextMock.js",
    // Utility mocks
    "^@/utils/logger$": "<rootDir>/src/test-utils/loggerMock.js",
    "(.*)/utils/logger(\\.tsx?)?$": "<rootDir>/src/test-utils/loggerMock.js",
    "^@/utils/date$": "<rootDir>/src/test-utils/dateMock.js",
    "(.*)/utils/date(\\.tsx?)?$": "<rootDir>/src/test-utils/dateMock.js",
    "^@/utils/web3$": "<rootDir>/src/test-utils/web3UtilsMock.js",
    "(.*)/utils/web3(\\.tsx?)?$": "<rootDir>/src/test-utils/web3UtilsMock.js",
    "^@/utils/monitoring$": "<rootDir>/src/test-utils/monitoringMock.js",
    "(.*)/utils/monitoring(\\.tsx?)?$":
      "<rootDir>/src/test-utils/monitoringMock.js",
    // Component mocks
    "^@/components/CurrencyDisplay$":
      "<rootDir>/src/test-utils/currencyDisplayMock.js",
    "(.*)/components/CurrencyDisplay(\\.tsx?)?$":
      "<rootDir>/src/test-utils/currencyDisplayMock.js",
    "^@/components/ui/LoadingSpinner$":
      "<rootDir>/src/test-utils/loadingSpinnerMock.js",
    "(.*)/components/ui/LoadingSpinner(\\.tsx?)?$":
      "<rootDir>/src/test-utils/loadingSpinnerMock.js",
    "^@/components/contribution/DonationExportModal$":
      "<rootDir>/src/test-utils/donationExportModalMock.js",
    "(.*)/contribution/DonationExportModal(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donationExportModalMock.js",
    "^@/components/contribution/DonationStats$":
      "<rootDir>/src/test-utils/donationStatsMock.js",
    "(.*)/contribution/DonationStats(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donationStatsMock.js",
    "^\\./DonationStats(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donationStatsMock.js",
    "^@/components/contribution/RecentContributions$":
      "<rootDir>/src/test-utils/recentContributionsMock.js",
    "(.*)/contribution/RecentContributions(\\.tsx?)?$":
      "<rootDir>/src/test-utils/recentContributionsMock.js",
    "^\\./RecentContributions(\\.tsx?)?$":
      "<rootDir>/src/test-utils/recentContributionsMock.js",
    "^@/components/contribution/VolunteerImpact$":
      "<rootDir>/src/test-utils/volunteerImpactMock.js",
    "(.*)/contribution/VolunteerImpact(\\.tsx?)?$":
      "<rootDir>/src/test-utils/volunteerImpactMock.js",
    "^\\./VolunteerImpact(\\.tsx?)?$":
      "<rootDir>/src/test-utils/volunteerImpactMock.js",
    "^@/components/contribution/DonationLeaderboard$":
      "<rootDir>/src/test-utils/donationLeaderboardMock.js",
    "(.*)/contribution/DonationLeaderboard(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donationLeaderboardMock.js",
    "^\\./DonationLeaderboard(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donationLeaderboardMock.js",
    "^@/components/contribution/VolunteerLeaderboard$":
      "<rootDir>/src/test-utils/volunteerLeaderboardMock.js",
    "(.*)/contribution/VolunteerLeaderboard(\\.tsx?)?$":
      "<rootDir>/src/test-utils/volunteerLeaderboardMock.js",
    "^\\./VolunteerLeaderboard(\\.tsx?)?$":
      "<rootDir>/src/test-utils/volunteerLeaderboardMock.js",
    "^@/components/ErrorBoundary$":
      "<rootDir>/src/test-utils/errorBoundaryMock.js",
    "(.*)/components/ErrorBoundary(\\.tsx?)?$":
      "<rootDir>/src/test-utils/errorBoundaryMock.js",
    "^@/components/web3/ChainSelectionModal$":
      "<rootDir>/src/test-utils/chainSelectionModalMock.js",
    "(.*)/components/web3/ChainSelectionModal(\\.tsx?)?$":
      "<rootDir>/src/test-utils/chainSelectionModalMock.js",
    // Layout and routes mocks
    "^@/components/layout$": "<rootDir>/src/test-utils/layoutMock.js",
    "(.*)/components/layout(\\.tsx?)?$":
      "<rootDir>/src/test-utils/layoutMock.js",
    "^@/routes$": "<rootDir>/src/test-utils/routesMock.js",
    "(.*)/routes(\\.tsx?)?$": "<rootDir>/src/test-utils/routesMock.js",
    // Charity portal tabs mock.
    // CharityPortal.tsx uses a relative import "./charity-portal/components"
    // (no @/ prefix) so the pattern must match without the "/pages/" segment.
    "(.*)/charity-portal/components(/index)?(\\.tsx?)?$":
      "<rootDir>/src/test-utils/charityPortalTabsMock.js",
    // Config mocks
    "^@/config/contracts$": "<rootDir>/src/test-utils/contractsMock.js",
    "(.*)/config/contracts(\\.tsx?)?$":
      "<rootDir>/src/test-utils/contractsMock.js",
    "^@/config/chains$": "<rootDir>/src/test-utils/chainsMock.js",
    "(.*)/config/chains(\\.tsx?)?$": "<rootDir>/src/test-utils/chainsMock.js",
    // WebAuthn library mock
    "^@simplewebauthn/browser$":
      "<rootDir>/src/test-utils/simplewebauthnBrowserMock.js",
    // TipTap editor mocks
    "^@tiptap/react$": "<rootDir>/src/test-utils/tiptapReactMock.js",
    "^@tiptap/starter-kit$": "<rootDir>/src/test-utils/tiptapStarterKitMock.js",
    "^@tiptap/extension-link$":
      "<rootDir>/src/test-utils/tiptapExtensionLinkMock.js",
    // Additional component mocks
    "^@/components/ui/Modal$": "<rootDir>/src/test-utils/modalMock.js",
    "(.*)/components/ui/Modal(\\.tsx?)?$":
      "<rootDir>/src/test-utils/modalMock.js",
    "^@/components/ui/Card$": "<rootDir>/src/test-utils/cardMock.js",
    "(.*)/components/ui/Card(\\.tsx?)?$":
      "<rootDir>/src/test-utils/cardMock.js",
    "^@/components/web3/WalletModal/WalletModal$":
      "<rootDir>/src/test-utils/walletModalMock.js",
    "(.*)/WalletModal/WalletModal(\\.tsx?)?$":
      "<rootDir>/src/test-utils/walletModalMock.js",
    // ConnectButton mock (relative import from AppNavbar)
    "(.*)/web3/ConnectButton(\\.tsx?)?$":
      "<rootDir>/src/test-utils/connectButtonMock.js",
    // ClientOnly mock (relative import from AppNavbar)
    "(.*)/ClientOnly(\\.tsx?)?$": "<rootDir>/src/test-utils/clientOnlyMock.js",
    // Wallet barrel mock (relative import from AppNavbar: ./Wallet)
    "(.*)/components/Wallet(/index)?(\\.tsx?)?$":
      "<rootDir>/src/test-utils/walletComponentsMock.js",
    "(.*)/components/Wallet/types(\\.tsx?)?$":
      "<rootDir>/src/test-utils/walletComponentsMock.js",
    // Tabs UI component mock
    "^@/components/ui/Tabs$": "<rootDir>/src/test-utils/tabsMock.js",
    "(.*)/components/ui/Tabs(\\.tsx?)?$":
      "<rootDir>/src/test-utils/tabsMock.js",
    // GlobalStats component mock
    "^@/components/contribution/GlobalStats$":
      "<rootDir>/src/test-utils/globalStatsMock.js",
    "(.*)/contribution/GlobalStats(\\.tsx?)?$":
      "<rootDir>/src/test-utils/globalStatsMock.js",
    // RegionFilter component mock
    "^@/components/contribution/RegionFilter$":
      "<rootDir>/src/test-utils/regionFilterMock.js",
    "(.*)/contribution/RegionFilter(\\.tsx?)?$":
      "<rootDir>/src/test-utils/regionFilterMock.js",
    // TimeRangeFilter component mock
    "^@/components/contribution/TimeRangeFilter$":
      "<rootDir>/src/test-utils/timeRangeFilterMock.js",
    "(.*)/contribution/TimeRangeFilter(\\.tsx?)?$":
      "<rootDir>/src/test-utils/timeRangeFilterMock.js",
    // leaderboardExport utility mock
    "^@/utils/leaderboardExport$":
      "<rootDir>/src/test-utils/leaderboardExportMock.js",
    "(.*)/utils/leaderboardExport(\\.tsx?)?$":
      "<rootDir>/src/test-utils/leaderboardExportMock.js",
    // Layout sub-component mocks (also match relative imports e.g. "./Logo")
    "(.*)/Logo(\\.tsx?)?$": "<rootDir>/src/test-utils/logoMock.js",
    "^\\./SettingsMenu(\\.tsx?)?$":
      "<rootDir>/src/test-utils/settingsMenuMock.js",
    // Broader context patterns for relative imports within context files
    "(.*)/ToastContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/toastContextMock.js",
    // Auth context and hook mocks
    "^@/contexts/AuthContext$": "<rootDir>/src/test-utils/authContextMock.js",
    "(.*)/contexts/AuthContext(\\.tsx?)?$":
      "<rootDir>/src/test-utils/authContextMock.js",
    "^@/hooks/useAuth$": "<rootDir>/src/test-utils/authContextMock.js",
    "(.*)/hooks/useAuth(\\.tsx?)?$":
      "<rootDir>/src/test-utils/authContextMock.js",
    // useToast hook mock (same mock file as ToastContext)
    "^@/hooks/useToast$": "<rootDir>/src/test-utils/toastContextMock.js",
    "(.*)/hooks/useToast(\\.tsx?)?$":
      "<rootDir>/src/test-utils/toastContextMock.js",
    // Button and Input component mocks
    "^@/components/ui/Button$": "<rootDir>/src/test-utils/buttonMock.js",
    "(.*)/components/ui/Button(\\.tsx?)?$":
      "<rootDir>/src/test-utils/buttonMock.js",
    "^@/components/ui/Input$": "<rootDir>/src/test-utils/inputMock.js",
    "(.*)/components/ui/Input(\\.tsx?)?$":
      "<rootDir>/src/test-utils/inputMock.js",
    // Auth component mocks
    "^@/components/auth/PasswordStrengthBar$":
      "<rootDir>/src/test-utils/passwordStrengthBarMock.js",
    "(.*)/components/auth/PasswordStrengthBar(\\.tsx?)?$":
      "<rootDir>/src/test-utils/passwordStrengthBarMock.js",
    // Additional hook mocks
    "^@/hooks/useCountries$": "<rootDir>/src/test-utils/useCountriesMock.js",
    "(.*)/hooks/useCountries(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useCountriesMock.js",
    "^@/hooks/useCharityOrganizationSearch$":
      "<rootDir>/src/test-utils/useCharityOrganizationSearchMock.js",
    "(.*)/hooks/useCharityOrganizationSearch(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useCharityOrganizationSearchMock.js",
    // Validation utility mock
    "^@/utils/validation$": "<rootDir>/src/test-utils/validationMock.js",
    "(.*)/utils/validation(\\.tsx?)?$":
      "<rootDir>/src/test-utils/validationMock.js",
    // Chainlink config mock
    "^@/config/chainlink$": "<rootDir>/src/test-utils/chainlinkMock.js",
    "(.*)/config/chainlink(\\.tsx?)?$":
      "<rootDir>/src/test-utils/chainlinkMock.js",
    // GiveDashboard sub-component mocks
    "^@/components/settings/WalletAliasSettings$":
      "<rootDir>/src/test-utils/walletAliasSettingsComponentMock.js",
    "(.*)/settings/WalletAliasSettings(\\.tsx?)?$":
      "<rootDir>/src/test-utils/walletAliasSettingsComponentMock.js",
    "^@/components/settings/LinkedAccountsSection$":
      "<rootDir>/src/test-utils/linkedAccountsSectionMock.js",
    "^@/components/settings/SetPasswordSettings$":
      "<rootDir>/src/test-utils/setPasswordSettingsMock.js",
    "^@/components/settings/PrivacySettings$":
      "<rootDir>/src/test-utils/privacySettingsMock.js",
    "^@/components/donor/ScheduledDonations$":
      "<rootDir>/src/test-utils/scheduledDonationsComponentMock.js",
    "(.*)/donor/ScheduledDonations(\\.tsx?)?$":
      "<rootDir>/src/test-utils/scheduledDonationsComponentMock.js",
    "^@/components/volunteer/self-reported$":
      "<rootDir>/src/test-utils/selfReportedMock.js",
    "(.*)/volunteer/self-reported(\\.tsx?)?$":
      "<rootDir>/src/test-utils/selfReportedMock.js",
    // OpportunityForm mock — inline jest.mock() doesn't intercept in ESM mode
    "^@/components/volunteer/OpportunityForm$":
      "<rootDir>/src/test-utils/opportunityFormMock.js",
    "(.*)/components/volunteer/OpportunityForm(\\.tsx?)?$":
      "<rootDir>/src/test-utils/opportunityFormMock.js",
    // Hook mocks (admin) — only match @/ alias imports so hook unit tests
    // that use relative imports still get the real implementation.
    "^@/hooks/useAdminImpactMetrics$":
      "<rootDir>/src/test-utils/useAdminImpactMetricsMock.js",
    "^@/hooks/useAdminCharities$":
      "<rootDir>/src/test-utils/useAdminCharitiesMock.js",
    "^@/hooks/useAdminDonations$":
      "<rootDir>/src/test-utils/useAdminDonationsMock.js",
    "^@/hooks/useAdminDonors$":
      "<rootDir>/src/test-utils/useAdminDonorsMock.js",
    "^@/hooks/useAdminVolunteerValidation$":
      "<rootDir>/src/test-utils/useAdminVolunteerValidationMock.js",
    "^@/hooks/useAdminPlatformConfig$":
      "<rootDir>/src/test-utils/useAdminPlatformConfigMock.js",
    "^@/hooks/useAdminAuditLog$":
      "<rootDir>/src/test-utils/useAdminAuditLogMock.js",
    "^@/hooks/usePortfolioFunds$":
      "<rootDir>/src/test-utils/usePortfolioFundsMock.js",
    "^@/hooks/web3/usePortfolioFunds$":
      "<rootDir>/src/test-utils/usePortfolioFundsMock.js",
    "(.*)/hooks/web3/usePortfolioFunds(\\.tsx?)?$":
      "<rootDir>/src/test-utils/usePortfolioFundsMock.js",
    // Service mocks — only match @/ alias imports so service unit
    // tests that use relative imports still get the real implementation.
    "^@/services/charityOrganizationService$":
      "<rootDir>/src/test-utils/charityOrganizationServiceMock.js",
    "^@/services/adminDashboardService$":
      "<rootDir>/src/test-utils/adminDashboardServiceMock.js",
    "^@/services/adminContentModerationService$":
      "<rootDir>/src/test-utils/adminContentModerationServiceMock.js",
    "^@/services/adminCharityRequestsService$":
      "<rootDir>/src/test-utils/adminCharityRequestsServiceMock.js",
    "^@/services/adminReportsService$":
      "<rootDir>/src/test-utils/adminReportsServiceMock.js",
    "^@/services/adminDonationService$":
      "<rootDir>/src/test-utils/adminDonationServiceMock.js",
    "^@/services/adminAuditService$":
      "<rootDir>/src/test-utils/adminAuditServiceMock.js",
    "^@/services/adminPlatformConfigService$":
      "<rootDir>/src/test-utils/adminPlatformConfigServiceMock.js",
    "^@/services/adminSettingsService$":
      "<rootDir>/src/test-utils/adminSettingsServiceMock.js",
    "^@/services/privacyRequestService$":
      "<rootDir>/src/test-utils/privacyRequestServiceMock.js",
    "^@/services/charityDataService$":
      "<rootDir>/src/test-utils/charityDataServiceMock.js",
    "^@/services/charityProfileService$":
      "<rootDir>/src/test-utils/charityProfileServiceMock.js",
    "^@/services/charityVerificationService$":
      "<rootDir>/src/test-utils/charityVerificationServiceMock.js",
    "^@/services/walletDesignationService$":
      "<rootDir>/src/test-utils/walletDesignationServiceMock.js",
    // Discovery view component mocks — only @/ alias, so individual component tests
    // using relative imports still get the real implementation.
    "^@/components/discovery/PublicDiscoveryView$":
      "<rootDir>/src/test-utils/discoveryComponentsMock.js",
    "^@/components/discovery/DiscoveryShellSkeleton$":
      "<rootDir>/src/test-utils/discoveryComponentsMock.js",
    // Charity component mocks
    "^@/components/charity/CharityOrganizationCard$":
      "<rootDir>/src/test-utils/charityOrganizationCardMock.js",
    "(.*)/components/charity/CharityOrganizationCard(\\.tsx?)?$":
      "<rootDir>/src/test-utils/charityOrganizationCardMock.js",
    "^@/components/charity/CharityPageTemplate$":
      "<rootDir>/src/test-utils/charityPageTemplateMock.js",
    "(.*)/components/charity/CharityPageTemplate(\\.tsx?)?$":
      "<rootDir>/src/test-utils/charityPageTemplateMock.js",
    "^@/components/charity/CausePageTemplate$":
      "<rootDir>/src/test-utils/causePageTemplateMock.js",
    "(.*)/components/charity/CausePageTemplate(\\.tsx?)?$":
      "<rootDir>/src/test-utils/causePageTemplateMock.js",
    "^@/components/charity/CharityHeroBanner$":
      "<rootDir>/src/test-utils/charityHeroBannerMock.js",
    "(.*)/components/charity/CharityHeroBanner(\\.tsx?)?$":
      "<rootDir>/src/test-utils/charityHeroBannerMock.js",
    "^@/components/charity/UnclaimedProfileBanner$":
      "<rootDir>/src/test-utils/unclaimedProfileBannerMock.js",
    "(.*)/components/charity/UnclaimedProfileBanner(\\.tsx?)?$":
      "<rootDir>/src/test-utils/unclaimedProfileBannerMock.js",
    "^@/components/charity/OrgDetailsCard$":
      "<rootDir>/src/test-utils/orgDetailsCardMock.js",
    "(.*)/components/charity/OrgDetailsCard(\\.tsx?)?$":
      "<rootDir>/src/test-utils/orgDetailsCardMock.js",
    "^@/components/charity/PhotosCard$":
      "<rootDir>/src/test-utils/photosCardMock.js",
    "(.*)/components/charity/PhotosCard(\\.tsx?)?$":
      "<rootDir>/src/test-utils/photosCardMock.js",
    "^@/components/charity/DonateWidget$":
      "<rootDir>/src/test-utils/donateWidgetMock.js",
    "(.*)/components/charity/DonateWidget(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donateWidgetMock.js",
    "^@/components/charity/RequestCharityWidget$":
      "<rootDir>/src/test-utils/requestCharityWidgetMock.js",
    "(.*)/components/charity/RequestCharityWidget(\\.tsx?)?$":
      "<rootDir>/src/test-utils/requestCharityWidgetMock.js",
    // Donation modal mock
    "^@/components/web3/donation/DonationModal$":
      "<rootDir>/src/test-utils/donationModalMock.js",
    "(.*)/components/web3/donation/DonationModal(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donationModalMock.js",
    // UI component mocks (Skeleton, ScrollReveal)
    "^@/components/ui/Skeleton$": "<rootDir>/src/test-utils/skeletonMock.js",
    "(.*)/components/ui/Skeleton(\\.tsx?)?$":
      "<rootDir>/src/test-utils/skeletonMock.js",
    "^@/components/ui/ScrollReveal$":
      "<rootDir>/src/test-utils/scrollRevealMock.js",
    "(.*)/components/ui/ScrollReveal(\\.tsx?)?$":
      "<rootDir>/src/test-utils/scrollRevealMock.js",
    // Donor component mocks
    "^@/components/donor/DonorStats$":
      "<rootDir>/src/test-utils/donorStatsMock.js",
    "^@/components/donor/DonationHistory$":
      "<rootDir>/src/test-utils/donationHistoryMock.js",
    // Volunteer application form mock
    "^@/components/volunteer/VolunteerApplicationForm$":
      "<rootDir>/src/test-utils/volunteerApplicationFormMock.js",
    "(.*)/components/volunteer/VolunteerApplicationForm(\\.tsx?)?$":
      "<rootDir>/src/test-utils/volunteerApplicationFormMock.js",
    // Hook mocks (donor)
    "^@/hooks/useDonorData$": "<rootDir>/src/test-utils/useDonorDataMock.js",
    "(.*)/hooks/useDonorData(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useDonorDataMock.js",
    // Layout sub-component mocks
    "^@/components/layout/StaticPageLayout$":
      "<rootDir>/src/test-utils/staticPageLayoutMock.js",
    "(.*)/components/layout/StaticPageLayout(\\.tsx?)?$":
      "<rootDir>/src/test-utils/staticPageLayoutMock.js",
    // useWalletBalance hook mock
    "^@/hooks/useWalletBalance$":
      "<rootDir>/src/test-utils/useWalletBalanceMock.js",
    "(.*)/hooks/useWalletBalance(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useWalletBalanceMock.js",
    // useUnifiedAuth hook mock — only match @/ alias imports so hook unit tests
    // that use relative imports still get the real implementation.
    "^@/hooks/useUnifiedAuth$":
      "<rootDir>/src/test-utils/useUnifiedAuthMock.js",
    // useFeaturedCharities hook mock — only match @/ alias imports so hook unit
    // tests that use relative imports still get the real implementation.
    "^@/hooks/useFeaturedCharities$":
      "<rootDir>/src/test-utils/useFeaturedCharitiesMock.js",
    // useFeaturedCauses hook mock — only match @/ alias imports so hook unit
    // tests that use relative imports still get the real implementation.
    "^@/hooks/useFeaturedCauses$":
      "<rootDir>/src/test-utils/useFeaturedCausesMock.js",
    // useFeaturedPortfolioFunds hook mock — only match @/ alias imports so hook unit
    // tests that use relative imports still get the real implementation.
    "^@/hooks/useFeaturedPortfolioFunds$":
      "<rootDir>/src/test-utils/useFeaturedPortfolioFundsMock.js",
    // FormInput component mock
    "^@/components/ui/FormInput$": "<rootDir>/src/test-utils/formInputMock.js",
    "(.*)/components/ui/FormInput(\\.tsx?)?$":
      "<rootDir>/src/test-utils/formInputMock.js",
    // Auth component mocks (ForgotPassword, DonorRegistration, CharityVettingForm, etc.)
    "^@/components/auth/ForgotPassword$":
      "<rootDir>/src/test-utils/forgotPasswordMock.js",
    "(.*)/components/auth/ForgotPassword(\\.tsx?)?$":
      "<rootDir>/src/test-utils/forgotPasswordMock.js",
    "^@/components/auth/DonorRegistration$":
      "<rootDir>/src/test-utils/donorRegistrationMock.js",
    "(.*)/components/auth/DonorRegistration(\\.tsx?)?$":
      "<rootDir>/src/test-utils/donorRegistrationMock.js",
    "^@/components/auth/CharityVettingForm$":
      "<rootDir>/src/test-utils/charityVettingFormMock.js",
    "(.*)/components/auth/CharityVettingForm(\\.tsx?)?$":
      "<rootDir>/src/test-utils/charityVettingFormMock.js",
    "^@/components/auth/CharityOrganizationSearch$":
      "<rootDir>/src/test-utils/charityOrganizationSearchMock.js",
    "(.*)/components/auth/CharityOrganizationSearch(\\.tsx?)?$":
      "<rootDir>/src/test-utils/charityOrganizationSearchMock.js",
    "^@/components/auth/CharityClaimForm$":
      "<rootDir>/src/test-utils/charityClaimFormMock.js",
    "(.*)/components/auth/CharityClaimForm(\\.tsx?)?$":
      "<rootDir>/src/test-utils/charityClaimFormMock.js",
    // Self-reported hours hook mock
    "^@/hooks/useSelfReportedHours$":
      "<rootDir>/src/test-utils/useSelfReportedHoursMock.js",
    "(.*)/hooks/useSelfReportedHours(\\.tsx?)?$":
      "<rootDir>/src/test-utils/useSelfReportedHoursMock.js",
    // Generic path mapping
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/src/test-utils/styleMock.js",
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/src/test-utils/fileMock.js",
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^isows$": "<rootDir>/src/test-utils/isowsMock.js",
  },
  setupFiles: ["<rootDir>/src/test-utils/jest.env-setup.js"],
  setupFilesAfterEnv: ["<rootDir>/src/test-utils/jest.setup.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/test-utils/**/*",
    "!src/**/__tests__/**/*",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.stories.tsx",
    "!src/types/**/*",
    "src/types/chains.ts",
    "!src/mocks/**/*",
  ],
  coverageReporters: ["text", "lcov", "json", "html"],
  coverageDirectory: "coverage",
  // Coverage thresholds enforced by SonarCloud new-code quality gate
  // coverageThreshold: {},
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node", "mjs"],
  testPathIgnorePatterns: ["/node_modules/", "/test/", "/dist/", "/build/"],
  transformIgnorePatterns: [
    "node_modules/(?!(@supabase|@tanstack|lucide-react|viem|ethers|buffer|fp-ts|isows)/)",
  ],
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
};
