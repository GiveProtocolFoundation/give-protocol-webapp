#!/usr/bin/env node
/**
 * CSP consistency validator — ensures all CSP locations match the canonical
 * meta tag in index.html. Run via `node scripts/validate-csp.mjs`.
 *
 * Exits 0 on success, 1 if any location diverges or contains forbidden tokens.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

// ── helpers ──────────────────────────────────────────────────────────────────

/** Normalise a raw CSP string so whitespace differences don't cause false negatives */
function normalise(raw) {
  return raw
    .replace(/\s+/g, " ")
    .trim()
    .split(";")
    .map((d) => d.trim())
    .filter(Boolean)
    .sort()
    .join("; ");
}

/** Extract the CSP value from the index.html meta tag (canonical) */
function extractFromIndexHtml() {
  const html = readFileSync(resolve(root, "index.html"), "utf8");
  const match = html.match(
    /http-equiv="Content-Security-Policy"\s*content="([^"]+)"/s,
  );
  if (!match) throw new Error("Could not find CSP meta tag in index.html");
  return match[1];
}

/** Extract the CSP from nginx.conf add_header directive */
function extractFromNginx() {
  const conf = readFileSync(resolve(root, "nginx.conf"), "utf8");
  const match = conf.match(
    /add_header\s+Content-Security-Policy\s+"([^"]+)"\s+always;/s,
  );
  if (!match) throw new Error("Could not find CSP header in nginx.conf");
  return match[1];
}

/** Extract the CSP from vercel.json headers */
function extractFromVercel() {
  const json = JSON.parse(readFileSync(resolve(root, "vercel.json"), "utf8"));
  const globalHeaders = json.headers?.find(
    (h) => h.source === "/(.*)",
  )?.headers;
  if (!globalHeaders) throw new Error("No global headers in vercel.json");
  const csp = globalHeaders.find((h) => h.key === "Content-Security-Policy");
  if (!csp) throw new Error("No CSP header in vercel.json");
  return csp.value;
}

/** Extract the CSP from netlify.toml headers */
function extractFromNetlify() {
  const toml = readFileSync(resolve(root, "netlify.toml"), "utf8");
  const match = toml.match(/Content-Security-Policy\s*=\s*"([^"]+)"/s);
  if (!match) throw new Error("Could not find CSP header in netlify.toml");
  return match[1];
}

// ── main ─────────────────────────────────────────────────────────────────────

const FORBIDDEN_SCRIPT_TOKENS = ["'unsafe-inline'", "'unsafe-eval'"];
let failures = 0;

console.log("CSP Consistency Validator");
console.log("========================\n");

// 1. Extract canonical CSP
let canonical;
try {
  canonical = extractFromIndexHtml();
  console.log("✓ Canonical CSP extracted from index.html");
} catch (e) {
  console.error(`✗ ${e.message}`);
  process.exit(1);
}

const normCanonical = normalise(canonical);

// 2. Forbidden-token check on canonical script-src
const scriptSrc = canonical.match(/script-src\s+([^;]+)/)?.[1] || "";
for (const token of FORBIDDEN_SCRIPT_TOKENS) {
  if (scriptSrc.includes(token)) {
    console.error(`✗ FORBIDDEN: index.html script-src contains ${token}`);
    failures++;
  }
}

// 3. Compare other locations
const locations = [
  { name: "nginx.conf", extract: extractFromNginx },
  { name: "vercel.json", extract: extractFromVercel },
  { name: "netlify.toml", extract: extractFromNetlify },
];

for (const loc of locations) {
  try {
    const raw = loc.extract();
    const norm = normalise(raw);

    // Check forbidden tokens
    const locScriptSrc = raw.match(/script-src\s+([^;]+)/)?.[1] || "";
    for (const token of FORBIDDEN_SCRIPT_TOKENS) {
      if (locScriptSrc.includes(token)) {
        console.error(`✗ FORBIDDEN: ${loc.name} script-src contains ${token}`);
        failures++;
      }
    }

    // Check consistency with canonical
    if (norm === normCanonical) {
      console.log(`✓ ${loc.name} matches canonical`);
    } else {
      console.error(`✗ ${loc.name} DIVERGES from canonical`);
      // Show directive-level diff
      const canonDirs = new Set(normCanonical.split("; "));
      const locDirs = new Set(norm.split("; "));
      for (const d of canonDirs) {
        if (!locDirs.has(d)) console.error(`  missing in ${loc.name}: ${d}`);
      }
      for (const d of locDirs) {
        if (!canonDirs.has(d)) console.error(`  extra in ${loc.name}:   ${d}`);
      }
      failures++;
    }
  } catch (e) {
    console.error(`✗ ${loc.name}: ${e.message}`);
    failures++;
  }
}

// 4. Summary
console.log();
if (failures > 0) {
  console.error(`FAILED — ${failures} issue(s) found.`);
  process.exit(1);
} else {
  console.log("PASSED — all CSP locations are consistent and hardened.");
}
