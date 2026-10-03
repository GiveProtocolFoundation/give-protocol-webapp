/** NTEE major-code (first letter) to English category label. */
const NTEE_CATEGORY_LABELS: Record<string, string> = {
  A: "Arts & Culture",
  B: "Education",
  C: "Environment",
  D: "Animal Welfare",
  E: "Health",
  F: "Mental Health",
  G: "Medical Research",
  H: "Biomedical Research",
  I: "Crime & Legal",
  J: "Employment",
  K: "Food & Nutrition",
  L: "Housing",
  M: "Public Safety",
  N: "Recreation",
  O: "Youth Development",
  P: "Human Services",
  Q: "International",
  R: "Civil Rights",
  S: "Community Development",
  T: "Philanthropy",
  U: "Science & Technology",
  V: "Social Science",
  W: "Public Policy",
  X: "Religion",
  Y: "Mutual Benefit",
};

/** Translation key and English fallback for a charity category. */
export interface NteeCategory {
  /** i18n key, e.g. `browse.category.B`. */
  key: string;
  /** English label, used as the `t()` fallback. */
  label: string;
}

/** Generic category used when a charity has no recognisable NTEE code. */
export const DEFAULT_NTEE_CATEGORY: NteeCategory = {
  key: "browse.category.default",
  label: "Nonprofit",
};

/**
 * Maps an NTEE code to its translatable category.
 * @param nteeCode - NTEE code string (e.g. "B20")
 * @returns Category key and English label; the generic "Nonprofit" category when unknown
 */
export function getTranslatableNteeCategory(
  nteeCode: string | null | undefined,
): NteeCategory {
  if (!nteeCode) return DEFAULT_NTEE_CATEGORY;
  const major = nteeCode.trim().charAt(0).toUpperCase();
  const label = NTEE_CATEGORY_LABELS[major];
  return label
    ? { key: `browse.category.${major}`, label }
    : DEFAULT_NTEE_CATEGORY;
}
