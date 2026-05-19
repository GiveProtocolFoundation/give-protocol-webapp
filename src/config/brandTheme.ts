/**
 * Give Protocol Brand Theme
 *
 * Single source of truth for the visual identity. Tailwind config mirrors these values.
 * All new UI work should reference this palette — do NOT introduce new color families.
 *
 * Emerald is the primary brand color. Teal and cyan are accent-only (gradient endpoints).
 */

export const BRAND_THEME = {
  /* ── Colors ── */
  colors: {
    /** Primary brand scale — maps to Tailwind `emerald-*` and `primary-*` */
    brand: {
      50: "#ecfdf5",
      100: "#d1fae5",
      200: "#a7f3d0",
      300: "#6ee7b7",
      400: "#34d399",
      500: "#10b981",
      600: "#059669", // Primary CTA background
      700: "#047857", // CTA hover
      800: "#065f46",
      900: "#064e3b", // Dark panels, AppNavbar
    },
    /** Accent — gradient endpoints only, never standalone interactive colors */
    accent: {
      teal: "#14b8a6", // teal-500 — second gradient stop
      cyan: "#06b6d4", // cyan-500 — third gradient stop (landing page)
    },
    /** Neutrals — Tailwind `slate-*` for light mode, `gray-*` for dark mode */
    neutral: {
      50: "#f8fafc",
      100: "#f1f5f9",
      200: "#e2e8f0",
      300: "#cbd5e1",
      500: "#64748b",
      700: "#334155",
      900: "#0f172a",
    },
    /** Semantic */
    semantic: {
      danger: "#dc2626", // red-600
      warning: "#f59e0b", // amber-500
      success: "#10b981", // emerald-500
      info: "#3b82f6", // blue-500 — toasts/badges only
    },
  },

  /* ── Typography ── */
  fonts: {
    heading: "DM Serif Display",
    body: "DM Sans",
  },
  fontWeights: {
    light: 300,
    regular: 400,
    medium: 500,
    semibold: 600,
  },

  /* ── Shadows ── */
  shadows: {
    cta: "0 4px 14px rgba(5, 150, 105, 0.35)",
    ctaHover: "0 4px 18px rgba(5, 150, 105, 0.50)",
    card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.05)",
  },

  /* ── Layout tokens ── */
  radii: {
    button: "10px",
    input: "10px",
    card: "12px",
    pill: "9999px",
  },

  /* ── Dark mode ── */
  darkMode: {
    bgDeep: "#050A09",
    bgSurface: "#0E1514",
    borderGlass: "rgba(255, 255, 255, 0.1)",
    textMuted: "#D1D5DB",
  },

  /* ── Glass effects ── */
  glass: {
    bgLight: "rgba(255, 255, 255, 0.7)",
    bgDark: "rgba(255, 255, 255, 0.05)",
    blur: "16px",
  },

  /* ── Gradient text stops ── */
  gradientText: {
    light: ["#059669", "#0d9488", "#0891b2"], // emerald-600, teal-600, cyan-600
    dark: ["#34d399", "#14b8a6", "#22d3ee"], // emerald-400, teal-400, cyan-400
  },

  /* ── Navbar ── */
  navbar: {
    height: 60,
    bg: "rgba(6, 78, 59, 0.92)",
    border: "rgba(52, 211, 153, 0.15)",
    blur: "12px",
  },
} as const;

/** Inferred type of the BRAND_THEME constant for consumers. */
export type BrandTheme = typeof BRAND_THEME;
