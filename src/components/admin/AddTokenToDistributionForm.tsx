import React, { useState, useCallback, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import { getContractAddress } from "@/config/contracts";
import CharityScheduledDistributionABI from "@/contracts/CharityScheduledDistribution.sol/CharityScheduledDistribution.json";
import { Logger } from "@/utils/logger";

/** Section showing common test token addresses with a quick-fill button. */
const TestTokensSection: React.FC<{ onUseDevToken: () => void }> = ({ onUseDevToken }) => (
  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
    <h3 className="text-sm font-semibold text-blue-900 mb-2">
      Common Test Tokens on Base Sepolia
    </h3>
    <p className="text-xs font-medium text-blue-800 mb-1">
      WETH Token:
    </p>
    <code className="block p-2 bg-white rounded text-xs break-all border border-blue-200">
      0x7Cb6b60Ca0e18a0BceB24Bd3C99d8894Ed199abD
    </code>
    <button
      type="button"
      onClick={onUseDevToken}
      className="mt-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
    >
      Click to use (price: $0.025)
    </button>
  </div>
);

/**
 * Admin form component for adding tokens to the distribution contract
 * @component AddTokenToDistributionForm
 * @description Allows contract owner to add token addresses with prices to the scheduled distribution contract
 */
export const AddTokenToDistributionForm: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenPrice, setTokenPrice] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { provider, isConnected, connect } = useWeb3();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSuccessMessage("");
      setError("");

      if (!tokenAddress.trim() || !tokenPrice.trim()) {
        setError("Please fill in all fields");
        return;
      }

      if (!provider) {
        setError("Provider not connected");
        return;
      }

      try {
        setLoading(true);

        // Validate address
        if (!ethers.isAddress(tokenAddress)) {
          throw new Error("Invalid token address format");
        }

        // Validate price (must be positive number)
        const price = Number.parseFloat(tokenPrice);
        if (Number.isNaN(price) || price <= 0) {
          throw new Error("Price must be a positive number");
        }

        // Convert price to 8 decimals (contract expects USD price with 8 decimals)
        const priceWith8Decimals = Math.floor(price * 10 ** 8);

        // Get the distribution contract address
        const distributionAddress = getContractAddress("DISTRIBUTION");

        console.log("Distribution contract address:", distributionAddress);
        console.log("Setting token price:", {
          tokenAddress,
          price,
          priceWith8Decimals,
        });

        // Create contract instance
        const signer = await provider.getSigner();
        const distributionContract = new ethers.Contract(
          distributionAddress,
          CharityScheduledDistributionABI.abi,
          signer,
        );

        Logger.info("Setting token price in distribution contract", {
          tokenAddress,
          price,
          priceWith8Decimals,
          distributionAddress,
        });

        // Call setTokenPrice function
        const tx = await distributionContract.setTokenPrice(
          tokenAddress.trim(),
          priceWith8Decimals.toString(),
        );
        const receipt = await tx.wait();

        Logger.info("Token price set in distribution contract successfully", {
          tokenAddress,
          price,
          txHash: receipt.hash,
        });

        setSuccessMessage(
          `Token price set successfully! ${tokenAddress} = $${price} USD. Transaction: ${receipt.hash}`,
        );
        setTokenAddress("");
        setTokenPrice("");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to set token price in distribution contract";
        setError(message);
        Logger.error("Setting token price in distribution contract failed", {
          error: err,
          tokenAddress,
          tokenPrice,
        });
      } finally {
        setLoading(false);
      }
    },
    [tokenAddress, tokenPrice, provider],
  );

  const handleTokenAddressChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setTokenAddress(e.target.value);
    },
    [],
  );

  const handleTokenPriceChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setTokenPrice(e.target.value);
    },
    [],
  );

  const handleUseDevToken = useCallback(() => {
    setTokenAddress("0x7Cb6b60Ca0e18a0BceB24Bd3C99d8894Ed199abD");
    setTokenPrice("0.025");
  }, []);

  if (!isConnected) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Add Token to Distribution Contract
        </h2>
        <p className="mb-4 text-gray-600">
          Connect your wallet to add tokens to the distribution contract
        </p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Add Token to Distribution Contract
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Set the price for a token in the scheduled distribution contract so it
        can be used for scheduled donations. Only the contract owner can add
        tokens.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-green-50 border-2 border-green-200 text-green-700 rounded-xl">
            <p className="text-sm font-medium break-all">{successMessage}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="token-address"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Token Contract Address
          </label>
          <input
            id="token-address"
            type="text"
            value={tokenAddress}
            onChange={handleTokenAddressChange}
            placeholder="0x..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200"
          />
          <p className="mt-2 text-sm text-gray-500">
            Enter the token contract address (e.g., USDC, ETH)
          </p>
        </div>

        <div>
          <label
            htmlFor="token-price"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Token Price (USD)
          </label>
          <input
            id="token-price"
            type="number"
            step="0.00000001"
            min="0"
            value={tokenPrice}
            onChange={handleTokenPriceChange}
            placeholder="e.g., 1.00 for stablecoins, 3500 for ETH"
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200"
          />
          <p className="mt-2 text-sm text-gray-500">
            Enter the current USD price of the token (will be stored with 8
            decimals)
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !tokenAddress.trim() || !tokenPrice.trim()}
          fullWidth
          size="lg"
        >
          {loading ? "Setting Price..." : "Set Token Price"}
        </Button>
      </form>

      <TestTokensSection onUseDevToken={handleUseDevToken} />

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="text-sm font-semibold text-yellow-900 mb-2">
          Important Notes
        </h3>
        <ul className="list-disc list-inside space-y-1 text-xs text-yellow-800">
          <li>Token prices should be in USD</li>
          <li>Prices are stored with 8 decimal places in the contract</li>
          <li>Update prices regularly to reflect market conditions</li>
          <li>
            The minimum donation value is $42 USD (as defined in the contract)
          </li>
        </ul>
      </div>
    </div>
  );
};
