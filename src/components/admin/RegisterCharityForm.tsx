import React, { useState, useCallback } from "react";
import { useCharityRegistration } from "@/hooks/web3/useCharityRegistration";
import { Button } from "@/components/ui/Button";
import { useWeb3 } from "@/contexts/Web3Context";

/**
 * Admin form component for registering charities in the donation contract
 * @component RegisterCharityForm
 * @description Allows contract owner to register charity addresses so they can receive donations
 */
const TEST_CHARITY_ADDRESS = "0x537f232A75F59F3CAbeBf851E0810Fc95F42aa75";

/** Admin form for registering charity wallet addresses in the donation contract. */
export const RegisterCharityForm: React.FC = () => {
  const [charityAddress, setCharityAddress] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const { registerCharity, loading, error } = useCharityRegistration();
  const { isConnected, connect } = useWeb3();

  const handleCharityAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCharityAddress(e.target.value);
    },
    [],
  );

  const handleUseTestAddress = useCallback(() => {
    setCharityAddress(TEST_CHARITY_ADDRESS);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSuccessMessage("");

      if (!charityAddress.trim()) {
        return;
      }

      try {
        const txHash = await registerCharity(charityAddress.trim());
        setSuccessMessage(
          `Charity registered successfully! Transaction: ${txHash}`,
        );
        setCharityAddress("");
      } catch (_err) {
        // Error is already handled by the hook
      }
    },
    [charityAddress, registerCharity],
  );

  if (!isConnected) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">
          Register Charity
        </h2>
        <p className="mb-4 text-gray-600">
          Connect your wallet to register charities
        </p>
        <Button onClick={connect}>Connect Wallet</Button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-2xl">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Register Charity
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Register a charity address in the donation contract so it can receive
        donations. Only the contract owner can register charities.
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
            htmlFor="charity-address"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Charity Wallet Address
          </label>
          <input
            id="charity-address"
            type="text"
            value={charityAddress}
            onChange={handleCharityAddressChange}
            placeholder="0x..."
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all duration-200"
          />
          <p className="mt-2 text-sm text-gray-500">
            Enter the Ethereum address that will receive donations for this
            charity
          </p>
        </div>

        <Button
          type="submit"
          disabled={loading || !charityAddress.trim()}
          fullWidth
          size="lg"
        >
          {loading ? "Registering..." : "Register Charity"}
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
          {TEST_CHARITY_ADDRESS}
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
