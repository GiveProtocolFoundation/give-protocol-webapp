import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as Sentry from "@sentry/react";
import { ToastProvider } from "./contexts/ToastContext";
import { AuthProvider } from "./contexts/AuthContext";
import { Web3Provider } from "./contexts/Web3Context";
import { ChainProvider } from "./contexts/ChainContext";
import { MultiChainProvider } from "./contexts/MultiChainContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { AppRoutes } from "./routes";
import { Layout } from "./components/layout";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SentryFallback } from "./components/SentryFallback";
import { useSafeAutoConnect } from "./hooks/useSafeAutoConnect";
import { useWalletAuthSync } from "./hooks/useWalletAuthSync";
import { ConsentProvider } from "./lib/consent/ConsentProvider";
import { CookieBanner } from "./components/consent/CookieBanner";
import { useGA4Loader } from "./lib/consent/useGA4Loader";
import { useGAConsentBridge } from "./lib/consent/useGAConsentBridge";
import { MonitoringService } from "./utils/monitoring";
import { ENV } from "./config/env";

// Initialize monitoring if enabled
if (ENV.MONITORING_API_KEY && ENV.MONITORING_APP_ID) {
  MonitoringService.getInstance({
    apiKey: ENV.MONITORING_API_KEY,
    appId: ENV.MONITORING_APP_ID,
    environment: ENV.MONITORING_ENVIRONMENT,
    enabledMonitors: ENV.MONITORING_ENABLED_MONITORS,
  });
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Core context providers
const CoreProviders = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>
    <ToastProvider>{children}</ToastProvider>
  </QueryClientProvider>
);

// Auth and settings providers (max 4 levels)
const AuthSettingsProviders = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>
    <SettingsProvider>
      <CurrencyProvider>{children}</CurrencyProvider>
    </SettingsProvider>
  </AuthProvider>
);

// Chain and Web3 providers (max 3 levels)
const ChainWeb3Providers = ({ children }: { children: React.ReactNode }) => (
  <ChainProvider>
    <MultiChainProvider>
      <Web3Provider>{children}</Web3Provider>
    </MultiChainProvider>
  </ChainProvider>
);

// Bridges wallet disconnect events to auth logout
const WalletAuthSync = () => {
  useWalletAuthSync();
  return null;
};

// Gates GA4 script load on analytics consent and syncs consent state to gtag
const GA4Bridge = () => {
  useGA4Loader();
  useGAConsentBridge();
  return null;
};

// Auth and Web3 providers combined
const AuthWeb3Providers = ({ children }: { children: React.ReactNode }) => (
  <AuthSettingsProviders>
    <ChainWeb3Providers>
      <WalletAuthSync />
      {children}
    </ChainWeb3Providers>
  </AuthSettingsProviders>
);

// Combined providers component (ConsentProvider wraps everything so
// the banner and footer link can reach useConsent() from anywhere in the tree)
const AppProviders = ({ children }: { children: React.ReactNode }) => (
  <ConsentProvider>
    <GA4Bridge />
    <CoreProviders>
      <AuthWeb3Providers>{children}</AuthWeb3Providers>
    </CoreProviders>
  </ConsentProvider>
);

// Safe auto-connect wrapper
const SafeAutoConnectWrapper = ({
  children,
}: {
  children: React.ReactElement;
}) => {
  useSafeAutoConnect();
  return children;
};

// Router wrapper component (Router is now provided by entry files)
const AppRouter = () => (
  <SafeAutoConnectWrapper>
    <>
      <Layout>
        <AppRoutes />
      </Layout>
      <CookieBanner />
    </>
  </SafeAutoConnectWrapper>
);

/**
 * Main application component that sets up all providers, routing, and error boundaries.
 * Initializes monitoring, React Query, authentication, Web3, and global error handling.
 *
 * @function App
 * @returns {JSX.Element} The complete application with all providers and routing
 * @example
 * ```typescript
 * // App entry point in main.tsx
 * import App from './App';
 *
 * createRoot(document.getElementById('root')!).render(
 *   <React.StrictMode>
 *     <App />
 *   </React.StrictMode>
 * );
 * ```
 */
function App() {
  return (
    <Sentry.ErrorBoundary fallback={SentryFallback} showDialog={false}>
      <ErrorBoundary>
        <AppProviders>
          <AppRouter />
        </AppProviders>
      </ErrorBoundary>
    </Sentry.ErrorBoundary>
  );
}

export default App;
