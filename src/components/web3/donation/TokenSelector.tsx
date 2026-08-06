import React, { useState, useCallback } from "react";
import { TokenConfig, BASE_TOKENS } from "@/config/tokens";
import { useCurrencyContext } from "@/contexts/CurrencyContext";
import { formatCrypto, formatFiat } from "@/utils/formatters";
import { ChevronDown, Loader2 } from "lucide-react";
import { cn } from "@/utils/cn";
import { useMultiTokenBalance } from "@/hooks/web3/useMultiTokenBalance";

interface TokenSelectorProps {
  selectedToken: TokenConfig;
  onSelectToken: (_token: TokenConfig) => void;
  walletBalance?: number;
  isLoadingBalance?: boolean;
  /** Optional list of tokens to show. Defaults to all BASE_TOKENS */
  availableTokens?: TokenConfig[];
}

/**
 * Token selector dropdown component for choosing donation token
 * @component TokenSelector
 * @description Allows users to select which cryptocurrency token to donate with.
 * Shows token balances and fiat equivalents.
 * @param {Object} props - Component props
 * @param {TokenConfig} props.selectedToken - Currently selected token
 * @param {function} props.onSelectToken - Callback when token is selected
 * @param {number} [props.walletBalance] - User's balance for the selected token
 * @returns {React.ReactElement} Token selector component
 */
export function TokenSelector({
  selectedToken,
  onSelectToken,
  walletBalance,
  isLoadingBalance = false,
  availableTokens = BASE_TOKENS,
}: TokenSelectorProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedCurrency, tokenPrices, convertToFiat } = useCurrencyContext();
  const { balances, isLoading: isLoadingAllBalances } =
    useMultiTokenBalance(availableTokens);

  const handleToggle = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  const handleSelect = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const symbol = e.currentTarget.dataset.symbol;
      if (!symbol) return;

      const token = availableTokens.find((t) => t.symbol === symbol);
      if (token) {
        onSelectToken(token);
        setIsOpen(false);
      }
    },
    [onSelectToken, availableTokens],
  );

  const fiatValue = walletBalance
    ? convertToFiat(walletBalance, selectedToken.coingeckoId)
    : 0;

  return (
    <div className="relative">
      <label
        htmlFor="token-selector"
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Select Token
      </label>

      <button
        id="token-selector"
        type="button"
        onClick={handleToggle}
        aria-label="Select donation token"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-4 py-3 bg-white border border-gray-300 rounded-lg hover:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <img
          src={selectedToken.icon}
          alt={selectedToken.symbol}
          className="w-6 h-6 rounded-full mr-3"
        />
        <div className="flex-1 text-left">
          <div className="font-medium text-gray-900">
            {selectedToken.symbol}
          </div>
          {isLoadingBalance && (
            <div className="flex items-center gap-1 text-sm text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Loading balance...</span>
            </div>
          )}
          {!isLoadingBalance && walletBalance !== undefined && (
            <div className="text-sm text-gray-500">
              Balance:{" "}
              {formatCrypto(walletBalance, selectedToken, { decimals: 4 })}
              {fiatValue > 0 &&
                ` (${formatFiat(fiatValue, selectedCurrency, { decimals: 2 })})`}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn(
            "w-5 h-5 text-gray-400 transition-transform ml-3",
            isOpen && "transform rotate-180",
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 max-h-96 overflow-y-auto">
          {availableTokens.map((token) => {
            const price = tokenPrices[token.coingeckoId];
            const isSelected = token.symbol === selectedToken.symbol;
            const tokenBalance = balances[token.symbol];
            const tokenFiatValue =
              tokenBalance !== undefined
                ? convertToFiat(tokenBalance, token.coingeckoId)
                : 0;

            return (
              <button
                key={token.symbol}
                type="button"
                data-symbol={token.symbol}
                onClick={handleSelect}
                className={cn(
                  "w-full flex items-center space-x-3 px-4 py-3 hover:bg-emerald-50 transition-colors",
                  isSelected && "bg-emerald-50",
                )}
              >
                <img
                  src={token.icon}
                  alt={token.symbol}
                  className="w-6 h-6 rounded-full flex-shrink-0"
                />
                <div className="flex-1 text-left min-w-0">
                  <div className="font-medium text-gray-900">
                    {token.symbol}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {token.name}
                  </div>
                  {isLoadingAllBalances && (
                    <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  )}
                  {!isLoadingAllBalances && tokenBalance !== undefined && (
                    <div className="text-xs text-gray-600 mt-0.5">
                      Balance:{" "}
                      {formatCrypto(tokenBalance, token, { decimals: 4 })}
                      {tokenFiatValue > 0 &&
                        ` (${formatFiat(tokenFiatValue, selectedCurrency, { decimals: 2 })})`}
                    </div>
                  )}
                </div>
                {price !== undefined && (
                  <div className="text-sm text-gray-600 flex-shrink-0">
                    {formatFiat(price, selectedCurrency, { decimals: 2 })}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
