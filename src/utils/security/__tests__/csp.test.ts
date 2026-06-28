import { describe, it, expect, beforeEach, jest } from "@jest/globals";

jest.mock("../csrf", () => ({
  CSRFProtection: {
    getInstance: jest.fn().mockReturnValue({
      getToken: jest.fn().mockReturnValue("mock-csrf-token"),
      getHeaders: jest
        .fn()
        .mockReturnValue({ "X-CSRF-Token": "mock-csrf-token" }),
      validate: jest.fn().mockResolvedValue(true),
    }),
  },
}));

jest.mock("../sanitizer", () => ({
  InputSanitizer: {
    getInstance: jest.fn().mockReturnValue({
      sanitizeText: jest.fn().mockImplementation((input: unknown) => input),
      sanitizeObject: jest.fn().mockImplementation((obj: unknown) => obj),
    }),
  },
}));

jest.mock("../rateLimiter", () => ({
  RateLimiter: {
    getInstance: jest.fn().mockReturnValue({
      isRateLimited: jest.fn().mockReturnValue(false),
    }),
  },
}));

jest.mock("@/utils/logger", () => ({
  Logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

import { SecurityManager } from "../index";

// SHA-256 hash of the single consolidated inline script in index.html (PCI DSS SAQ A-EP requirement 6.4.3)
const INLINE_SCRIPT_HASHES = [
  // Consolidated GTM + gtag + Silktide consent script
  "sha256-FE0b/aIu3qmhPRVUXn/+TXDCpLi5oRzW6cwcyknX2PU=",
];

type SecurityManagerPrivate = {
  instance: SecurityManager | undefined;
  securityHeaders: Record<string, string>;
  trustedDomains: string[];
};

/** Extract the value of a named CSP directive from a full CSP string. */
function getDirective(csp: string, directive: string): string {
  const match = csp.match(new RegExp(`${directive}\\s+([^;]+)`));
  return match ? match[1] : "";
}

describe("SecurityManager CSP (PCI DSS SAQ A-EP Requirement 6.4.3)", () => {
  beforeEach(() => {
    (SecurityManager as unknown as SecurityManagerPrivate).instance = undefined;
    global.fetch = jest.fn() as jest.Mock;
  });

  it("does not include unsafe-inline in script-src", () => {
    const manager = SecurityManager.getInstance();
    const csp = (manager as unknown as SecurityManagerPrivate).securityHeaders[
      "Content-Security-Policy"
    ];
    const scriptSrc = getDirective(csp, "script-src");
    expect(scriptSrc).not.toContain("'unsafe-inline'");
  });

  it("does not include unsafe-eval in script-src", () => {
    const manager = SecurityManager.getInstance();
    const csp = (manager as unknown as SecurityManagerPrivate).securityHeaders[
      "Content-Security-Policy"
    ];
    const scriptSrc = getDirective(csp, "script-src");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
  });

  it("includes the consolidated inline script SHA-256 hash in script-src", () => {
    const manager = SecurityManager.getInstance();
    const csp = (manager as unknown as SecurityManagerPrivate).securityHeaders[
      "Content-Security-Policy"
    ];
    for (const hash of INLINE_SCRIPT_HASHES) {
      expect(csp).toContain(`'${hash}'`);
    }
  });

  it("includes secure.helcim.app in script-src for payment processing", () => {
    const manager = SecurityManager.getInstance();
    const csp = (manager as unknown as SecurityManagerPrivate).securityHeaders[
      "Content-Security-Policy"
    ];
    expect(csp).toContain("secure.helcim.app");
  });

  it("retains self as allowed script source", () => {
    const manager = SecurityManager.getInstance();
    const csp = (manager as unknown as SecurityManagerPrivate).securityHeaders[
      "Content-Security-Policy"
    ];
    expect(csp).toContain("script-src 'self'");
  });

  it("includes secure.helcim.app in trusted domains", () => {
    const manager = SecurityManager.getInstance();
    const domains = (manager as unknown as SecurityManagerPrivate)
      .trustedDomains;
    expect(domains).toContain("secure.helcim.app");
  });

  it("returns the same instance on repeated calls (singleton)", () => {
    const instance1 = SecurityManager.getInstance();
    const instance2 = SecurityManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it("includes report-uri directive pointing to /api/csp-report", () => {
    const manager = SecurityManager.getInstance();
    const csp = (manager as unknown as SecurityManagerPrivate).securityHeaders[
      "Content-Security-Policy"
    ];
    expect(csp).toContain("report-uri /api/csp-report");
  });

  it("includes report-to directive referencing csp-endpoint group", () => {
    const manager = SecurityManager.getInstance();
    const csp = (manager as unknown as SecurityManagerPrivate).securityHeaders[
      "Content-Security-Policy"
    ];
    expect(csp).toContain("report-to csp-endpoint");
  });
});
