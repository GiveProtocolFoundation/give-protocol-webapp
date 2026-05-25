import * as fs from "fs";
import * as path from "path";
import en from "../en";

/**
 * Recursively collect all .tsx files under a directory,
 * excluding test files and node_modules.
 */
function collectTsxFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") {
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

/**
 * Extract literal translation keys from t() and i18next.t() calls.
 * Skips template literals with interpolation and variable arguments.
 */
function extractTranslationKeys(
  content: string
): Array<{ key: string; line: number }> {
  const results: Array<{ key: string; line: number }> = [];
  const lines = content.split("\n");

  // Match t("key") / t('key') / i18next.t("key") / i18next.t('key')
  // Captures only literal string keys (no template literals with ${})
  const pattern = /\bt\(\s*["']([a-zA-Z0-9._-]+)["']/g;

  for (let i = 0; i < lines.length; i++) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(lines[i])) !== null) {
      results.push({ key: match[1], line: i + 1 });
    }
  }

  return results;
}

describe("Translation key validation", () => {
  const srcDir = path.resolve(__dirname, "../../../");
  const registeredKeys = new Set(Object.keys(en.translation));
  const tsxFiles = collectTsxFiles(srcDir);

  it("finds .tsx source files to validate", () => {
    expect(tsxFiles.length).toBeGreaterThan(0);
  });

  it("every t() key in source code exists in en.ts", () => {
    const missing: Array<{ key: string; file: string; line: number }> = [];

    for (const filePath of tsxFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const keys = extractTranslationKeys(content);
      const relPath = path.relative(srcDir, filePath);

      for (const { key, line } of keys) {
        if (!registeredKeys.has(key)) {
          missing.push({ key, file: relPath, line });
        }
      }
    }

    if (missing.length > 0) {
      const report = missing
        .map((m) => `  ${m.file}:${m.line} → t("${m.key}")`)
        .join("\n");
      // eslint-disable-next-line no-console -- diagnostic output for CI
      console.error(
        `Missing ${missing.length} translation key(s) in en.ts:\n${report}`
      );
    }
    expect(missing).toHaveLength(0);
  });
});
