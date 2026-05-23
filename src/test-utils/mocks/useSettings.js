/**
 * Mock implementation of useSettings hook for testing
 */
export const useSettings = () => ({
  language: "en",
  setLanguage: () => {
    /* no-op mock for testing */
  },
  currency: "USD",
  setCurrency: () => {
    /* no-op mock for testing */
  },
  theme: "light",
  setTheme: () => {
    /* no-op mock for testing */
  },
  languageOptions: [{ value: "en", label: "English" }],
  currencyOptions: [{ value: "USD", label: "US Dollar", symbol: "$" }],
});

/**
 * Mock SettingsProvider that passes children through unchanged.
 * @param {{ children: import('react').ReactNode }} props - Component props
 * @returns The children passed in, unchanged
 */
export const SettingsProvider = ({ children }) => children;
