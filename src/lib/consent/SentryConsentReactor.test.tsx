import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
} from "@jest/globals";
import { render, act } from "@testing-library/react";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  enableAnalyticsIntegrations,
  disableAnalyticsIntegrations,
} from "@/lib/sentry";
import { SentryConsentReactor } from "./SentryConsentReactor.js";
import { ConsentProvider, useConsent } from "./ConsentProvider.js";

// The global moduleNameMapper auto-mocks @/lib/sentry → sentryMock.js
// and @/contexts/AuthContext → authContextMock.js.
// enableAnalyticsIntegrations and disableAnalyticsIntegrations are jest.fn()
// in sentryMock. useAuth is a jest.fn() in authContextMock.

const mockUseAuth = useAuth as ReturnType<typeof import("@jest/globals").jest.fn>;
const mockEnable = enableAnalyticsIntegrations as ReturnType<typeof import("@jest/globals").jest.fn>;
const mockDisable = disableAnalyticsIntegrations as ReturnType<typeof import("@jest/globals").jest.fn>;

/** Component that exposes consent controls for tests */
function ConsentControls() {
  const { accept, decline } = useConsent();
  return (
    <>
      <button
        data-testid="accept"
        onClick={() => {
          accept({ analytics: true });
        }}
      >
        Accept
      </button>
      <button data-testid="decline" onClick={decline}>
        Decline
      </button>
    </>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <ConsentProvider>{children}</ConsentProvider>;
}

describe("SentryConsentReactor", () => {
  beforeEach(() => {
    localStorage.clear();
    mockEnable.mockClear();
    mockDisable.mockClear();
    mockUseAuth.mockReturnValue({
      user: { id: "user-123", email: "test@example.com" },
      userType: "donor",
      loading: false,
      error: null,
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      loginWithApple: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
      refreshSession: jest.fn(),
      register: jest.fn(),
      sendUsernameReminder: jest.fn(),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("does not call enable on mount when consent is undecided", () => {
    render(
      <Wrapper>
        <SentryConsentReactor />
      </Wrapper>,
    );

    expect(mockEnable).not.toHaveBeenCalled();
    expect(mockDisable).not.toHaveBeenCalled();
  });

  it("calls enableAnalyticsIntegrations when analytics is accepted", () => {
    render(
      <Wrapper>
        <SentryConsentReactor />
        <ConsentControls />
      </Wrapper>,
    );

    act(() => {
      document
        .querySelector('[data-testid="accept"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockEnable).toHaveBeenCalledTimes(1);
    expect(mockEnable).toHaveBeenCalledWith({
      id: "user-123",
      email: "test@example.com",
      type: "donor",
    });
  });

  it("calls disableAnalyticsIntegrations on consent withdrawal", () => {
    render(
      <Wrapper>
        <SentryConsentReactor />
        <ConsentControls />
      </Wrapper>,
    );

    act(() => {
      document
        .querySelector('[data-testid="accept"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockEnable).toHaveBeenCalledTimes(1);

    act(() => {
      document
        .querySelector('[data-testid="decline"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(mockDisable).toHaveBeenCalledTimes(1);
  });

  it("does not double-add integrations on re-render", () => {
    const { rerender } = render(
      <Wrapper>
        <SentryConsentReactor />
        <ConsentControls />
      </Wrapper>,
    );

    act(() => {
      document
        .querySelector('[data-testid="accept"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    rerender(
      <Wrapper>
        <SentryConsentReactor />
        <ConsentControls />
      </Wrapper>,
    );

    expect(mockEnable).toHaveBeenCalledTimes(1);
  });

  it("passes anonymous user when not logged in", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      userType: null,
      loading: false,
      error: null,
      login: jest.fn(),
      loginWithGoogle: jest.fn(),
      loginWithApple: jest.fn(),
      logout: jest.fn(),
      resetPassword: jest.fn(),
      refreshSession: jest.fn(),
      register: jest.fn(),
      sendUsernameReminder: jest.fn(),
    });

    render(
      <Wrapper>
        <SentryConsentReactor />
        <ConsentControls />
      </Wrapper>,
    );

    act(() => {
      document
        .querySelector('[data-testid="accept"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(mockEnable).toHaveBeenCalledWith({
      id: "anonymous",
    });
  });
});
