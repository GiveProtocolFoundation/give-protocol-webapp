/**
 * Region classification for contribution filters.
 *
 * Countries are grouped using the UNICEF reporting regions
 * (https://data.unicef.org/regionalclassifications/). The seven top-level
 * regions are used; UNICEF's subregions inside Europe and Central Asia and
 * inside Sub-Saharan Africa are not. Countries and territories that UNICEF does
 * not list (for example Puerto Rico or Hong Kong), and a missing country, are
 * reported as "unspecified" rather than guessed.
 */

/** Identifier for a UNICEF reporting region. */
export type RegionId = "eap" | "eca" | "lac" | "mena" | "na" | "sa" | "ssa";

/** A region identifier, or "unspecified" when no region can be determined. */
export type RegionOrUnspecified = RegionId | "unspecified";

/** Region identifiers in display order. */
export const REGION_IDS: readonly RegionId[] = [
  "eap",
  "eca",
  "lac",
  "mena",
  "na",
  "sa",
  "ssa",
];

/** ISO 3166-1 alpha-2 country codes grouped by UNICEF reporting region. */
const REGION_COUNTRIES: Record<RegionId, readonly string[]> = {
  // East Asia and Pacific
  eap: [
    "AU",
    "BN",
    "CK",
    "CN",
    "FJ",
    "FM",
    "ID",
    "JP",
    "KH",
    "KI",
    "KP",
    "KR",
    "LA",
    "MH",
    "MM",
    "MN",
    "MY",
    "NR",
    "NU",
    "NZ",
    "PG",
    "PH",
    "PW",
    "SB",
    "SG",
    "TH",
    "TK",
    "TL",
    "TO",
    "TV",
    "VN",
    "VU",
    "WS",
  ],
  // Europe and Central Asia
  eca: [
    "AD",
    "AL",
    "AM",
    "AT",
    "AZ",
    "BA",
    "BE",
    "BG",
    "BY",
    "CH",
    "CY",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FR",
    "GB",
    "GE",
    "GR",
    "HR",
    "HU",
    "IE",
    "IS",
    "IT",
    "KG",
    "KZ",
    "LI",
    "LT",
    "LU",
    "LV",
    "MC",
    "MD",
    "ME",
    "MK",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "RS",
    "RU",
    "SE",
    "SI",
    "SK",
    "SM",
    "TJ",
    "TM",
    "TR",
    "UA",
    "UZ",
    "VA",
  ],
  // Latin America and Caribbean
  lac: [
    "AG",
    "AI",
    "AR",
    "BB",
    "BO",
    "BR",
    "BS",
    "BZ",
    "CL",
    "CO",
    "CR",
    "CU",
    "DM",
    "DO",
    "EC",
    "GD",
    "GT",
    "GY",
    "HN",
    "HT",
    "JM",
    "KN",
    "LC",
    "MS",
    "MX",
    "NI",
    "PA",
    "PE",
    "PY",
    "SR",
    "SV",
    "TC",
    "TT",
    "UY",
    "VC",
    "VE",
    "VG",
  ],
  // Middle East and North Africa
  mena: [
    "AE",
    "BH",
    "DZ",
    "EG",
    "IL",
    "IQ",
    "IR",
    "JO",
    "KW",
    "LB",
    "LY",
    "MA",
    "OM",
    "PS",
    "QA",
    "SA",
    "SY",
    "TN",
    "YE",
  ],
  // North America
  na: ["CA", "US"],
  // South Asia
  sa: ["AF", "BD", "BT", "IN", "LK", "MV", "NP", "PK"],
  // Sub-Saharan Africa
  ssa: [
    "AO",
    "BF",
    "BI",
    "BJ",
    "BW",
    "CD",
    "CF",
    "CG",
    "CI",
    "CM",
    "CV",
    "DJ",
    "ER",
    "ET",
    "GA",
    "GH",
    "GM",
    "GN",
    "GQ",
    "GW",
    "KE",
    "KM",
    "LR",
    "LS",
    "MG",
    "ML",
    "MR",
    "MU",
    "MW",
    "MZ",
    "NA",
    "NE",
    "NG",
    "RW",
    "SC",
    "SD",
    "SL",
    "SN",
    "SO",
    "SS",
    "ST",
    "SZ",
    "TD",
    "TG",
    "TZ",
    "UG",
    "ZA",
    "ZM",
    "ZW",
  ],
};

const COUNTRY_TO_REGION: ReadonlyMap<string, RegionId> = new Map(
  REGION_IDS.flatMap((region) =>
    REGION_COUNTRIES[region].map((code): [string, RegionId] => [code, region]),
  ),
);

/**
 * Returns the UNICEF reporting region for a country.
 * @param countryCode - ISO 3166-1 alpha-2 code, in any letter case
 * @returns The region id, or "unspecified" for a missing or unlisted country
 */
export function getRegionForCountry(
  countryCode?: string | null,
): RegionOrUnspecified {
  if (typeof countryCode !== "string") {
    return "unspecified";
  }
  return (
    COUNTRY_TO_REGION.get(countryCode.trim().toUpperCase()) ?? "unspecified"
  );
}

/**
 * Lists the country codes that belong to a region.
 * @param region - The region id
 * @returns ISO 3166-1 alpha-2 codes in that region
 */
export function getCountriesInRegion(region: RegionId): readonly string[] {
  return REGION_COUNTRIES[region];
}

/**
 * Checks whether a value is a known region id.
 * @param value - Any string, such as a select value or URL parameter
 * @returns True when the value is one of the seven region ids
 */
export function isRegionId(value: string): value is RegionId {
  return (REGION_IDS as readonly string[]).includes(value);
}
