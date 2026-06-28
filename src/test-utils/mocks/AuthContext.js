/**
 * Mock implementation of AuthContext for testing
 */
import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";

const mockValue = {
  user: null,
  loading: false,
  error: null,
  userType: null,
  login: () => Promise.resolve(),
  loginWithGoogle: () => Promise.resolve(),
  loginWithApple: () => Promise.resolve(),
  logout: () => Promise.resolve(),
  resetPassword: () => Promise.resolve(),
  refreshSession: () => Promise.resolve(),
  register: () => Promise.resolve(),
  sendUsernameReminder: () => Promise.resolve(),
};

const AuthContext = createContext(mockValue);

/**
 * Mock useAuth hook that returns the mocked auth context value
 * @returns The mocked auth context value
 */
export const useAuth = () => useContext(AuthContext);

/**
 * Mock AuthProvider component that wraps children with the mocked auth context
 * @param props - Component props
 * @param props.children - Child components to render within the provider
 * @returns The provider element wrapping children
 */
export const AuthProvider = ({ children }) =>
  React.createElement(AuthContext.Provider, { value: mockValue }, children);

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
