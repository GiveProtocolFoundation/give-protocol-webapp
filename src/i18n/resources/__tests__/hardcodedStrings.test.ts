import { readdirSync, readFileSync, writeFileSync } from "fs";
import { join, resolve, relative, dirname, sep } from "path";
import { fileURLToPath } from "url";
import { findHardcodedStrings } from "../../literalScanner";

/**
 * Hardcoded-string ratchet.
 *
 * Fails when a .tsx file renders user-facing text that does not go through
 * t(), beyond what the baseline already records for that file. The baseline
 * may only shrink: once a file is cleaned up, its count must be lowered too.
 *
 * To regenerate the baseline after removing hardcoded strings:
 *   UPDATE_I18N_BASELINE=1 npm test -- hardcodedStrings
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const srcDir = resolve(__dirname, "../../..");
const baselinePath = resolve(__dirname, "../../hardcodedStringsBaseline.json");

/**
 * Recursively collect .tsx source files, excluding tests.
 *
 * @param dir - Directory to walk.
 * @returns Absolute file paths.
 */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "__tests__" ||
        entry.name === "test-utils"
      ) {
        continue;
      }
      results.push(...collectTsxFiles(fullPath));
    } else if (
      entry.name.endsWith(".tsx") &&
      !entry.name.endsWith(".test.tsx") &&
      !entry.name.endsWith(".spec.tsx")
    ) {
      results.push(fullPath);
    }
  }
  return results;
}

describe("Hardcoded user-facing strings", () => {
  const counts: Record<string, number> = {};
  const details: Record<string, string[]> = {};

  beforeAll(() => {
    for (const file of collectTsxFiles(srcDir).sort()) {
      const found = findHardcodedStrings(readFileSync(file, "utf-8"), file);
      if (found.length === 0) continue;
      const rel = relative(srcDir, file).split(sep).join("/");
      counts[rel] = found.length;
      details[rel] = found.map((f) => `    ${rel}:${f.line} "${f.text}"`);
    }
    if (process.env.UPDATE_I18N_BASELINE === "1") {
      writeFileSync(baselinePath, `${JSON.stringify(counts, null, 2)}\n`);
    }
  });

  it("adds no hardcoded strings beyond the baseline", () => {
    const baseline: Record<string, number> = JSON.parse(
      readFileSync(baselinePath, "utf-8"),
    );
    const regressions = Object.entries(counts)
      .filter(([file, n]) => n > (baseline[file] ?? 0))
      .map(
        ([file, n]) =>
          `  ${file}: ${n} found, baseline allows ${baseline[file] ?? 0}\n${details[file].join("\n")}`,
      );
    if (regressions.length > 0) {
      // eslint-disable-next-line no-console -- diagnostic output for CI
      console.error(
        `Hardcoded UI strings found. Wrap them in t("key", "Fallback") and register the key in en.ts:\n${regressions.join("\n")}`,
      );
    }
    expect(regressions).toHaveLength(0);
  });

  it("keeps the baseline tight (ratchet only goes down)", () => {
    const baseline: Record<string, number> = JSON.parse(
      readFileSync(baselinePath, "utf-8"),
    );
    const stale = Object.entries(baseline)
      .filter(([file, n]) => (counts[file] ?? 0) < n)
      .map(([file, n]) => `  ${file}: baseline ${n}, now ${counts[file] ?? 0}`);
    if (stale.length > 0) {
      // eslint-disable-next-line no-console -- diagnostic output for CI
      console.error(
        `Baseline is higher than needed. Run UPDATE_I18N_BASELINE=1 npm test -- hardcodedStrings:\n${stale.join("\n")}`,
      );
    }
    expect(stale).toHaveLength(0);
  });
});
