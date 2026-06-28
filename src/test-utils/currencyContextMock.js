import { jest } from "@jest/globals";

const DEFAULT_MOCK_CURRENCY = {
  code: "USD",
  name: "US Dollar",
  symbol: "$",
  coingeckoId: "usd",
};

export const useCurrencyContext = jest.fn(() => ({
  selectedCurrency: DEFAULT_MOCK_CURRENCY,
  setSelectedCurrency: jest.fn(),
  tokenPrices: {},
  isLoading: false,
  refreshPrices: jest.fn(),
  convertToFiat: jest.fn(() => 0),
  convertFromFiat: jest.fn(() => 0),
}));

/** Mock CurrencyProvider pass-through */
export const CurrencyProvider = ({ children }) => children;
