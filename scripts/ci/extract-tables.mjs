/**
 * Table-name extractor for the Schema Drift Check workflow.
 *
 * `CREATE TABLE` names are the single source of truth for both sides of the
 * drift comparison:
 *
 *   - expected:  node scripts/ci/extract-tables.mjs --dir supabase/migrations
 *   - actual:    node scripts/ci/extract-tables.mjs --file db_dump.sql
 *
 * Normalizes names identically so the two sides cannot diverge again:
 * quotes are stripped before the `public.` schema prefix, because `supabase
 * db dump` emits quoted schema qualifiers such as `"public"."donation_consents"`
 * while migrations use bare names (`donation_consents`).
 *
 * Emits one bare table name per line, sorted. Exit 0 on success.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

function stripComments(content) {
  return content
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

function normalizedTableName(raw) {
  return raw
    .replace(/"/g, "")
    .replace(/^public\./i, "");
}

function extractTables(content) {
  const tables = new Set();
  const cleaned = stripComments(content);
  const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_."]+)/gi;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    tables.add(normalizedTableName(match[1]));
  }
  return Array.from(tables).sort();
}

function printWrongUsage() {
  console.error('Usage: node scripts/ci/extract-tables.mjs --dir <migrations-dir> | --file <dump.sql>');
}

const args = process.argv.slice(2);
if (args.length !== 2 || (args[0] !== "--dir" && args[0] !== "--file")) {
  printWrongUsage();
  process.exit(2);
}

let tables;
if (args[0] === "--dir") {
  const dir = resolve(args[1]);
  const names = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  tables = new Set();
  for (const name of names) {
    for (const t of extractTables(readFileSync(join(dir, name), "utf8"))) {
      tables.add(t);
    }
  }
  tables = Array.from(tables).sort();
} else {
  tables = extractTables(readFileSync(resolve(args[1]), "utf8"));
}

process.stdout.write(tables.length ? `${tables.join("\n")}\n` : "");