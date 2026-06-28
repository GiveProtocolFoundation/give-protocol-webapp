import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { RouteTransition } from "./RouteTransition";
import { ProtectedRoute } from "./ProtectedRoute";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

// Eagerly load critical routes
import Register from "@/pages/Register";
import Auth from "@/pages/Auth";

// Lazy load unified auth routes
const AuthCallback = lazy(() => import("@/pages/AuthCallback"));
const RegistrationSuccess = lazy(() => import("@/pages/RegistrationSuccess"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));

// Lazy load other routes
const Home = lazy(() => import("@/pages/Home"));
const AppDashboard = lazy(() => import("@/pages/AppDashboard"));

const SentryTest = lazy(() => import("@/pages/SentryTest"));
const GlobalWaterFoundation = lazy(
  () => import("@/pages/charities/GlobalWaterFoundation"),
);
const EducationForAll = lazy(() => import("@/pages/charities/EducationForAll"));
const ClimateActionNow = lazy(
  () => import("@/pages/charities/ClimateActionNow"),
);
const CharityProfilePage = lazy(() => import("@/pages/CharityProfilePage"));
const ClaimCharity = lazy(() => import("@/pages/ClaimCharity"));
const EnvironmentPortfolioDetail = lazy(
  () => import("@/pages/portfolio/EnvironmentPortfolioDetail"),
);
const EducationPortfolioDetail = lazy(
  () => import("@/pages/portfolio/EducationPortfolioDetail"),
);
const PovertyPortfolioDetail = lazy(
  () => import("@/pages/portfolio/PovertyPortfolioDetail"),
);
const ContributionTracker = lazy(() => import("@/pages/ContributionTracker"));
const VolunteerOpportunities = lazy(
  () => import("@/pages/VolunteerOpportunities"),
);
const About = lazy(() => import("@/pages/About"));
const Legal = lazy(() => import("@/pages/Legal"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Governance = lazy(() => import("@/pages/Governance"));
const GiveDashboard = lazy(() => import("@/pages/GiveDashboard"));
const CharityPortal = lazy(() => import("@/pages/CharityPortal"));
const CreateOpportunity = lazy(
  () => import("@/pages/charity/CreateOpportunity"),
);
const CreateCause = lazy(() => import("@/pages/charity/CreateCause"));
const ConfirmWalletDesignation = lazy(
  () => import("@/pages/charity/ConfirmWalletDesignation"),
);
const CancelWalletChange = lazy(
  () => import("@/pages/charity/CancelWalletChange"),
);
const NotFound = lazy(() => import("@/pages/NotFound"));
const VerifyContribution = lazy(
  () => import("@/pages/volunteer/VerifyContribution"),
);
const ScheduledDonationsPage = lazy(
  () => import("@/pages/donor/ScheduledDonationsPage"),
);
const Documentation = lazy(() => import("@/pages/Documentation"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const DashboardSettings = lazy(() => import("@/pages/DashboardSettings"));

// Admin routes
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminCharityManagement = lazy(
  () => import("@/pages/admin/AdminCharityManagement"),
);
const AdminDonorManagement = lazy(
  () => import("@/pages/admin/AdminDonorManagement"),
);
const AdminDonationMonitoring = lazy(
  () => import("@/pages/admin/AdminDonationMonitoring"),
);
const CharityRegistration = lazy(
  () => import("@/pages/admin/CharityRegistration"),
);
const CharityDiagnostics = lazy(
  () => import("@/pages/admin/CharityDiagnostics"),
);
const TokenManagement = lazy(() => import("@/pages/admin/TokenManagement"));
const ImpactMetricsAdmin = lazy(
  () => import("@/pages/admin/ImpactMetricsAdmin"),
);
const AdminVolunteerValidation = lazy(
  () => import("@/pages/admin/AdminVolunteerValidation"),
);
const AdminPlatformConfig = lazy(
  () => import("@/pages/admin/AdminPlatformConfig"),
);
const AdminContentModeration = lazy(
  () => import("@/pages/admin/AdminContentModeration"),
);
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminPortfolioFunds = lazy(
  () => import("@/pages/admin/AdminPortfolioFunds"),
);
const AdminPlatformNews = lazy(() => import("@/pages/admin/AdminPlatformNews"));
const AdminCharityRequests = lazy(
  () => import("@/pages/admin/AdminCharityRequests"),
);
const _SimpleTokenCheck = lazy(() => import("@/pages/admin/SimpleTokenCheck"));

// Lazy load cause pages
const CleanWaterInitiative = lazy(
  () => import("@/pages/causes/CleanWaterInitiative"),
);
const EducationAccessProgram = lazy(
  () => import("@/pages/causes/EducationAccessProgram"),
);
const ReforestationProject = lazy(
  () => import("@/pages/causes/ReforestationProject"),
);
const CauseDetail = lazy(() => import("@/pages/causes/CauseDetail"));

/** Full-screen centered loading spinner used as a Suspense fallback. */
const LoadingFallback = () => (
  <div className="flex min-h-screen items-center justify-center">
    <LoadingSpinner size="lg" />
  </div>
);

/**
 * Main application routing component that defines all routes and navigation.
 * Handles lazy loading, route protection, and transitions between pages.
 *
 * @function AppRoutes
 * @returns {JSX.Element} The complete application routing structure
 * @example
 * ```typescript
 * // Used in App.tsx as the main router
 * function App() {
 *   return (
 *     <BrowserRouter>
 *       <Layout>
 *         <AppRoutes />
 *       </Layout>
 *     </BrowserRouter>
 *   );
 * }
 * ```
 */
export function AppRoutes() {
  const { user: _user } = useAuth(); // Prefixed as unused

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        <Route
          path="/"
          element={
            <RouteTransition>
              <Home />
            </RouteTransition>
          }
        />

        {/* Admin Routes */}
        <Route
          path="/admin/charity-registration"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <CharityRegistration />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/admin/charity-diagnostics"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <CharityDiagnostics />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/admin/token-management"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <TokenManagement />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/admin/charities"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminCharityManagement />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/charity-requests"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminCharityRequests />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/donors"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDonorManagement />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/donations"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDonationMonitoring />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/impact-metrics"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <ImpactMetricsAdmin />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/volunteer-validation"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminVolunteerValidation />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminPlatformConfig />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/content-moderation"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminContentModeration />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminReports />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/portfolio-funds"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminPortfolioFunds />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/platform-news"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminPlatformNews />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <ProtectedRoute requiredRoles={["admin"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <AdminDashboard />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />

        {/* Cause Routes */}
        <Route
          path="/causes/clean-water-initiative"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <CleanWaterInitiative />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/causes/education-access-program"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <EducationAccessProgram />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/causes/reforestation-project"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <ReforestationProject />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/causes/:id"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <CauseDetail />
              </Suspense>
            </RouteTransition>
          }
        />

        {/* Charity Routes */}
        <Route
          path="/charity/global-water-foundation"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <GlobalWaterFoundation />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/charity/education-for-all"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <EducationForAll />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/charity/climate-action-now"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <ClimateActionNow />
              </Suspense>
            </RouteTransition>
          }
        />

        <Route
          path="/charity/:ein"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <CharityProfilePage />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/claim/:ein"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <ClaimCharity />
              </Suspense>
            </RouteTransition>
          }
        />

        {/* Portfolio Routes */}
        <Route
          path="/portfolio/environmental"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <EnvironmentPortfolioDetail />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/portfolio/education"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <EducationPortfolioDetail />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/portfolio/poverty"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <PovertyPortfolioDetail />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/portfolio/poverty-relief"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <PovertyPortfolioDetail />
              </Suspense>
            </RouteTransition>
          }
        />

        {/* Volunteer Verification Routes */}
        <Route
          path="/verify/:hash"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <VerifyContribution />
              </Suspense>
            </RouteTransition>
          }
        />

        {/* Charity Management Routes */}
        <Route
          path="/charity-portal/create-opportunity"
          element={
            <ProtectedRoute requiredRoles={["charity"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <CreateOpportunity />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/charity-portal/create-cause"
          element={
            <ProtectedRoute requiredRoles={["charity"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <CreateCause />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        {/*
          Public route (no auth) — landing page for the wallet-designation
          confirmation magic-link emailed to the charity's authorized signer.
        */}
        <Route
          path="/charity-portal/confirm-wallet"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <ConfirmWalletDesignation />
              </Suspense>
            </RouteTransition>
          }
        />
        {/* Public route — landing page for the cancel-pending-change magic link. */}
        <Route
          path="/charity-portal/cancel-wallet-change"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <CancelWalletChange />
              </Suspense>
            </RouteTransition>
          }
        />

        {/* Donor Routes */}
        <Route
          path="/scheduled-donations"
          element={
            <ProtectedRoute requiredRoles={["donor"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <ScheduledDonationsPage />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />

        {/* Settings */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <DashboardSettings />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />

        {/* Other Routes */}
        <Route
          path="/privacy"
          element={
            <RouteTransition>
              <Privacy />
            </RouteTransition>
          }
        />
        <Route
          path="/sentry-test"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <SentryTest />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/browse"
          element={
            <RouteTransition>
              <AppDashboard />
            </RouteTransition>
          }
        />
        <Route
          path="/give-dashboard/*"
          element={
            <ProtectedRoute requiredRoles={["donor"]} promptWallet>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <GiveDashboard />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/donor-portal"
          element={
            <ProtectedRoute requiredRoles={["donor"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <Navigate to="/give-dashboard" replace />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route
          path="/charity-portal/*"
          element={
            <ProtectedRoute requiredRoles={["charity"]}>
              <RouteTransition>
                <Suspense fallback={<LoadingFallback />}>
                  <CharityPortal />
                </Suspense>
              </RouteTransition>
            </ProtectedRoute>
          }
        />
        <Route path="/app" element={<Navigate to="/browse" replace />} />
        <Route
          path="/opportunities"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <VolunteerOpportunities />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/contributions"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <ContributionTracker />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/governance"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <Governance />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/about"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <About />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/faq"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <FAQ />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/docs"
          element={<Navigate to="/documentation" replace />}
        />
        <Route
          path="/documentation"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <Documentation />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/legal"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <Legal />
              </Suspense>
            </RouteTransition>
          }
        />
        {/* Unified auth routes */}
        <Route path="/auth" element={<Auth />} />
        <Route path="/auth/signup" element={<Register />} />
        <Route
          path="/auth/callback"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <AuthCallback />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/auth/registration-success"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <RegistrationSuccess />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/auth/reset-password"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <ResetPassword />
              </Suspense>
            </RouteTransition>
          }
        />
        <Route
          path="/auth/charity"
          element={<Navigate to="/auth/signup?type=charity" replace />}
        />

        {/* Legacy auth redirects */}
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route
          path="/register"
          element={<Navigate to="/auth/signup" replace />}
        />
        <Route
          path="*"
          element={
            <RouteTransition>
              <Suspense fallback={<LoadingFallback />}>
                <NotFound />
              </Suspense>
            </RouteTransition>
          }
        />
      </Routes>
    </Suspense>
  );
}
