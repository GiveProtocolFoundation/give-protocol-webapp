/**
 * Negative test for CSP inventory allowlist (G4).
 *
 * Temporarily injects an unlisted source into the canonical CSP and verifies
 * that validate-csp.mjs fails. Run via: node scripts/validate-csp-negative.test.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const indexPath = resolve(root, "index.html");

// Save original
const original = readFileSync(indexPath, "utf8");
let passed = true;

try {
  // Inject an unlisted script-src source
  const injected = original.replace(
    "script-src 'self'",
    "script-src 'self' https://evil.example.com",
  );
  writeFileSync(indexPath, injected, "utf8");

  try {
    execSync("node scripts/validate-csp.mjs", { cwd: root, stdio: "pipe" });
    // If the above doesn't throw, the validator incorrectly passed
    console.error("✗ NEGATIVE TEST FAILED: validator did not reject unlisted source https://evil.example.com");
    passed = false;
  } catch {
    // Expected — the validator should fail
    console.log("✓ Validator correctly rejects an unlisted script-src source");
  }

  // Also test unlisted frame-src
  const injected2 = original.replace(
    "frame-src 'self'",
    "frame-src 'self' https://evil-frame.example.com",
  );
  writeFileSync(indexPath, injected2, "utf8");

  try {
    execSync("node scripts/validate-csp.mjs", { cwd: root, stdio: "pipe" });
    console.error("✗ NEGATIVE TEST FAILED: validator did not reject unlisted frame-src source");
    passed = false;
  } catch {
    console.log("✓ Validator correctly rejects an unlisted frame-src source");
  }

  // Also test that the clean CSP passes
  writeFileSync(indexPath, original, "utf8");
  try {
    execSync("node scripts/validate-csp.mjs", { cwd: root, stdio: "pipe" });
    console.log("✓ Validator passes with clean CSP (positive control)");
  } catch (e) {
    console.error("✗ NEGATIVE TEST FAILED: validator rejected clean CSP");
    console.error(e.stdout?.toString() || e.stderr?.toString());
    passed = false;
  }
} finally {
  // Always restore original
  writeFileSync(indexPath, original, "utf8");
}

if (!passed) {
  throw new Error("CSP negative test FAILED");
}
console.log("\nAll negative tests passed.");
