/**
 * OFAC / sanctions screening engine (pure, dependency-free).
 *
 * Canonical source. Mirrored verbatim to
 * `supabase/functions/_shared/ofac.ts` because Supabase Deno Edge Functions
 * only bundle files under `supabase/functions/`, so they cannot import from
 * `src/`. Keep the two copies in sync (same pattern as
 * `src/config/chains/evm.ts` → `verify-wallet-control` CHAIN_RPC_MAP).
 *
 * Matching model (deliberately simple and deterministic for MVP):
 *   - Names: exact normalized equality, plus order-insensitive token-set
 *     equality after removing common organizational stopwords (min 2
 *     meaningful tokens). This tolerates "SURNAME, Given" vs "Given Surname"
 *     reversals and trailing designators like "Co., Ltd.".
 *   - Addresses: exact match after trimming. EVM hex (`0x…`) addresses are
 *     compared case-insensitively; other chains (XBT/XMR/TRX/USDT, case
 *     sensitive wallet encodings) are compared verbatim.
 */

export interface DigitalCurrencyAddress {
  currency: string;
  address: string;
  /** normalized comparison key (lowercased for EVM hex, verbatim otherwise) */
  key: string;
}

export interface SdnEntry {
  entityNumber: string;
  name: string;
  /** raw SDN_Type column ("individual", "entity" via -0-, "vessel", …) */
  entryType: string;
  programs: string[];
  remark: string;
  altNames: string[];
  digitalCurrencyAddresses: DigitalCurrencyAddress[];
}

export interface NameMatch {
  queried: string;
  matched: boolean;
  matchedName: string | null;
  matchedEntityNumber: string | null;
  matchedPrograms: string[];
}

export interface AddressMatch {
  queried: string;
  matched: boolean;
  matchedCurrency: string | null;
  matchedName: string | null;
  matchedEntityNumber: string | null;
}

export interface ScreeningResult {
  orgName: NameMatch;
  officers: NameMatch[];
  wallets: AddressMatch[];
  flagged: boolean;
}

/** Organizational designators stripped before token-set comparison. */
const ORG_STOPWORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "of",
  "for",
  "inc",
  "incorporated",
  "llc",
  "ltd",
  "co",
  "corp",
  "corporation",
  "company",
  "limited",
  "plc",
  "association",
  "associates",
  "llp",
  "lp",
  "foundation",
  "fund",
  "trust",
  "&",
]);

/** DC-address currency prefixes whose addresses are hex / case-insensitive. */
const HEX_CURRENCIES = new Set(["ETH", "MATIC", "AVAX", "BNB", "USDC", "USDT_ETH"]);

/**
 * Normalize a name for comparison: strip diacritics, lowercase, replace
 * non-alphanumeric characters with spaces, collapse whitespace.
 *
 * @param input - Raw name (individual or organization).
 * @returns Normalized, space-separated lowercase token string.
 */
export function normalizeName(input: string): string {
  if (!input) return "";
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function meaningfulTokens(input: string): string[] {
  return normalizeName(input)
    .split(" ")
    .filter((token) => token.length > 0 && !ORG_STOPWORDS.has(token));
}

function tokenSetsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((token, index) => token === sb[index]);
}

/**
 * Test whether a candidate name matches an SDN entry name (or any of its
 * listed "a.k.a." alternates).
 *
 * @param candidate - Name being screened (organization or officer).
 * @param entry - Sanctions list entry.
 * @returns True when the candidate should be flagged as a sanctions match.
 */
export function nameMatches(candidate: string, entry: SdnEntry): boolean {
  const candidateNorm = normalizeName(candidate);
  if (!candidateNorm) return false;

  const forms = [entry.name, ...entry.altNames];
  for (const form of forms) {
    const formNorm = normalizeName(form);
    if (!formNorm) continue;

    if (candidateNorm === formNorm) return true;

    const candidateTokens = meaningfulTokens(candidateNorm);
    const formTokens = meaningfulTokens(formNorm);
    if (
      candidateTokens.length >= 2 &&
      formTokens.length >= 2 &&
      tokenSetsEqual(candidateTokens, formTokens)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Whether an address string is an EVM 0x-hex address.
 *
 * @param address - Candidate wallet address.
 * @returns True when the address is a 40-hex-char 0x-prefixed string.
 */
export function isEvmHexAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

/**
 * Normalize a cryptocurrency address into a comparison key. EVM hex addresses
 * are lowercased (EIP-55 checksums are case-insensitive on-chain); all other
 * encodings are kept verbatim because they are case-sensitive.
 *
 * @param address - Wallet address string.
 * @param currency - Optional currency prefix from the SDN entry.
 * @returns Normalized comparison key.
 */
export function normalizeAddressKey(
  address: string,
  currency?: string,
): string {
  const trimmed = address.trim();
  const isHexCurrency = Boolean(
    currency && HEX_CURRENCIES.has(currency.toUpperCase()),
  );
  const isHexString = /^0x[0-9a-fA-F]+$/.test(trimmed);
  if (isHexCurrency || isHexString) return trimmed.toLowerCase();
  return trimmed;
}

const ALT_NAME_RE = /a\.k\.a\.\s+'([^']+)'/g;

/**
 * Extract "a.k.a." alternate names from an SDN remarks string.
 *
 * @param remark - The raw remarks/comment field from the SDN list.
 * @returns Array of alternate names.
 */
export function extractAltNames(remark: string): string[] {
  const names: string[] = [];
  const matches = remark.matchAll(ALT_NAME_RE);
  for (const match of matches) {
    const name = match[1]?.trim();
    if (name) names.push(name);
  }
  return names;
}

const DC_ADDRESS_RE =
  /Digital Currency Address\s*-\s*([A-Z0-9]{2,10})\s+([A-Za-z0-9]{3,})/g;

/**
 * Extract digital-currency addresses from an SDN remarks string. OFAC lists
 * these as `Digital Currency Address - <CURRENCY> <ADDRESS>` with optional
 * `alt. ` prefixes; repeated matches cover both primary and alternate
 * addresses on a single entry.
 *
 * @param remark - The raw remarks/comment field from the SDN list.
 * @returns Array of parsed currency/address pairs with comparison keys.
 */
export function extractDigitalCurrencyAddresses(
  remark: string,
): DigitalCurrencyAddress[] {
  const addresses: DigitalCurrencyAddress[] = [];
  const matches = remark.matchAll(DC_ADDRESS_RE);
  for (const match of matches) {
    const currency = match[1]?.trim();
    const address = match[2]?.trim();
    if (currency && address) {
      addresses.push({
        currency,
        address,
        key: normalizeAddressKey(address, currency),
      });
    }
  }
  return addresses;
}

/** Split the SDN "Program" column into individual program labels. */
export function parsePrograms(programField: string): string[] {
  if (!programField) return [];
  const normalized = programField.trim();
  if (!normalized || normalized === "-0-") return [];
  return normalized
    .replace(/\]\s*\[/g, "|")
    .replace(/\[|\]/g, "")
    .split("|")
    .map((program) => program.trim())
    .filter((program) => program.length > 0 && program !== "-0-");
}

/**
 * Screen a list of candidate names against a set of SDN entries.
 *
 * @param candidates - Names to screen (organization + officers).
 * @param entries - Loaded SDN list entries.
 * @returns Per-candidate match results.
 */
export function screenNames(
  candidates: string[],
  entries: SdnEntry[],
): NameMatch[] {
  return candidates.map((candidate) => {
    const candidateNorm = normalizeName(candidate);
    if (!candidateNorm) {
      return {
        queried: candidate,
        matched: false,
        matchedName: null,
        matchedEntityNumber: null,
        matchedPrograms: [],
      };
    }
    for (const entry of entries) {
      if (nameMatches(candidate, entry)) {
        return {
          queried: candidate,
          matched: true,
          matchedName: entry.name,
          matchedEntityNumber: entry.entityNumber,
          matchedPrograms: entry.programs,
        };
      }
    }
    return {
      queried: candidate,
      matched: false,
      matchedName: null,
      matchedEntityNumber: null,
      matchedPrograms: [],
    };
  });
}

/**
 * Screen a list of candidate wallet addresses against SDN digital-currency
 * address entries.
 *
 * @param candidates - Wallet addresses to screen.
 * @param entries - Loaded SDN list entries.
 * @returns Per-candidate match results.
 */
export function screenAddresses(
  candidates: string[],
  entries: SdnEntry[],
): AddressMatch[] {
  return candidates.map((candidate) => {
    const candidateKey = normalizeAddressKey(candidate);
    for (const entry of entries) {
      for (const dca of entry.digitalCurrencyAddresses) {
        if (dca.key === candidateKey) {
          return {
            queried: candidate,
            matched: true,
            matchedCurrency: dca.currency,
            matchedName: entry.name,
            matchedEntityNumber: entry.entityNumber,
          };
        }
      }
    }
    return {
      queried: candidate,
      matched: false,
      matchedCurrency: null,
      matchedName: null,
      matchedEntityNumber: null,
    };
  });
}

/**
 * Screen an organization record (name, officers, payout wallets) against the
 * SDN list.
 *
 * @param orgName - Organization legal name.
 * @param officers - Named officers / authorized representatives.
 * @param wallets - Payout wallet addresses.
 * @param entries - Loaded SDN list entries.
 * @returns Structured screening result with a top-level flagged flag.
 */
export function screen(
  orgName: string,
  officers: string[],
  wallets: string[],
  entries: SdnEntry[],
): ScreeningResult {
  const orgResult = screenNames([orgName], entries)[0];
  const officerResults = screenNames(officers, entries);
  const walletResults = screenAddresses(wallets, entries);
  const flagged =
    orgResult.matched ||
    officerResults.some((result) => result.matched) ||
    walletResults.some((result) => result.matched);
  return {
    orgName: orgResult,
    officers: officerResults,
    wallets: walletResults,
    flagged,
  };
}

/** Parse the OFAC legacy `sdn.csv` text into structured SDN entries. */
export function parseSdnCsv(text: string): SdnEntry[] {
  const entries: SdnEntry[] = [];

  const rowToEntry = (row: string[]): SdnEntry | null => {
    if (row.length < 4) return null;
    const entityNumber = (row[0] ?? "").trim();
    if (!/^\d+$/.test(entityNumber)) return null;
    const name = (row[1] ?? "").trim();
    if (!name) return null;
    const entryType = (row[2] ?? "").trim();
    const programsField = (row[3] ?? "").trim();
    const remark = (row[row.length - 1] ?? "").trim();
    return {
      entityNumber,
      name,
      entryType,
      programs: parsePrograms(programsField),
      remark,
      altNames: extractAltNames(remark),
      digitalCurrencyAddresses: extractDigitalCurrencyAddresses(remark),
    };
  };

  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const flushField = (): void => {
    row.push(field);
    field = "";
  };

  const flushRow = (): void => {
    flushField();
    if (row.length > 0) {
      const entry = rowToEntry(row);
      if (entry) entries.push(entry);
    }
    row = [];
  };

  for (let index = 0; index < text.length; index += 1) {
    const ch = text[index];
    if (inQuotes) {
      if (ch === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
          continue;
        }
        inQuotes = false;
        continue;
      }
      field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      flushField();
      continue;
    }
    if (ch === "\n") {
      flushRow();
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    if (ch === "\x1a") {
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    flushField();
    if (row.length > 0) {
      const entry = rowToEntry(row);
      if (entry) entries.push(entry);
    }
  }

  return entries;
}