import React, { useState, useCallback, type ChangeEvent } from "react";
import { Button } from "@/components/ui/Button";
import { useWeb3 } from "@/contexts/Web3Context";
import { ethers } from "ethers";
import { getContractAddress } from "@/config/contracts";
import CharityScheduledDistributionABI from "@/contracts/CharityScheduledDistribution.sol/CharityScheduledDistribution.json";
import { Logger } from "@/utils/logger";

/**
 * Admin form component for adding charities to the distribution contract
 * @component AddCharityToDistributionForm
 * @description Allows contract owner to add charity addresses to the scheduled distribution contract
 */
export const AddCharityToDistributionForm: React.FC = () => {
  const [charityAddress, setCharityAddress] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { provider, isConnected, connect } = useWeb3();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSuccessMessage("");
      setError("");

      if (!charityAddress.trim()) {
        return;
      }

      if (!provider) {
        setError("Provider not connected");
        return;
      }

      try {
        setLoading(true);

        // Validate address
        if (!ethers.isAddress(charityAddress)) {
          throw new Error("Invalid charity address format");
        }

        // Get the distribution contract address
        const distributionAddress = getContractAddress("DISTRIBUTION");

        console.log("Distribution contract address:", distributionAddress);

        // Create contract instance
        const signer = await provider.getSigner();
        const distributionContract = new ethers.Contract(
          distributionAddress,
          CharityScheduledDistributionABI.abi,
          signer,
        );

        Logger.info("Adding charity to distribution contract", {
          charityAddress,
          distributionAddress,
        });

        // Call addCharity function
        const tx = await distributionContract.addCharity(charityAddress.trim());
        const receipt = await tx.wait();

        Logger.info("Charity added to distribution contract successfully", {
          charityAddress,
          txHash: receipt.hash,
        });

        setSuccessMessage(
          `Charity added to distribution contract successfully! Transaction: ${receipt.hash}`,
        );
        setCharityAddress("");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to add charity to distribution contract";
        setError(message);
        Logger.error("Adding charity to distribution contract failed", {
          error: err,
          charityAddress,
        });
      } finally {
        setLoading(false);
      }
    },
    [charityAddress, provider],
  );

  const handleCharityAddressChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      setCharityAddress(e.target.value);
    },
    [],
  );

  const handleUseTestAddress = useCallback(() => {
    setCharityAddress("0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75");
  }, []);

  if (!isConnected) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Add Charity to Distribution Contract
        </h2>
        <p className="mb-4 text-gray-600">
          Connect your wallet to add charities to the distribution contract
        </p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Add Charity to Distribution Contract
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Add a charity address to the scheduled distribution contract so it can
        receive scheduled donations. Only the contract owner can add charities.
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
            htmlFor="charity-address-distribution"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Charity Wallet Address
          </label>
          <input
            id="charity-address-distribution"
            type="text"
            value={charityAddress}
            onChange={handleCharityAddressChange}
            placeholder="0x..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200"
          />
          <p className="mt-2 text-sm text-gray-500">
            Enter the Ethereum address that will receive scheduled donations
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !charityAddress.trim()}
          fullWidth
          size="lg"
        >
          {loading ? "Adding..." : "Add to Distribution Contract"}
        </Button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">
          Test Charity Address
        </h3>
        <p className="text-sm text-blue-800 mb-2">
          For testing on Base Sepolia, use:
        </p>
        <code className="block p-2 bg-white rounded text-xs break-all border border-blue-200">
          0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75
        </code>
        <button
          type="button"
          onClick={handleUseTestAddress}
          className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
        >
          Click to use this address
        </button>
      </div>
    </div>
  );
};
