import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

/** BCP 47 language code for the user's preferred display language. */
export type Language =
  | "en" // English
  | "es" // Spanish
  | "de" // German
  | "fr" // French
  | "ja" // Japanese
  | "zh-CN" // Chinese (Simplified)
  | "zh-TW" // Chinese (Traditional)
  | "th" // Thai
  | "vi" // Vietnamese
  | "ko" // Korean
  | "ar" // Arabic
  | "hi"; // Hindi

/** ISO 4217 currency code for the user's preferred display currency. */
export type Currency =
  | "USD" // US Dollar
  | "CAD" // Canadian Dollar
  | "EUR" // Euro
  | "CNY" // Chinese Yuan
  | "JPY" // Japanese Yen
  | "KRW" // Korean Won
  | "AED" // UAE Dirham
  | "AUD" // Australian Dollar
  | "CHF" // Swiss Franc
  | "GBP" // British Pound
  | "INR" // Indian Rupee
  | "MXP" // Mexican Peso
  | "ILS" // Israeli Shekel
  | "NGN" // Nigerian Naira
  | "HKD" // Hong Kong Dollar
  | "PKR"; // Pakistani Rupee

/** UI color theme preference. */
export type Theme = "light" | "dark";

interface SettingsContextType {
  language: Language;
  setLanguage: (_language: Language) => void;
  currency: Currency;
  setCurrency: (_currency: Currency) => void;
  theme: Theme;
  setTheme: (_theme: Theme) => void;
  languageOptions: { value: Language; label: string }[];
  currencyOptions: { value: Currency; label: string; symbol: string }[];
}

const SettingsContext = createContext<SettingsContextType | undefined>();

const languageOptions: { value: Language; label: string }[] = [
  { value: "en", label: "English" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "ja", label: "日本語" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁體中文" },
  { value: "th", label: "ไทย" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "ko", label: "한국어" },
  { value: "ar", label: "العربية" },
  { value: "hi", label: "हिन्दी" },
];

/** Languages that use right-to-left text direction. */
const RTL_LANGUAGES: Language[] = ["ar"];

const currencyOptions: { value: Currency; label: string; symbol: string }[] = [
  { value: "USD", label: "US Dollar", symbol: "$" },
  { value: "CAD", label: "Canadian Dollar", symbol: "C$" },
  { value: "EUR", label: "Euro", symbol: "€" },
  { value: "CNY", label: "Chinese Yuan", symbol: "¥" },
  { value: "JPY", label: "Japanese Yen", symbol: "¥" },
  { value: "KRW", label: "Korean Won", symbol: "₩" },
  { value: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { value: "AUD", label: "Australian Dollar", symbol: "A$" },
  { value: "CHF", label: "Swiss Franc", symbol: "CHF" },
  { value: "GBP", label: "British Pound", symbol: "£" },
  { value: "INR", label: "Indian Rupee", symbol: "₹" },
  { value: "MXP", label: "Mexican Peso", symbol: "Mex$" },
  { value: "ILS", label: "Israeli Shekel", symbol: "₪" },
  { value: "NGN", label: "Nigerian Naira", symbol: "₦" },
  { value: "HKD", label: "Hong Kong Dollar", symbol: "HK$" },
  { value: "PKR", label: "Pakistani Rupee", symbol: "₨" },
];

/**
 * Hook to access user settings context (language, currency, display preferences).
 * @returns SettingsContextType containing current settings and setter functions
 * @throws Error if used outside of SettingsProvider
 */
// eslint-disable-next-line react-refresh/only-export-components
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};

/** Retrieves a cookie value by name from document.cookie. */
const getCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
  return null;
};

/** All supported language codes — used to validate localStorage values set by i18next LanguageDetector. */
const VALID_LANGUAGES: readonly Language[] = [
  "en",
  "es",
  "de",
  "fr",
  "ja",
  "zh-CN",
  "zh-TW",
  "th",
  "vi",
  "ko",
  "ar",
  "hi",
];

/**
 * SSR-safe initial language — reads localStorage on client, defaults to "en" on server.
 * Normalizes BCP 47 tags (e.g. "en-US" → "en") that i18next LanguageDetector may store.
 */
const getInitialLanguage = (): Language => {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem("language");
  if (!stored) return "en";
  if (VALID_LANGUAGES.includes(stored as Language)) return stored as Language;
  const primary = stored.split("-")[0];
  return (
    (VALID_LANGUAGES.find((l) => l === primary) as Language | undefined) || "en"
  );
};

/** SSR-safe initial currency — reads localStorage on client, defaults to "USD" on server. */
const getInitialCurrency = (): Currency =>
  typeof window !== "undefined"
    ? (localStorage.getItem("currency") as Currency) || "USD"
    : "USD";

/** SSR-safe initial theme — reads cookie/localStorage on client, defaults to "light" on server. */
const getInitialTheme = (): Theme =>
  typeof window !== "undefined"
    ? (getCookie("theme") as Theme) ||
      (localStorage.getItem("theme") as Theme) ||
      "light"
    : "light";

/**
 * React provider that exposes user preferences (language, currency, theme) through {@link useSettings}.
 * State is initialized directly from localStorage/cookies to avoid race conditions.
 * @param props - Standard React children to render inside the provider.
 * @returns The provider element wrapping its children.
 */
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);
  const [currency, setCurrencyState] = useState<Currency>(getInitialCurrency);
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // Apply theme class to document on mount
  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Update localStorage when settings change (client-only)
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("language", language);
      document.documentElement.lang = language;
      document.documentElement.dir = RTL_LANGUAGES.includes(language)
        ? "rtl"
        : "ltr";
      // In a real app, this would trigger i18next language change
    }
  }, [language]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("currency", currency);
    }
  }, [currency]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("theme", theme);

      // Set cookie for SSR (expires in 1 year)
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      document.cookie = `theme=${theme}; path=/; expires=${expiryDate.toUTCString()}; SameSite=Lax`;

      // Apply theme to document
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [theme]);

  /** Updates the current language setting. */
  const setLanguage = (newLanguage: Language) => {
    setLanguageState(newLanguage);
  };

  /** Updates the current currency setting. */
  const setCurrency = (newCurrency: Currency) => {
    setCurrencyState(newCurrency);
  };

  /** Updates the current theme setting. */
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const contextValue = React.useMemo(
    () => ({
      language,
      setLanguage,
      currency,
      setCurrency,
      theme,
      setTheme,
      languageOptions,
      currencyOptions,
    }),
    [language, currency, theme],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
};
