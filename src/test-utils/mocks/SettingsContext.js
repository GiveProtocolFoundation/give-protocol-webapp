/**
 * Mock implementation of SettingsContext for testing
 */
import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";

const mockValue = {
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
};

const SettingsContext = createContext(mockValue);

/** Returns the mock Settings context value for use in tests. */
export const useSettings = () => useContext(SettingsContext);

/**
 * Mock Settings context provider for tests.
 * @param {{ children: import('react').ReactNode }} props - Component props
 * @returns React element wrapping children with the mock context
 */
export const SettingsProvider = ({ children }) =>
  React.createElement(SettingsContext.Provider, { value: mockValue }, children);

SettingsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
