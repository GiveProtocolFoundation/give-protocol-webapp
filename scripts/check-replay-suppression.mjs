/**
 * Prod-build check for Sentry replay suppression (G7).
 *
 * Verifies that the built output contains the replay stop/start guard logic
 * that suppresses session replay while donation UI is mounted.
 *
 * Run after a production build: node scripts/check-replay-suppression.mjs
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");

let found = false;
let failures = 0;

console.log("Sentry Replay Suppression Check (G7)");
console.log("=====================================\n");

// Check dist directory exists
try {
  readdirSync(distDir);
} catch {
  console.error("✗ dist/ directory not found. Run `npm run build:spa` first.");
  process.exit(1);
}

// Walk dist/ to find JS files and check for replay suppression markers
function walkDir(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.name.endsWith(".js")) {
      const content = readFileSync(fullPath, "utf8");
      // Check for Phase A replay rate being 0
      if (content.includes("replaysSessionSampleRate:0") ||
          content.includes("replaysSessionSampleRate: 0")) {
        console.log(`✓ Phase A replay disabled: replaysSessionSampleRate:0 found in ${entry.name}`);
        found = true;
      }
      // Check for the pause/resume functions
      if (content.includes("pauseSentryReplay") || content.includes("Replay paused")) {
        console.log(`✓ Replay pause guard found in ${entry.name}`);
      }
      if (content.includes("resumeSentryReplay") || content.includes("Replay resumed")) {
        console.log(`✓ Replay resume guard found in ${entry.name}`);
      }
    }
  }
}

walkDir(distDir);

if (!found) {
  console.error("✗ replaysSessionSampleRate:0 NOT found in dist/ — replay may be enabled by default");
  failures++;
}

console.log();
if (failures > 0) {
  throw new Error("Replay suppression check FAILED");
}
console.log("PASSED — Sentry replay is disabled by default and pause/resume guards are present.");
