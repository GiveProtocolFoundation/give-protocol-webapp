/**
 * Mock implementation of Web3Context for testing
 */
import React, { createContext, useContext } from "react";
import PropTypes from "prop-types";

const mockValue = {
  provider: null,
  signer: null,
  address: null,
  chainId: 1287,
  isConnected: false,
  isConnecting: false,
  error: null,
  connect: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),
  switchChain: () => Promise.resolve(),
};

const Web3Context = createContext(mockValue);

/** Returns the mock Web3 context value for use in tests. */
export const useWeb3 = () => useContext(Web3Context);

/**
 * Mock Web3 context provider for tests.
 * @param {{ children: import('react').ReactNode }} props - Component props
 * @returns React element wrapping children with the mock context
 */
export const Web3Provider = ({ children }) =>
  React.createElement(Web3Context.Provider, { value: mockValue }, children);

Web3Provider.propTypes = {
  children: PropTypes.node.isRequired,
};
