import React, { useState, useCallback, type ChangeEvent } from "react";
import { useContract } from "@/hooks/web3/useContract";
import { useWeb3 } from "@/contexts/Web3Context";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getAddress, isAddress, ZeroAddress } from "ethers";
import { Logger } from "@/utils/logger";

/**
 * Admin form component for adding accepted tokens to the donation contract
 */
export const AddTokenForm: React.FC = () => {
  const [tokenAddress, setTokenAddress] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { contract } = useContract("donation");
  const { isConnected, connect } = useWeb3();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSuccessMessage("");
      setError("");

      if (!contract) {
        setError("Contract not connected");
        return;
      }

      if (!tokenAddress.trim()) {
        setError("Please enter a token address");
        return;
      }

      try {
        setLoading(true);

        // Validate and normalize address
        if (!isAddress(tokenAddress)) {
          throw new Error("Invalid token address format");
        }
        const normalizedAddress = getAddress(tokenAddress);

        Logger.info("Adding accepted token", {
          tokenAddress: normalizedAddress,
        });

        const addTokenFunction = contract.getFunction("addAcceptedToken");
        const tx = await addTokenFunction(normalizedAddress);
        const receipt = await tx.wait();

        setSuccessMessage(
          `Token added successfully! Transaction: ${receipt.hash}`,
        );
        setTokenAddress("");

        Logger.info("Token added successfully", {
          tokenAddress: normalizedAddress,
          txHash: receipt.hash,
        });
      } catch (err) {
        let message =
          err instanceof Error ? err.message : "Failed to add token";

        // Provide more helpful error messages
        if (message.includes("require(false)")) {
          message =
            "Token may already be added, or you're not the contract owner. Check the diagnostics page.";
        } else if (message.includes("Ownable")) {
          message =
            "Only the contract owner can add tokens. Please connect with the owner wallet.";
        }

        setError(message);
        Logger.error("Failed to add token", { error: err, tokenAddress });
      } finally {
        setLoading(false);
      }
    },
    [contract, tokenAddress],
  );

  const handleTokenAddressChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setTokenAddress(e.target.value);
    },
    [],
  );

  const handleUseZeroAddress = useCallback(() => {
    setTokenAddress(ZeroAddress);
  }, []);

  if (!isConnected) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Add Accepted Token
        </h2>
        <p className="mb-4 text-gray-600">
          Connect your wallet to manage accepted tokens
        </p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Add Accepted Token
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Add a token to the whitelist so it can be used for donations. Only the
        contract owner can add tokens.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border-2 border-red-200 text-red-700 rounded-xl">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="flex items-center gap-2 p-4 bg-green-50 border-2 border-green-200 text-green-700 rounded-xl">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium break-all">{successMessage}</p>
          </div>
        )}

        <div>
          <label
            htmlFor="token-address"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Token Address
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
            Enter the token contract address to whitelist for donations
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !tokenAddress.trim()}
          fullWidth
          size="lg"
        >
          {loading ? "Adding Token..." : "Add Token"}
        </Button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Native Token (ETH)
        </h3>
        <p className="text-sm text-blue-800 mb-2">
          To accept native token donations, use the zero address:
        </p>
        <code className="block p-2 bg-white rounded text-xs break-all border border-blue-200">
          {ZeroAddress}
        </code>
        <button
          type="button"
          onClick={handleUseZeroAddress}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Click to use this address
        </button>
      </div>
    </div>
  );
};
