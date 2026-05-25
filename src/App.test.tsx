import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// All heavy mocks are handled via moduleNameMapper in jest.config.mjs:
// - routes → routesMock.js (AppRoutes renders data-testid="app-routes")
// - components/layout → layoutMock.js (Layout renders data-testid="layout")
// - components/ErrorBoundary → errorBoundaryMock.js (pass-through)
// - hooks/useSafeAutoConnect → safeAutoConnectMock.js (no-op)
// - hooks/useWalletAuthSync → walletAuthSyncMock.js (no-op)
// - utils/monitoring → monitoringMock.js
// - contexts/ToastContext, SettingsContext, MultiChainContext, Web3Context,
//   ChainContext, CurrencyContext → pass-through provider mocks
// AuthContext and QueryClientProvider are real (supabase is mocked)

import App from "./App";

describe("App", () => {
  it("should render without crashing", () => {
    const { getByTestId } = render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );

    expect(getByTestId("layout")).toBeInTheDocument();
    expect(getByTestId("app-routes")).toBeInTheDocument();
  });
});
