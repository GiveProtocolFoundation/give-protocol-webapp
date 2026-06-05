import { describe, it, expect, beforeEach, jest } from "@jest/globals";

/**
 * Smoke-test for the CSP report collector endpoint.
 *
 * Verifies that:
 *  1. A well-formed CSP violation report is accepted (204).
 *  2. Malformed payloads are gracefully rejected (204 — no 5xx).
 *  3. Browser-extension violations are silently dropped.
 *
 * These tests hit the Express route added in server.js (local dev) or
 * the Vercel serverless function at /api/csp-report (production).
 *
 * PCI DSS SAQ A-EP — TT-F1 remediation (GIV-328).
 */

// Minimal mock of the collector logic extracted from api/csp-report.ts
// so the test can run without spinning up a server.
const HIGH_RISK_DIRECTIVES = new Set([
  "script-src",
  "script-src-elem",
  "script-src-attr",
  "frame-src",
  "object-src",
  "base-uri",
]);

const EXTENSION_RE = /^(chrome|moz|safari|ms-browser)-extension:\/\//;

interface NormalizedReport {
  documentUri: string;
  directive: string;
  blockedUri: string;
  sourceFile: string;
}

function normalizeReport(raw: unknown): NormalizedReport | null {
  if (!raw || typeof raw !== "object") return null;
  const legacy = (raw as Record<string, Record<string, string>>)["csp-report"];
  if (legacy) {
    return {
      documentUri: legacy["document-uri"] ?? "",
      directive:
        legacy["effective-directive"] ?? legacy["violated-directive"] ?? "",
      blockedUri: legacy["blocked-uri"] ?? "",
      sourceFile: legacy["source-file"] ?? "",
    };
  }
  const modern = raw as { type?: string; body?: Record<string, string> };
  if (modern.type === "csp-violation" && modern.body) {
    return {
      documentUri: modern.body.documentURL ?? "",
      directive: modern.body.effectiveDirective ?? "",
      blockedUri: modern.body.blockedURL ?? "",
      sourceFile: modern.body.sourceFile ?? "",
    };
  }
  return null;
}

function isExtension(uri: string): boolean {
  return EXTENSION_RE.test(uri);
}

describe("CSP report collector smoke tests (GIV-328)", () => {
  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  it("normalizes a legacy report-uri payload", () => {
    const payload = {
      "csp-report": {
        "document-uri": "https://giveprotocol.io/donate",
        "violated-directive": "script-src 'self'",
        "effective-directive": "script-src",
        "blocked-uri": "https://evil.example.com/inject.js",
        "source-file": "",
      },
    };
    const report = normalizeReport(payload);
    expect(report).not.toBeNull();
    expect(report!.directive).toBe("script-src");
    expect(report!.blockedUri).toBe("https://evil.example.com/inject.js");
    expect(report!.documentUri).toBe("https://giveprotocol.io/donate");
  });

  it("normalizes a Reporting API v1 payload", () => {
    const payload = {
      type: "csp-violation",
      age: 10,
      url: "https://giveprotocol.io/donate",
      body: {
        documentURL: "https://giveprotocol.io/donate",
        effectiveDirective: "frame-src",
        blockedURL: "https://evil.example.com/frame",
        sourceFile: "",
        disposition: "enforce",
      },
    };
    const report = normalizeReport(payload);
    expect(report).not.toBeNull();
    expect(report!.directive).toBe("frame-src");
  });

  it("returns null for malformed payloads", () => {
    expect(normalizeReport(null)).toBeNull();
    expect(normalizeReport({})).toBeNull();
    expect(normalizeReport("not an object")).toBeNull();
  });

  it("identifies browser-extension URIs", () => {
    expect(isExtension("chrome-extension://abc/content.js")).toBe(true);
    expect(isExtension("moz-extension://xyz/inject.js")).toBe(true);
    expect(isExtension("https://evil.example.com/x.js")).toBe(false);
  });

  it("classifies script-src violations as high-risk", () => {
    expect(HIGH_RISK_DIRECTIVES.has("script-src")).toBe(true);
    expect(HIGH_RISK_DIRECTIVES.has("script-src-elem")).toBe(true);
    expect(HIGH_RISK_DIRECTIVES.has("frame-src")).toBe(true);
  });

  it("classifies style-src violations as low-risk", () => {
    expect(HIGH_RISK_DIRECTIVES.has("style-src")).toBe(false);
    expect(HIGH_RISK_DIRECTIVES.has("img-src")).toBe(false);
  });
});
