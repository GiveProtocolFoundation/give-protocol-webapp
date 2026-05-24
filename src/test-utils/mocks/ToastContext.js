/**
 * Mock implementation of ToastContext for testing
 */
import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";

const mockValue = {
  showToast: () => {
    /* no-op mock for testing */
  },
};

export const ToastContext = createContext(mockValue);

/** Returns the mock Toast context value for use in tests. */
export const useToast = () => useContext(ToastContext);

/**
 * Mock Toast context provider for tests.
 * @param {{ children: import('react').ReactNode }} props - Component props
 * @returns React element wrapping children with the mock context
 */
export const ToastProvider = ({ children }) =>
  React.createElement(ToastContext.Provider, { value: mockValue }, children);

ToastProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
